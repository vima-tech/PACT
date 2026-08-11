import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const banned = [
  'inferFromLabel',
  'inferComponentType',
  'useFormState',
  'useUIDebug',
  'useUIPerf',
  'inferComponent(',
  'getComponentSchema',
  'validatePropCombination'
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function exportedNames(entry, visited = new Set()) {
  if (visited.has(entry)) return new Set();
  visited.add(entry);
  const source = readFileSync(entry, 'utf8');
  const sourceFile = ts.createSourceFile(entry, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = new Set();
  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const exported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (exported && 'name' in statement && statement.name && ts.isIdentifier(statement.name)) names.add(statement.name.text);
    if (exported && ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      });
    }
    if (!ts.isExportDeclaration(statement)) continue;
    if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      statement.exportClause.elements.forEach((element) => names.add(element.name.text));
    }
    if (!statement.moduleSpecifier || statement.exportClause) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith('.')) continue;
    const base = resolve(dirname(entry), specifier);
    const candidates = [`${base}.ts`, join(base, 'index.ts')];
    const target = candidates.find((candidate) => {
      try { return statSync(candidate).isFile(); } catch { return false; }
    });
    if (target) exportedNames(target, visited).forEach((name) => names.add(name));
  }
  return names;
}

const rootExports = exportedNames(join(root, 'src', 'index.ts'));
const agentExports = exportedNames(join(root, 'src', 'agent', 'index.ts'));
const markdownFiles = [join(root, 'README.md'), ...walk(join(root, 'docs')).filter((file) => file.endsWith('.md'))];

for (const file of markdownFiles) {
  const source = readFileSync(file, 'utf8');
  for (const name of banned) {
    if (source.includes(name)) problems.push(`${file.slice(root.length + 1)}: 包含不存在或已禁止的接口 ${name}`);
  }
  const blocks = [...source.matchAll(/```(json|ts|typescript|vue)\n([\s\S]*?)\n```/g)];
  blocks.forEach((match, index) => {
    const language = match[1];
    let code = match[2];
    if (language === 'json') {
      try { JSON.parse(code); } catch (error) {
        problems.push(`${file.slice(root.length + 1)}: JSON 代码块 ${index + 1} 无法解析：${error.message}`);
      }
      return;
    }
    if (language === 'vue') {
      const script = code.match(/<script(?: setup)?(?: lang="ts")?>([\s\S]*?)<\/script>/);
      if (!script) return;
      code = script[1];
    }
    const sourceFile = ts.createSourceFile(`${file}.${index}.ts`, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    sourceFile.parseDiagnostics.forEach((diagnostic) => {
      problems.push(`${file.slice(root.length + 1)}: 代码块 ${index + 1} 语法错误：${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    });
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
      if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (specifier !== '@vima-tech/ui-admin' && specifier !== '@vima-tech/ui-admin/agent') continue;
      const allowed = specifier.endsWith('/agent') ? agentExports : rootExports;
      statement.importClause.namedBindings.elements.forEach((element) => {
        const imported = element.propertyName?.text || element.name.text;
        if (!allowed.has(imported)) {
          problems.push(`${file.slice(root.length + 1)}: 代码块 ${index + 1} 引用了不存在的 ${specifier} 导出 ${imported}`);
        }
      });
    }
  });
}

if (problems.length) {
  console.error(`文档检查失败（${problems.length} 项）：`);
  problems.forEach((problem) => console.error(`  ERROR ${problem}`));
  process.exit(1);
}

console.log(`文档检查通过：${markdownFiles.length} 个 Markdown 文件，公开导入与代码块语法有效。`);

