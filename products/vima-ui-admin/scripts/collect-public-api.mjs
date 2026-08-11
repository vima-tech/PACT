import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const CATEGORY_BY_FILE = Object.freeze({
  'basic.ts': 'basic',
  'columnSetting.ts': 'data',
  'data.ts': 'data',
  'feedback.ts': 'feedback',
  'form.ts': 'form',
  'icons.ts': 'icon',
  'overlay.ts': 'overlay',
  'selection.ts': 'form',
  'VTemplateEditor.ts': 'template'
});

const TYPE_NAMES = Object.freeze({
  Array: 'array',
  Boolean: 'boolean',
  Date: 'Date',
  Function: 'function',
  Number: 'number',
  Object: 'object',
  String: 'string',
  null: 'any'
});

const EVENT_PAYLOADS = Object.freeze({
  blur: 'FocusEvent',
  clear: 'void',
  click: 'MouseEvent',
  close: 'void',
  closed: 'void',
  focus: 'FocusEvent',
  fullscreenchange: 'boolean',
  hide: 'void',
  input: 'string',
  open: 'void',
  opened: 'void',
  reset: 'void',
  show: 'void',
  submit: 'unknown',
  validate: 'boolean'
});

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function propertyName(node) {
  if (!node?.name) return '';
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  return node.name.getText().replace(/^['"]|['"]$/g, '');
}

function objectProperty(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  return object.properties.find((item) => propertyName(item) === name);
}

function propertyInitializer(object, name) {
  const property = objectProperty(object, name);
  return property && 'initializer' in property ? property.initializer : undefined;
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isSatisfiesExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

function sourceText(node, sourceFile) {
  return node ? node.getText(sourceFile).replace(/\s+/g, ' ').trim() : '';
}

function readableType(node, sourceFile) {
  if (!node) return { type: 'unknown', rawType: '', extractionStatus: 'unknown' };
  const rawType = sourceText(node, sourceFile);
  if (ts.isAsExpression(node)) {
    const typeText = node.type.getText(sourceFile);
    const propType = typeText.match(/^PropType<([\s\S]+)>$/);
    if (propType) {
      return { type: propType[1].replace(/\s+/g, ' '), rawType, extractionStatus: 'exact' };
    }
    const constructorType = typeText.match(/^\(\) => ([\s\S]+)$/);
    if (constructorType) {
      return { type: constructorType[1].replace(/\s+/g, ' '), rawType, extractionStatus: 'exact' };
    }
    node = node.expression;
  }
  const expression = unwrapExpression(node);
  if (ts.isIdentifier(expression)) {
    const type = TYPE_NAMES[expression.text];
    return type
      ? { type, rawType, extractionStatus: 'exact' }
      : { type: expression.text, rawType, extractionStatus: 'partial' };
  }
  if (ts.isArrayLiteralExpression(expression)) {
    const members = expression.elements.map((item) => {
      const value = unwrapExpression(item);
      return ts.isIdentifier(value) ? TYPE_NAMES[value.text] ?? value.text : sourceText(value, sourceFile);
    });
    return { type: members.join(' | '), rawType, extractionStatus: 'exact' };
  }
  return { type: 'unknown', rawType, extractionStatus: 'unknown' };
}

function literalValue(node, sourceFile) {
  if (!node) return undefined;
  const expression = unwrapExpression(node);
  if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression)) return expression.text;
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(expression) && expression.text === 'undefined') return undefined;
  return sourceText(node, sourceFile);
}

function cleanDoc(text) {
  return text
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .filter(Boolean);
}

function docsFor(node, sourceFile) {
  const prefix = sourceFile.text.slice(node.getFullStart(), node.getStart(sourceFile));
  const matches = [...prefix.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
  if (!matches.length) return { description: '', tags: {} };
  const lines = cleanDoc(matches.at(-1)[0]).flatMap((line) => line.split(/\s+(?=@\w)/));
  const tags = {};
  const description = [];
  for (const line of lines) {
    const tag = line.match(/^@(\w+)\s*(.*)$/);
    if (tag) {
      (tags[tag[1]] ||= []).push(tag[2].trim());
    } else {
      description.push(line);
    }
  }
  return { description: description.join(' '), tags };
}

function enumValues(type) {
  const values = [...type.matchAll(/'([^']+)'|"([^"]+)"/g)].map((match) => match[1] ?? match[2]);
  return values.length ? values : undefined;
}

function parseProps(componentObject, sourceFile) {
  const propsObject = unwrapExpression(propertyInitializer(componentObject, 'props'));
  if (!propsObject || !ts.isObjectLiteralExpression(propsObject)) return [];
  return propsObject.properties
    .filter((property) => ts.isPropertyAssignment(property))
    .map((property) => {
      const name = propertyName(property);
      const entry = unwrapExpression(property.initializer);
      const docs = docsFor(property, sourceFile);
      if (!entry || !ts.isObjectLiteralExpression(entry)) {
        return {
          name,
          type: 'unknown',
          rawType: sourceText(property.initializer, sourceFile),
          extractionStatus: 'unknown',
          required: false,
          description: docs.description
        };
      }
      const typeInfo = readableType(propertyInitializer(entry, 'type'), sourceFile);
      const defaultNode = propertyInitializer(entry, 'default');
      const required = literalValue(propertyInitializer(entry, 'required'), sourceFile) === true;
      return {
        name,
        ...typeInfo,
        required,
        ...(defaultNode ? { default: literalValue(defaultNode, sourceFile) } : {}),
        description: docs.description,
        ...(enumValues(typeInfo.type) ? { enum: enumValues(typeInfo.type) } : {})
      };
    });
}

function parseEventDocs(values = []) {
  return Object.fromEntries(values.map((value) => {
    const [name, payload = 'unknown', description = ''] = value.split('::').map((item) => item.trim());
    return [name, { payload, description }];
  }));
}

function parsePropDocs(values = []) {
  return Object.fromEntries(values.flatMap((value) => value.split(';')).map((item) => {
    const separator = item.indexOf('::');
    return separator < 1 ? [] : [item.slice(0, separator).trim(), item.slice(separator + 2).trim()];
  }).filter((item) => item.length));
}

function parseEmits(componentObject, sourceFile, props, documentedEvents = []) {
  const emits = unwrapExpression(propertyInitializer(componentObject, 'emits'));
  if (!emits) return [];
  const names = ts.isArrayLiteralExpression(emits)
    ? emits.elements.map((item) => literalValue(item, sourceFile)).filter((item) => typeof item === 'string')
    : ts.isObjectLiteralExpression(emits)
      ? emits.properties.map(propertyName).filter(Boolean)
      : [];
  const modelType = props.find((prop) => prop.name === 'modelValue')?.type;
  const eventDocs = parseEventDocs(documentedEvents);
  return names.map((name) => {
    const inferredPayload = name === 'update:modelValue' || name === 'change'
      ? modelType ?? 'unknown'
      : EVENT_PAYLOADS[name] ?? 'unknown';
    const payload = eventDocs[name]?.payload ?? inferredPayload;
    return {
      name,
      payload,
      extractionStatus: eventDocs[name] ? 'exact' : payload === 'unknown' ? 'unknown' : 'partial',
      description: eventDocs[name]?.description ?? ''
    };
  });
}

function parseSlots(componentObject, sourceFile) {
  const source = sourceText(componentObject, sourceFile);
  return [...new Set([...source.matchAll(/slots\.(\w+)/g)].map((match) => match[1]))]
    .filter((name) => name !== 'value')
    .sort()
    .map((name) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const calls = [...source.matchAll(new RegExp(`slots\\.${escapedName}(?:\\?\\.)?\\(([^)\\n]*)\\)`, 'g'))];
      const argument = calls.map((match) => match[1].trim()).find(Boolean);
      return {
        name,
        props: argument || 'void',
        extractionStatus: argument ? 'partial' : 'exact',
        description: ''
      };
    });
}

function findComponentsArray(sourceFile) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (propertyName(declaration) !== 'components') continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (!initializer || !ts.isArrayLiteralExpression(initializer)) continue;
      return initializer.elements.map((item) => sourceText(item, sourceFile));
    }
  }
  return [];
}

function findTemplateMap(root) {
  const file = join(root, 'src', 'template', 'contracts.ts');
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result = {};
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (propertyName(declaration) !== 'TEMPLATE_COMPONENT_NAMES') continue;
      const object = unwrapExpression(declaration.initializer);
      if (!object || !ts.isObjectLiteralExpression(object)) continue;
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        result[propertyName(property)] = literalValue(property.initializer, sourceFile);
      }
    }
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function findComponentDeclaration(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (propertyName(declaration) !== name) continue;
      const call = unwrapExpression(declaration.initializer);
      if (!call || !ts.isCallExpression(call)) continue;
      const object = unwrapExpression(call.arguments[0]);
      if (object && ts.isObjectLiteralExpression(object)) return { declaration, object };
    }
  }
  return undefined;
}

function componentImports(indexFile) {
  const imports = new Map();
  for (const statement of indexFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
    if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;
    const specifier = statement.moduleSpecifier.text;
    for (const element of statement.importClause.namedBindings.elements) {
      imports.set(element.name.text, specifier);
    }
  }
  return imports;
}

function resolveTsModule(root, fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      continue;
    }
  }
  return '';
}

function parseIcons(root) {
  const file = join(root, 'src', 'components', 'icons.ts');
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const registries = {};
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const name = propertyName(declaration);
      if (name !== 'icons' && name !== 'aliases') continue;
      const object = unwrapExpression(declaration.initializer);
      if (!object || !ts.isObjectLiteralExpression(object)) continue;
      registries[name] = Object.fromEntries(object.properties
        .filter((property) => ts.isPropertyAssignment(property))
        .map((property) => [propertyName(property), literalValue(property.initializer, sourceFile)]));
    }
  }
  const aliasesByTarget = {};
  for (const [alias, target] of Object.entries(registries.aliases ?? {})) {
    (aliasesByTarget[target] ||= []).push(alias);
  }
  return Object.keys(registries.icons ?? {}).sort().map((name) => ({
    name,
    aliases: (aliasesByTarget[name] ?? []).sort(),
    category: 'general',
    component: 'VIcon'
  }));
}

function publicServices(indexSource) {
  const names = ['layer', 'message', 'messageBox', 'getIconNames', 'hasIcon', 'iconSvgMarkup', 'normalizeIconName', 'registerIcon'];
  return names.filter((name) => new RegExp(`\\b${name}\\b`).test(indexSource)).map((name) => ({ name }));
}

function templateContractDiagnostics(root, templateComponents, publicComponentNames) {
  const diagnostics = [];
  const typesPath = join(root, 'src', 'template', 'types.ts');
  const typesSource = readFileSync(typesPath, 'utf8');
  const typesFile = ts.createSourceFile(typesPath, typesSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let componentTypes = [];
  for (const statement of typesFile.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || statement.name.text !== 'ComponentType') continue;
    const members = ts.isUnionTypeNode(statement.type) ? statement.type.types : [statement.type];
    componentTypes = members
      .filter((member) => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal))
      .map((member) => member.literal.text);
  }

  const editorPath = join(root, 'src', 'template', 'editor.ts');
  const editorSource = readFileSync(editorPath, 'utf8');
  const editorFile = ts.createSourceFile(editorPath, editorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let editorTypes = [];
  for (const statement of editorFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (propertyName(declaration) !== 'COMPONENT_PROPS_CONFIG') continue;
      const object = unwrapExpression(declaration.initializer);
      if (object && ts.isObjectLiteralExpression(object)) editorTypes = object.properties.map(propertyName).filter(Boolean);
    }
  }

  for (const type of componentTypes) {
    if (!Object.hasOwn(templateComponents, type)) {
      diagnostics.push({ code: 'TEMPLATE_COMPONENT_NOT_REGISTERED', severity: 'error', templateType: type });
    }
    if (!editorTypes.includes(type)) {
      diagnostics.push({ code: 'EDITOR_COMPONENT_CONFIG_MISSING', severity: 'error', templateType: type });
    }
  }
  for (const [type, component] of Object.entries(templateComponents)) {
    if (!componentTypes.includes(type)) {
      diagnostics.push({ code: 'TEMPLATE_COMPONENT_TYPE_MISSING', severity: 'error', templateType: type });
    }
    if (component !== '$intrinsic' && !publicComponentNames.has(component)) {
      diagnostics.push({ code: 'TEMPLATE_TARGET_NOT_PUBLIC', severity: 'error', templateType: type, component });
    }
  }
  return diagnostics;
}

export function collectPublicApi({ root = process.cwd() } = {}) {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const indexPath = join(root, 'src', 'index.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  const indexFile = ts.createSourceFile(indexPath, indexSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = findComponentsArray(indexFile);
  const imports = componentImports(indexFile);
  const diagnostics = [];
  const sourceCache = new Map();
  const sourcePaths = walk(join(root, 'src')).filter((file) => file.endsWith('.ts'));
  const components = [];

  function readSourceFile(sourcePath) {
    let sourceFile = sourceCache.get(sourcePath);
    if (!sourceFile) {
      const text = readFileSync(sourcePath, 'utf8');
      sourceFile = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      sourceCache.set(sourcePath, sourceFile);
    }
    return sourceFile;
  }

  for (const name of names) {
    const specifier = imports.get(name);
    let sourcePath = specifier ? resolveTsModule(root, indexPath, specifier) : '';
    if (!sourcePath) {
      diagnostics.push({ code: 'COMPONENT_SOURCE_NOT_FOUND', severity: 'error', component: name });
      continue;
    }
    let sourceFile = readSourceFile(sourcePath);
    let found = findComponentDeclaration(sourceFile, name);
    if (!found) {
      for (const candidate of sourcePaths) {
        const candidateSource = readSourceFile(candidate);
        const candidateDeclaration = findComponentDeclaration(candidateSource, name);
        if (!candidateDeclaration) continue;
        sourcePath = candidate;
        sourceFile = candidateSource;
        found = candidateDeclaration;
        break;
      }
    }
    if (!found) {
      diagnostics.push({ code: 'COMPONENT_DECLARATION_NOT_FOUND', severity: 'error', component: name });
      continue;
    }
    const docs = docsFor(found.declaration.parent.parent, sourceFile);
    const propDocs = parsePropDocs(docs.tags.props);
    const props = parseProps(found.object, sourceFile).map((prop) => ({
      ...prop,
      description: prop.description || propDocs[prop.name] || ''
    }));
    const fileName = sourcePath.split('/').at(-1);
    const description = docs.description || `${name} 组件`;
    const category = docs.tags.category?.[0] || CATEGORY_BY_FILE[fileName] || 'other';
    components.push({
      name,
      category,
      description,
      descriptionSource: docs.description ? 'source' : 'generated',
      source: relative(root, sourcePath),
      useWhen: docs.tags.useWhen ?? [],
      avoidWhen: docs.tags.avoidWhen ?? [],
      props,
      events: parseEmits(found.object, sourceFile, props, docs.tags.event),
      slots: parseSlots(found.object, sourceFile),
      constraints: docs.tags.constraint ?? [],
      related: (docs.tags.related ?? []).flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean)),
      recipes: docs.tags.recipe ?? []
    });
  }

  const templateComponents = findTemplateMap(root);
  diagnostics.push(...templateContractDiagnostics(root, templateComponents, new Set(components.map((item) => item.name))));
  const manifest = {
    manifestVersion: '1.0.0',
    package: packageJson.name,
    version: packageJson.version,
    components,
    templateComponents,
    icons: parseIcons(root),
    services: publicServices(indexSource)
  };
  return { manifest, diagnostics };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestCoverage(manifest) {
  const props = manifest.components.flatMap((component) => component.props);
  const events = manifest.components.flatMap((component) => component.events);
  const slots = manifest.components.flatMap((component) => component.slots);
  return {
    components: manifest.components.length,
    componentDescriptions: manifest.components.filter((component) => component.descriptionSource === 'source').length,
    props: props.length,
    propDescriptions: props.filter((prop) => prop.description).length,
    events: events.length,
    eventPayloads: events.filter((event) => event.payload !== 'unknown').length,
    slots: slots.length,
    slotProps: slots.filter((slot) => slot.props !== 'unknown').length
  };
}
