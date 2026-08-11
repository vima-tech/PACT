import { hasIcon } from '../components/icons';
import { isSafeDataKey } from '../template/safe-path';
import type { UIDiagnostic } from '../template/types';
import appSpecSchema from './schema/app-spec.v1.json';
import type { AppSpec, PageSpec } from './types';

interface JsonSchema {
  $ref?: string;
  oneOf?: JsonSchema[];
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  minItems?: number;
  minLength?: number;
  pattern?: string;
  $defs?: Record<string, JsonSchema>;
}

export interface SpecValidationResult<T> {
  valid: boolean;
  value?: T;
  diagnostics: UIDiagnostic[];
}

function error(code: string, path: string, message: string, suggestion?: string): UIDiagnostic {
  return { code, severity: 'error', path, message, suggestion };
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function resolveRef(schema: JsonSchema, root: JsonSchema): JsonSchema {
  if (!schema.$ref) return schema;
  const segments = schema.$ref.replace(/^#\//, '').split('/');
  let current: unknown = root;
  for (const segment of segments) {
    current = (current as Record<string, unknown>)?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return current as JsonSchema;
}

function validateSchema(
  value: unknown,
  schemaInput: JsonSchema,
  root: JsonSchema,
  path: string,
  diagnostics: UIDiagnostic[]
): void {
  const schema = resolveRef(schemaInput, root);
  if (schema.oneOf) {
    const attempts = schema.oneOf.map((candidate) => {
      const candidateDiagnostics: UIDiagnostic[] = [];
      validateSchema(value, candidate, root, path, candidateDiagnostics);
      return candidateDiagnostics;
    });
    const validAttempts = attempts.filter((candidate) => candidate.length === 0);
    if (validAttempts.length === 1) return;
    if (validAttempts.length > 1) {
      diagnostics.push(error('APP_SPEC_VARIANT_AMBIGUOUS', path, '值同时符合多个互斥规格分支。', '提供明确的 type 字段。'));
      return;
    }
    const closest = attempts.reduce((best, candidate) => candidate.length < best.length ? candidate : best, attempts[0]);
    diagnostics.push(...closest);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) {
    diagnostics.push(error('APP_SPEC_CONST_MISMATCH', path, `必须为 ${JSON.stringify(schema.const)}。`));
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    diagnostics.push(error('APP_SPEC_ENUM_MISMATCH', path, `可用值：${schema.enum.join(', ')}。`));
    return;
  }
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = valueType(value);
    if (!allowed.includes(actual)) {
      diagnostics.push(error('APP_SPEC_TYPE_MISMATCH', path, `期望 ${allowed.join(' | ')}，实际为 ${actual}。`));
      return;
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      diagnostics.push(error('APP_SPEC_STRING_TOO_SHORT', path, '字符串不能为空。'));
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      diagnostics.push(error('APP_SPEC_PATTERN_MISMATCH', path, `字符串不符合 ${schema.pattern}。`));
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      diagnostics.push(error('APP_SPEC_ARRAY_TOO_SHORT', path, `至少需要 ${schema.minItems} 项。`));
    }
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items!, root, `${path}[${index}]`, diagnostics));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!(required in record)) diagnostics.push(error('APP_SPEC_REQUIRED', path ? `${path}.${required}` : required, `缺少必填字段 ${required}。`));
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(record)) {
        if (!(key in schema.properties)) diagnostics.push(error('APP_SPEC_UNKNOWN_PROPERTY', path ? `${path}.${key}` : key, `不允许字段 ${key}。`));
      }
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (key in record) validateSchema(record[key], propertySchema, root, path ? `${path}.${key}` : key, diagnostics);
    }
  }
}

function semanticDiagnostics(spec: AppSpec): UIDiagnostic[] {
  const diagnostics: UIDiagnostic[] = [];
  const pageIds = new Set<string>();
  const outputNames = new Set<string>();
  spec.pages.forEach((page, index) => {
    if (pageIds.has(page.id)) diagnostics.push(error('DUPLICATE_PAGE_ID', `pages[${index}].id`, `页面 ID ${page.id} 重复。`));
    pageIds.add(page.id);
    const outputName = page.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (outputNames.has(outputName)) diagnostics.push(error('OUTPUT_PATH_COLLISION', `pages[${index}].id`, `页面 ${page.id} 会产生重复文件路径。`));
    outputNames.add(outputName);
    pageSemanticDiagnostics(page).forEach((item) => diagnostics.push({
      ...item,
      path: item.path ? `pages[${index}].${item.path}` : `pages[${index}]`
    }));
  });
  const routePaths = new Set<string>();
  spec.routes.forEach((route, index) => {
    if (routePaths.has(route.path)) diagnostics.push(error('DUPLICATE_ROUTE_PATH', `routes[${index}].path`, `路由 ${route.path} 重复。`));
    routePaths.add(route.path);
    if (!pageIds.has(route.pageId)) diagnostics.push(error('UNKNOWN_ROUTE_PAGE', `routes[${index}].pageId`, `路由引用了不存在的页面 ${route.pageId}。`));
  });
  spec.shell.navigation.forEach((item, index) => {
    if (!routePaths.has(item.route)) diagnostics.push(error('UNKNOWN_NAVIGATION_ROUTE', `shell.navigation[${index}].route`, `导航引用了不存在的路由 ${item.route}。`));
    if (!hasIcon(item.icon)) diagnostics.push(error('UNKNOWN_ICON', `shell.navigation[${index}].icon`, `SVG 图标 ${item.icon} 未注册。`, '从 AI Manifest icons 中选择名称。'));
  });
  return diagnostics;
}

function pageSemanticDiagnostics(page: PageSpec): UIDiagnostic[] {
  const diagnostics: UIDiagnostic[] = [];
  if ('fields' in page && page.fields.length === 0) {
    diagnostics.push(error('MISSING_PAGE_FIELDS', 'fields', '页面至少需要一个字段。'));
  }
  if ('fields' in page) {
    const fieldKeys = new Set<string>();
    page.fields.forEach((field, index) => {
      if (!isSafeDataKey(field.key)) {
        diagnostics.push(error('UNSAFE_FIELD_KEY', `fields[${index}].key`, `字段 key "${field.key}" 是 JavaScript 保留名。`));
      }
      if (fieldKeys.has(field.key)) {
        diagnostics.push(error('DUPLICATE_FIELD_KEY', `fields[${index}].key`, `字段 key "${field.key}" 重复。`));
      }
      fieldKeys.add(field.key);
      if (field.format === 'enum' && !field.options?.length) {
        diagnostics.push(error('MISSING_FIELD_OPTIONS', `fields[${index}].options`, '枚举字段必须提供 options。'));
      }
      field.validation?.forEach((rule, ruleIndex) => {
        if (rule.kind !== 'required' && rule.value === undefined) {
          diagnostics.push(error('MISSING_VALIDATION_VALUE', `fields[${index}].validation[${ruleIndex}].value`, `${rule.kind} 校验必须提供 value。`));
        }
        if (rule.kind === 'pattern' && rule.value !== undefined) {
          try {
            if (typeof rule.value !== 'string') throw new Error();
            new RegExp(rule.value);
          } catch {
            diagnostics.push(error('INVALID_VALIDATION_PATTERN', `fields[${index}].validation[${ruleIndex}].value`, 'pattern 必须是有效的正则表达式字符串。'));
          }
        }
        if ((rule.kind === 'min' || rule.kind === 'max') && (typeof rule.value !== 'number' || !Number.isFinite(rule.value))) {
          diagnostics.push(error('INVALID_VALIDATION_LIMIT', `fields[${index}].validation[${ruleIndex}].value`, `${rule.kind} 必须是有限数值。`));
        }
      });
    });
  }
  if (page.type === 'crud') {
    page.actions?.forEach((action, index) => {
      if (action.icon && !hasIcon(action.icon)) {
        diagnostics.push(error('UNKNOWN_ICON', `actions[${index}].icon`, `SVG 图标 ${action.icon} 未注册。`, '从 AI Manifest icons 中选择名称。'));
      }
    });
  }
  return diagnostics;
}

export function validateAppSpec(input: unknown): SpecValidationResult<AppSpec> {
  const diagnostics: UIDiagnostic[] = [];
  validateSchema(input, appSpecSchema as JsonSchema, appSpecSchema as JsonSchema, '', diagnostics);
  if (diagnostics.length) return { valid: false, diagnostics };
  diagnostics.push(...semanticDiagnostics(input as AppSpec));
  return diagnostics.length
    ? { valid: false, diagnostics }
    : { valid: true, value: input as AppSpec, diagnostics: [] };
}

export function validatePageSpec(input: unknown): SpecValidationResult<PageSpec> {
  const root = appSpecSchema as JsonSchema;
  const diagnostics: UIDiagnostic[] = [];
  validateSchema(input, { $ref: '#/$defs/page' }, root, '', diagnostics);
  if (!diagnostics.length) diagnostics.push(...pageSemanticDiagnostics(input as PageSpec));
  return diagnostics.length
    ? { valid: false, diagnostics }
    : { valid: true, value: input as PageSpec, diagnostics: [] };
}
