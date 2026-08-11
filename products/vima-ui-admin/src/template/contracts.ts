import type { Component } from 'vue';
import type { ComponentType } from './types';
import type { TemplateComponentContract } from './validate';

/**
 * Template DSL 类型到公开组件名的唯一映射。
 * `$intrinsic` 表示由渲染器直接使用原生容器承载，不需要注册 Vue 组件。
 */
export const TEMPLATE_COMPONENT_NAMES = {
  alert: 'VAlert',
  badge: 'VBadge',
  button: 'VButton',
  'button-group': 'VButtonGroup',
  card: 'VCard',
  checkbox: 'VCheckbox',
  'checkbox-group': 'VCheckboxGroup',
  col: 'VCol',
  container: 'VContainer',
  custom: '$intrinsic',
  datepicker: 'VDatePicker',
  descriptions: 'VDescriptions',
  'descriptions-item': 'VDescriptionsItem',
  divider: 'VDivider',
  drawer: 'VDrawer',
  dropdown: 'VDropdown',
  empty: 'VEmpty',
  form: 'VForm',
  'form-item': 'VFormItem',
  icon: 'VIcon',
  input: 'VInput',
  'input-number': 'VInputNumber',
  link: 'VLink',
  loading: 'VLoading',
  message: 'VAlert',
  modal: 'VLayer',
  pagination: 'VPagination',
  popover: 'VPopover',
  progress: 'VProgress',
  radio: 'VRadio',
  'radio-group': 'VRadioGroup',
  row: 'VRow',
  select: 'VSelect',
  statistic: 'VStatistic',
  switch: 'VSwitch',
  table: 'VTable',
  tag: 'VTag',
  'tag-input': 'VTagInput',
  text: '$intrinsic',
  textarea: 'VTextarea',
  timepicker: 'VTimePicker',
  tooltip: 'VTooltip',
  tree: 'VTree',
  upload: 'VUpload'
} as const satisfies Record<ComponentType, string>;

export const TEMPLATE_COMPONENT_TYPES = Object.freeze(
  Object.keys(TEMPLATE_COMPONENT_NAMES) as ComponentType[]
);

const registeredContracts: Partial<Record<string, TemplateComponentContract>> = {};

function componentEvents(component: Component): string[] {
  const emits = (component as { emits?: string[] | Record<string, unknown> }).emits;
  if (Array.isArray(emits)) return [...emits];
  return emits ? Object.keys(emits) : [];
}

function componentPropTypes(component: Component): Record<string, { types: string[]; required?: boolean }> {
  const result: Record<string, { types: string[]; required?: boolean }> = {};
  const props = (component as { props?: Record<string, unknown> }).props ?? {};
  for (const [name, input] of Object.entries(props)) {
    const definition = typeof input === 'function' || Array.isArray(input) ? { type: input } : input as { type?: unknown; required?: boolean };
    const constructors = Array.isArray(definition.type) ? definition.type : definition.type ? [definition.type] : [];
    const types = constructors.map((constructor) => {
      const typeName = (constructor as { name?: string }).name?.toLowerCase() || '';
      return typeName === 'object' ? 'object' : typeName === 'array' ? 'array' : typeName === 'date' ? 'date' : typeName;
    }).filter(Boolean);
    result[name] = { types, required: definition.required === true };
  }
  return result;
}

/** 返回由已注册 Vue 组件定义派生的当前契约。 */
export function getTemplateComponentContracts(): Partial<Record<string, TemplateComponentContract>> {
  return registeredContracts;
}

/** 将公开组件名表转换为渲染器使用的 DSL 注册表。 */
export function createTemplateComponentMap(
  implementations: Record<string, Component>
): Record<string, Component> {
  const result: Record<string, Component> = {};
  for (const [type, publicName] of Object.entries(TEMPLATE_COMPONENT_NAMES)) {
    if (publicName === '$intrinsic') continue;
    const implementation = implementations[publicName];
    if (!implementation) throw new Error(`模板组件 ${type} 缺少公开实现 ${publicName}`);
    result[type] = implementation;
    const props = Object.keys((implementation as { props?: Record<string, unknown> }).props ?? {});
    if (type === 'form-item') props.push('field', 'defaultValue');
    const nativeEvents = type === 'button' || type === 'link' ? ['blur', 'click', 'focus'] : [];
    registeredContracts[publicName] = {
      props: [...new Set(props)].sort(),
      propTypes: componentPropTypes(implementation),
      events: [...new Set([...componentEvents(implementation), ...nativeEvents])].sort()
    };
  }
  return result;
}
