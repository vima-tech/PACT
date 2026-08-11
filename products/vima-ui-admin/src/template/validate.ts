import { getTemplateComponentContracts, TEMPLATE_COMPONENT_NAMES, TEMPLATE_COMPONENT_TYPES } from './contracts';
import { isSafeDataIdentifier, isSafeDataKey, isSafeDataPath } from './safe-path';
import type { EventHandler, Expression, Template, TemplateNode, UIDiagnostic } from './types';

export type TemplateTrustLevel = 'untrusted' | 'trusted';

export interface TemplateComponentContract {
  props?: readonly string[];
  propTypes?: Readonly<Record<string, { types: readonly string[]; required?: boolean }>>;
  events?: readonly string[];
  slots?: readonly string[];
}

export interface TemplateValidationOptions {
  trustLevel?: TemplateTrustLevel;
  componentContracts?: Partial<Record<string, TemplateComponentContract>>;
  allowedApiOrigins?: readonly string[];
}

export interface TemplateValidationResult {
  valid: boolean;
  diagnostics: UIDiagnostic[];
}

const TEMPLATE_TYPES = new Set<string>(TEMPLATE_COMPONENT_TYPES);
const EVENT_TYPES = ['click', 'change', 'submit', 'focus', 'blur', 'input', 'custom'] as const;
const EVENT_ACTIONS = ['setValue', 'getData', 'submit', 'validate', 'reset', 'navigate', 'showModal', 'closeModal', 'custom'] as const;
const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
const REQUIRED_PARENT: Partial<Record<string, readonly string[]>> = {
  'descriptions-item': ['descriptions'],
  col: ['row'],
  'form-item': ['form']
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isExpression(value: unknown): value is Expression {
  return isRecord(value) && value.__expression === true && typeof value.expr === 'string';
}

function literalType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value === null) return 'null';
  return typeof value;
}

function push(
  diagnostics: UIDiagnostic[],
  code: string,
  path: string,
  message: string,
  suggestion?: string,
  component?: string
) {
  diagnostics.push({ code, severity: 'error', path, component, message, suggestion });
}

function checkExpression(
  value: unknown,
  path: string,
  trustLevel: TemplateTrustLevel,
  diagnostics: UIDiagnostic[]
) {
  if (isExpression(value)) {
    if (trustLevel === 'untrusted' && !isSafeDataPath(value.expr)) {
      push(
        diagnostics,
        'UNSAFE_EXPRESSION',
        `${path}.expr`,
        '不可信模板仅允许安全数据路径。',
        '先计算值，再从 context 读取。'
      );
    }
    return;
  }
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const expression = value.slice(2, -2).trim();
    if (trustLevel === 'untrusted' && !isSafeDataPath(expression)) {
      push(
        diagnostics,
        'UNSAFE_EXPRESSION',
        path,
        '不可信模板仅允许安全数据路径。',
        '使用 {{ formData.field }}。'
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkExpression(item, `${path}[${index}]`, trustLevel, diagnostics));
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => checkExpression(item, `${path}.${key}`, trustLevel, diagnostics));
  }
}

function checkEvent(
  event: EventHandler,
  path: string,
  trustLevel: TemplateTrustLevel,
  diagnostics: UIDiagnostic[]
) {
  if (!EVENT_TYPES.includes(event.type)) {
    push(diagnostics, 'UNKNOWN_EVENT_TYPE', `${path}.type`, `未知事件类型 "${String(event.type)}"。`, `可用：${EVENT_TYPES.join(', ')}`);
  }
  if (!EVENT_ACTIONS.includes(event.action)) {
    push(diagnostics, 'UNKNOWN_EVENT_ACTION', `${path}.action`, `未知事件动作 "${String(event.action)}"。`, `可用：${EVENT_ACTIONS.join(', ')}`);
  }
  if (event.params) checkExpression(event.params, `${path}.params`, trustLevel, diagnostics);
  if (['setValue', 'showModal', 'closeModal'].includes(event.action) && typeof event.params?.field === 'string' && !isSafeDataKey(event.params.field)) {
    push(diagnostics, 'UNSAFE_DATA_KEY', `${path}.params.field`, '事件字段名不安全。');
  }
  if (trustLevel === 'untrusted' && (event.action === 'custom' || event.handler)) {
    push(
      diagnostics,
      'UNSAFE_CUSTOM_HANDLER',
      path,
      '不可信模板禁止自定义函数。',
      '改用白名单动作。'
    );
  }
  if (trustLevel === 'untrusted' && event.action === 'navigate') {
    const url = typeof event.params?.url === 'string' ? event.params.url : '';
    if (url && !url.startsWith('/') && !url.startsWith('#')) {
      push(
        diagnostics,
        'UNSAFE_NAVIGATION',
        `${path}.params.url`,
        '仅允许站内路径或锚点。',
        '地址须以 / 或 # 开头。'
      );
    }
  }
}

function validateNode(
  node: unknown,
  path: string,
  options: Required<Pick<TemplateValidationOptions, 'trustLevel'>> & TemplateValidationOptions,
  diagnostics: UIDiagnostic[],
  ids: Set<string>,
  parentType?: string
) {
  if (!isRecord(node)) {
    push(diagnostics, 'INVALID_TEMPLATE_NODE', path, '节点须为对象。');
    return;
  }
  const id = node.id;
  if (typeof id !== 'string' || !id.trim()) {
    push(diagnostics, 'MISSING_NODE_ID', `${path}.id`, '节点缺少 id。');
  } else if (ids.has(id)) {
    push(diagnostics, 'DUPLICATE_NODE_ID', `${path}.id`, `节点 id "${id}" 重复。`);
  } else {
    ids.add(id);
  }

  const type = node.type;
  if (typeof type !== 'string' || !TEMPLATE_TYPES.has(type)) {
    push(
      diagnostics,
      'UNKNOWN_TEMPLATE_COMPONENT',
      `${path}.type`,
      `模板组件类型 "${String(type)}" 不存在。`,
      `可用类型：${TEMPLATE_COMPONENT_TYPES.join(', ')}`
    );
  }
  if (typeof type === 'string' && REQUIRED_PARENT[type] && (!parentType || !REQUIRED_PARENT[type]!.includes(parentType))) {
    push(
      diagnostics,
      'INVALID_COMPONENT_PARENT',
      path,
      `${type} 的父级必须是 ${REQUIRED_PARENT[type]!.join(', ')}，当前为 ${parentType || '根节点'}。`,
      undefined,
      typeof type === 'string' ? TEMPLATE_COMPONENT_NAMES[type as keyof typeof TEMPLATE_COMPONENT_NAMES] : undefined
    );
  }

  if (node.props !== undefined && !isRecord(node.props)) {
    push(diagnostics, 'INVALID_NODE_PROPS', `${path}.props`, 'props 须为对象。');
  } else if (isRecord(node.props)) {
    checkExpression(node.props, `${path}.props`, options.trustLevel, diagnostics);
    const publicName = typeof type === 'string' ? TEMPLATE_COMPONENT_NAMES[type as keyof typeof TEMPLATE_COMPONENT_NAMES] : undefined;
    const contract = publicName && publicName !== '$intrinsic' ? options.componentContracts?.[publicName] : undefined;
    if (contract?.props) {
      for (const prop of Object.keys(node.props)) {
        if (prop === 'content' || prop === 'text') continue;
        if (contract.props.includes(prop)) continue;
        push(
          diagnostics,
          'UNKNOWN_PROP',
          `${path}.props.${prop}`,
          `${publicName} 不公开属性 "${prop}"。`,
          `可用属性：${contract.props.join(', ')}`,
          publicName
        );
        continue;
      }
      for (const [prop, definition] of Object.entries(contract.propTypes ?? {})) {
        if (definition.required && !(prop in node.props)) {
          push(diagnostics, 'MISSING_REQUIRED_PROP', `${path}.props.${prop}`, `${publicName} 缺少必填属性 "${prop}"。`, undefined, publicName);
          continue;
        }
        const value = node.props[prop];
        if (value === undefined || value === null || isExpression(value) || (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}'))) continue;
        const actual = literalType(value);
        if (definition.types.length && !definition.types.includes(actual)) {
          push(diagnostics, 'PROP_TYPE_MISMATCH', `${path}.props.${prop}`, `${publicName}.${prop} 期望 ${definition.types.join(' | ')}，实际为 ${actual}。`, undefined, publicName);
        }
      }
    }
    if (type === 'form-item' && typeof node.props.field === 'string' && !isSafeDataKey(node.props.field)) {
      push(diagnostics, 'UNSAFE_DATA_KEY', `${path}.props.field`, '表单字段名不安全。');
    }
  }

  if (node.condition !== undefined) checkExpression(node.condition, `${path}.condition`, options.trustLevel, diagnostics);
  if (isRecord(node.loop)) checkExpression(node.loop.data, `${path}.loop.data`, options.trustLevel, diagnostics);

  if (node.events !== undefined && !isRecord(node.events)) {
    push(diagnostics, 'INVALID_NODE_EVENTS', `${path}.events`, 'events 须为对象。');
  } else if (isRecord(node.events)) {
    const publicName = typeof type === 'string' ? TEMPLATE_COMPONENT_NAMES[type as keyof typeof TEMPLATE_COMPONENT_NAMES] : undefined;
    const contract = publicName && publicName !== '$intrinsic' ? options.componentContracts?.[publicName] : undefined;
    for (const [name, event] of Object.entries(node.events)) {
      if (contract?.events && !contract.events.includes(name)) {
        push(diagnostics, 'UNKNOWN_EVENT', `${path}.events.${name}`, `${publicName} 不公开事件 "${name}"。`, `可用事件：${contract.events.join(', ')}`, publicName);
      }
      if (!isRecord(event)) {
        push(diagnostics, 'INVALID_EVENT_HANDLER', `${path}.events.${name}`, '事件定义须为对象。');
        continue;
      }
      checkEvent(event as unknown as EventHandler, `${path}.events.${name}`, options.trustLevel, diagnostics);
    }
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child, index) => validateNode(child, `${path}.children[${index}]`, options, diagnostics, ids, typeof type === 'string' ? type : undefined));
  } else if (node.children !== undefined) {
    push(diagnostics, 'INVALID_NODE_CHILDREN', `${path}.children`, 'children 须为数组。');
  }

  if (node.slots !== undefined && !isRecord(node.slots)) {
    push(diagnostics, 'INVALID_NODE_SLOTS', `${path}.slots`, 'slots 须为对象。');
  } else if (isRecord(node.slots)) {
    const publicName = typeof type === 'string' ? TEMPLATE_COMPONENT_NAMES[type as keyof typeof TEMPLATE_COMPONENT_NAMES] : undefined;
    const contract = publicName && publicName !== '$intrinsic' ? options.componentContracts?.[publicName] : undefined;
    for (const [slotName, children] of Object.entries(node.slots)) {
      if (contract?.slots && !contract.slots.includes(slotName)) {
        push(diagnostics, 'UNKNOWN_SLOT', `${path}.slots.${slotName}`, `${publicName} 不公开插槽 "${slotName}"。`, `可用插槽：${contract.slots.join(', ')}`, publicName);
      }
      if (!Array.isArray(children)) {
        push(diagnostics, 'INVALID_SLOT_CHILDREN', `${path}.slots.${slotName}`, '插槽内容须为数组。');
        continue;
      }
      children.forEach((child, index) => validateNode(child, `${path}.slots.${slotName}[${index}]`, options, diagnostics, ids, typeof type === 'string' ? type : undefined));
    }
  }
}

export function validateTemplate(
  template: unknown,
  options: TemplateValidationOptions = {}
): TemplateValidationResult {
  const diagnostics: UIDiagnostic[] = [];
  const normalizedOptions = {
    ...options,
    trustLevel: options.trustLevel ?? 'untrusted',
    componentContracts: options.componentContracts ?? getTemplateComponentContracts()
  };
  if (!isRecord(template)) {
    push(diagnostics, 'INVALID_TEMPLATE', '', '模板须为对象。');
    return { valid: false, diagnostics };
  }
  for (const field of ['id', 'name', 'type', 'version']) {
    if (typeof template[field] !== 'string' || !(template[field] as string).trim()) {
      push(diagnostics, 'MISSING_TEMPLATE_FIELD', field, `模板缺少非空字段 ${field}。`);
    }
  }
  validateNode(template.root, 'root', normalizedOptions, diagnostics, new Set());

  if (normalizedOptions.trustLevel === 'untrusted') {
    if (Array.isArray(template.scripts) && template.scripts.length) {
      push(diagnostics, 'UNSAFE_TEMPLATE_SCRIPT', 'scripts', '不可信模板禁止脚本。');
    }
    if (isRecord(template.styleConfig) && typeof template.styleConfig.customCSS === 'string' && template.styleConfig.customCSS.trim()) {
      push(diagnostics, 'UNSAFE_CUSTOM_CSS', 'styleConfig.customCSS', '不可信模板禁止自定义 CSS。');
    }
  }

  if (Array.isArray(template.dataSources)) {
    const dataSourceIds = new Set<string>();
    template.dataSources.forEach((source, index) => {
      if (!isRecord(source)) {
        push(diagnostics, 'INVALID_DATA_SOURCE', `dataSources[${index}]`, '数据源须为对象。');
        return;
      }
      const sourcePath = `dataSources[${index}]`;
      if (typeof source.id !== 'string' || !isSafeDataIdentifier(source.id)) {
        push(diagnostics, 'UNSAFE_DATA_SOURCE_ID', `${sourcePath}.id`, '数据源 ID 不安全。');
      } else if (dataSourceIds.has(source.id)) {
        push(diagnostics, 'DUPLICATE_DATA_SOURCE_ID', `${sourcePath}.id`, `数据源 ID "${source.id}" 重复。`);
      } else {
        dataSourceIds.add(source.id);
      }
      if (typeof source.name !== 'string' || !source.name.trim()) {
        push(diagnostics, 'MISSING_DATA_SOURCE_NAME', `${sourcePath}.name`, '数据源名称为空。');
      }
      if (!['static', 'api', 'function'].includes(String(source.type))) {
        push(diagnostics, 'UNKNOWN_DATA_SOURCE_TYPE', `${sourcePath}.type`, `未知数据源类型 ${String(source.type)}。`);
      }
      if (source.type === 'api' && (!isRecord(source.api) || typeof source.api.url !== 'string' || !source.api.url.trim())) {
        push(diagnostics, 'INVALID_API_DATA_SOURCE', `${sourcePath}.api`, 'API 数据源缺少 url。');
      }
      if (source.type === 'api' && isRecord(source.api) && !API_METHODS.includes(String(source.api.method ?? 'GET') as typeof API_METHODS[number])) {
        push(diagnostics, 'UNKNOWN_API_METHOD', `${sourcePath}.api.method`, `不支持请求方法 ${String(source.api.method)}。`);
      }
      if (normalizedOptions.trustLevel === 'untrusted' && source.type === 'function') {
        push(
          diagnostics,
          'UNSAFE_FUNCTION_DATA_SOURCE',
          sourcePath,
          '不可信模板禁止函数数据源。',
          '改用静态数据或宿主预取。'
        );
      }
      if (normalizedOptions.trustLevel === 'untrusted' && source.type === 'api') {
        const url = isRecord(source.api) && typeof source.api.url === 'string' ? source.api.url : '';
        let allowed = false;
        try {
          const parsed = new URL(url, 'https://template.local');
          allowed = parsed.origin === 'https://template.local' || Boolean(options.allowedApiOrigins?.includes(parsed.origin));
        } catch {
          allowed = false;
        }
        if (!allowed) {
          push(
            diagnostics,
            'UNSAFE_API_DATA_SOURCE',
            `dataSources[${index}].api.url`,
            'API 地址不在允许范围。',
            '使用相对地址或 allowedApiOrigins。'
          );
        }
      }
    });
  }

  return { valid: diagnostics.every((item) => item.severity !== 'error'), diagnostics };
}

export function assertValidTemplate(template: unknown, options?: TemplateValidationOptions): asserts template is Template {
  const result = validateTemplate(template, options);
  if (result.valid) return;
  const error = new Error(result.diagnostics.map((item) => `${item.code} ${item.path}: ${item.message}`).join('\n'));
  error.name = 'TemplateValidationError';
  Object.assign(error, { diagnostics: result.diagnostics });
  throw error;
}

export function templateComponentName(type: string): string | undefined {
  return TEMPLATE_COMPONENT_NAMES[type as keyof typeof TEMPLATE_COMPONENT_NAMES];
}

export type { Template, TemplateNode };
export type { UIDiagnostic } from './types';
