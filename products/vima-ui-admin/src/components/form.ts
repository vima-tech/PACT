import {
  Teleport,
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useAttrs,
  watch,
  type VNode,
  type PropType
} from 'vue';
import {
  VUI_FORM_ITEM_KEY,
  VUI_FORM_KEY,
  VUI_RADIO_KEY,
  type VuiFormField
} from '../context';
import { classes, displayValue, isEmptyValue, mergeStyles, sizeToCss } from '../utils';
import { VIcon } from './icons';

const FLOATING_PANEL_GAP = 8;
const FLOATING_PANEL_VIEWPORT_MARGIN = 12;

function floatingPanelPosition(
  anchor: HTMLElement,
  preferredWidth: number,
  preferredMaxHeight: number,
  alignRight = false
) {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const availableBelow =
    viewportHeight - rect.bottom - FLOATING_PANEL_GAP - FLOATING_PANEL_VIEWPORT_MARGIN;
  const availableAbove =
    rect.top - FLOATING_PANEL_GAP - FLOATING_PANEL_VIEWPORT_MARGIN;
  const dropUp =
    availableBelow < Math.min(preferredMaxHeight, 260) && availableAbove > availableBelow;
  const availableHeight = Math.max(80, dropUp ? availableAbove : availableBelow);
  const width = Math.min(
    preferredWidth,
    Math.max(0, viewportWidth - FLOATING_PANEL_VIEWPORT_MARGIN * 2)
  );
  const preferredLeft = alignRight ? rect.right - width : rect.left;
  const left = Math.min(
    Math.max(FLOATING_PANEL_VIEWPORT_MARGIN, preferredLeft),
    Math.max(
      FLOATING_PANEL_VIEWPORT_MARGIN,
      viewportWidth - FLOATING_PANEL_VIEWPORT_MARGIN - width
    )
  );

  return {
    dropUp,
    alignRight: alignRight || left < rect.left,
    style: {
      position: 'fixed',
      top: dropUp ? 'auto' : `${rect.bottom + FLOATING_PANEL_GAP}px`,
      right: 'auto',
      bottom: dropUp
        ? `${viewportHeight - rect.top + FLOATING_PANEL_GAP}px`
        : 'auto',
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${Math.min(preferredMaxHeight, availableHeight)}px`
    }
  };
}

function controlAttrs(attrs: Record<string, unknown>, rootClass: unknown) {
  const { class: incomingClass, style, ...rest } = attrs;
  return {
    rest,
    root: {
      class: classes(rootClass, incomingClass),
      style
    }
  };
}

function formLabelWidth(
  value: string | number | undefined,
  label: string,
  required: boolean
): string | undefined {
  const configured = sizeToCss(value);
  const pixelMatch = configured?.match(/^(\d+(?:\.\d+)?)px$/);
  if (!pixelMatch || !label) return configured;

  const configuredPixels = Number(pixelMatch[1]);
  if (configuredPixels === 0) return configured;

  const textUnits = Array.from(label).reduce(
    (total, character) => total + (/[\u2E80-\u9FFF\uF900-\uFAFF]/.test(character) ? 1 : 0.55),
    0
  );
  const contentPixels = Math.ceil(textUnits * 14 + 14 + (required ? 14 : 0));
  return `${Math.max(configuredPixels, contentPixels)}px`;
}

function fieldLabel(value = ''): string {
  return value.replace(/[：:]\s*$/, '').trim();
}

function fieldPlaceholder(label: string | undefined, action: 'input' | 'select'): string {
  const normalized = fieldLabel(label);
  if (!normalized) return action === 'select' ? '请选择' : '';
  return `${action === 'select' ? '请选择' : '请输入'}${normalized}`;
}

/** 管理表单模型、规则和字段校验。 @category form @props model::表单响应式数据模型;rules::按字段名组织的校验规则;required::是否将全部绑定字段标记为必填;pane::是否使用带分隔边框的面板样式;labelWidth::水平布局标签宽度;layout::表单字段排列方式 */
export const VForm = defineComponent({
  name: 'VForm',
  inheritAttrs: false,
  props: {
    model: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    rules: { type: Object as PropType<Record<string, Array<Record<string, unknown>>>>, default: () => ({}) },
    required: { type: Boolean, default: false },
    pane: { type: Boolean, default: false },
    labelWidth: { type: [String, Number], default: 100 },
    layout: {
      type: String as PropType<'horizontal' | 'vertical' | 'inline'>,
      default: 'horizontal'
    }
  },
  setup(props, { slots, expose }) {
    const attrs = useAttrs();
    const fields = new Set<VuiFormField>();
    const initialModel = { ...props.model };
    provide(VUI_FORM_KEY, {
      get model() {
        return props.model;
      },
      get required() {
        return props.required;
      },
      get rules() {
        return props.rules;
      },
      get labelWidth() {
        return props.labelWidth;
      },
      get layout() {
        return props.layout;
      },
      register: (field) => fields.add(field),
      unregister: (field) => fields.delete(field)
    });

    const validate = async () => {
      const results = await Promise.allSettled([...fields].map((field) => field.validate()));
      const rejected = results.find((result) => result.status === 'rejected');
      if (rejected?.status === 'rejected') throw rejected.reason;
      return true;
    };
    const clearValidate = () => fields.forEach((field) => field.clear());
    const resetFields = () => {
      for (const key of Object.keys(props.model)) delete props.model[key];
      Object.assign(props.model, initialModel);
      clearValidate();
    };
    expose({ validate, clearValidate, resetFields });

    return () => {
      const { class: incomingClass, ...rest } = attrs;
      return h(
        'form',
        {
          ...rest,
          class: classes('vui-form', incomingClass, `is-${props.layout}`, { 'is-pane': props.pane }),
          novalidate: true,
          onSubmit: (event: Event) => event.preventDefault()
        },
        slots.default?.()
      );
    };
  }
});

/** 组合字段标签、控件和校验反馈。 @category form @props label::展示在控件旁的字段名称;labelWidth::覆盖当前字段的标签宽度;prop::字段在表单模型中的键;required::是否显式要求当前字段必填;mode::字段展示模式 */
export const VFormItem = defineComponent({
  name: 'VFormItem',
  inheritAttrs: false,
  props: {
    label: { type: String, default: '' },
    labelWidth: { type: [String, Number], default: undefined },
    prop: { type: String, default: '' },
    required: { type: Boolean, default: false },
    mode: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const form = inject(VUI_FORM_KEY, undefined);
    const error = ref('');
    const rules = computed(() => (props.prop ? form?.rules?.[props.prop] || [] : []));
    const value = computed(() => (props.prop ? form?.model?.[props.prop] : undefined));
    const mustFill = computed(
      () =>
        props.required ||
        Boolean(form?.required && props.prop) ||
        rules.value.some((rule) => Boolean(rule.required))
    );
    provide(VUI_FORM_ITEM_KEY, {
      get label() {
        return props.label;
      }
    });

    const validateRule = (rule: Record<string, unknown>) =>
      new Promise<void>((resolve, reject) => {
        if (rule.required && isEmptyValue(value.value)) {
          reject(new Error(String(rule.message || `${props.label || props.prop}不能为空`)));
          return;
        }
        if (!isEmptyValue(value.value) && (rule.min !== undefined || rule.max !== undefined)) {
          const actual = typeof value.value === 'number' ? value.value : String(value.value).length;
          if (
            (rule.min !== undefined && actual < Number(rule.min)) ||
            (rule.max !== undefined && actual > Number(rule.max))
          ) {
            reject(new Error(String(rule.message || '校验失败')));
            return;
          }
        }
        if (rule.pattern !== undefined && !isEmptyValue(value.value)) {
          const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(String(rule.pattern));
          if (!pattern.test(String(value.value))) {
            reject(new Error(String(rule.message || '校验失败')));
            return;
          }
        }
        if (typeof rule.validator !== 'function' || isEmptyValue(value.value)) {
          resolve();
          return;
        }
        let settled = false;
        const callback = (validationError?: Error) => {
          if (settled) return;
          settled = true;
          if (validationError) reject(validationError);
          else resolve();
        };
        try {
          const result = (rule.validator as Function)(rule, value.value, callback);
          if (result instanceof Promise) {
            result.then(() => callback()).catch((validationError) => callback(validationError));
          } else if ((rule.validator as Function).length < 3) {
            callback();
          }
        } catch (validationError) {
          callback(validationError as Error);
        }
      });

    const field: VuiFormField = {
      prop: props.prop,
      validate: async () => {
        error.value = '';
        const fieldRules = [...rules.value];
        if (mustFill.value && !fieldRules.some((rule) => rule.required)) {
          fieldRules.unshift({ required: true, message: `${props.label || props.prop}不能为空` });
        }
        try {
          for (const rule of fieldRules) await validateRule(rule);
        } catch (validationError) {
          error.value =
            validationError instanceof Error ? validationError.message : String(validationError);
          throw validationError;
        }
      },
      clear: () => {
        error.value = '';
      }
    };

    onMounted(() => {
      if (props.prop) form?.register(field);
    });
    onBeforeUnmount(() => form?.unregister(field));

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const width = formLabelWidth(
        props.labelWidth ?? form?.labelWidth,
        props.label,
        mustFill.value
      );
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-form-item', incomingClass, {
            'is-inline': (props.mode || form?.layout) === 'inline',
            'has-label': Boolean(props.label),
            'is-label-hidden': !props.label && width === '0px',
            'has-error': Boolean(error.value)
          }),
          style: mergeStyles(
            style as never,
            width ? ({ '--vui-form-label-width': width } as never) : undefined
          )
        },
        [
          props.label || width !== '0px'
            ? h(
                'label',
                {
                  class: ['vui-form-label']
                },
                [
                  mustFill.value
                    ? h('span', { class: 'vui-required', 'aria-hidden': 'true' }, '*')
                    : null,
                  props.label
                ]
              )
            : null,
          h(
            'div',
            {
              class: ['vui-form-control']
            },
            [
              slots.default?.(),
              error.value
                ? h('div', { class: 'vui-form-error', role: 'alert' }, error.value)
                : null
            ]
          )
        ]
      );
    };
  }
});

/** 输入单行文本。 @category form */
export const VInput = defineComponent({
  name: 'VInput',
  inheritAttrs: false,
  props: {
    /** 当前输入值。 */
    modelValue: { type: [String, Number, Boolean], default: '' },
    /** 原生输入类型。 */
    type: { type: String, default: 'text' },
    /** 无值时显示的输入提示。 */
    placeholder: { type: String, default: '' },
    /** 是否禁止输入和交互。 */
    disabled: { type: Boolean, default: false },
    /** 是否仅允许读取。 */
    readonly: { type: Boolean, default: false },
    /** 是否向表单语义声明必填。 */
    required: { type: Boolean, default: false },
    /** 前缀图标 */
    prefixIcon: { type: String, default: '' },
    /** 后缀图标 */
    suffixIcon: { type: String, default: '' },
    /** 前缀文字 */
    prefix: { type: String, default: '' },
    /** 后缀文字 */
    suffix: { type: String, default: '' },
    /** 是否可清空 */
    clearable: { type: Boolean, default: false },
    /** 是否显示密码切换（仅 type="password" 时有效） */
    showPassword: { type: Boolean, default: false },
    /** 多行输入模式下的可见行数。 */
    rows: { type: [Number, String], default: undefined }
  },
  emits: ['update:modelValue', 'blur', 'change', 'input', 'clear', 'focus'],
  setup(props, { emit, expose, slots }) {
    const attrs = useAttrs();
    const formItem = inject(VUI_FORM_ITEM_KEY, undefined);
    const input = ref<HTMLInputElement | HTMLTextAreaElement>();
    const isFocused = ref(false);
    const passwordVisible = ref(false);
    const effectivePlaceholder = computed(
      () => props.placeholder || fieldPlaceholder(formItem?.label, 'input')
    );
    const accessibleLabel = computed(
      () => fieldLabel(formItem?.label) || effectivePlaceholder.value
    );
    const showClear = computed(() => 
      props.clearable && 
      !props.disabled && 
      !props.readonly && 
      props.modelValue !== '' && 
      props.modelValue !== undefined &&
      props.modelValue !== null &&
      isFocused.value
    );
    const showPasswordToggle = computed(() => 
      props.showPassword && 
      props.type === 'password' && 
      !props.disabled
    );
    const inputType = computed(() => {
      if (props.type === 'password' && props.showPassword) {
        return passwordVisible.value ? 'text' : 'password';
      }
      return props.type;
    });
    const onInput = (event: Event) => {
      const raw = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
      const value = props.type === 'number' && raw !== '' ? Number(raw) : raw;
      emit('update:modelValue', value);
      emit('input', value);
    };
    const onFocus = (event: FocusEvent) => {
      isFocused.value = true;
      emit('focus', event);
    };
    const onBlur = (event: FocusEvent) => {
      // 延迟隐藏清除按钮，以便点击清除按钮时能触发
      setTimeout(() => {
        isFocused.value = false;
      }, 150);
      emit('blur', event);
    };
    const handleClear = () => {
      emit('update:modelValue', '');
      emit('change', '');
      emit('clear');
      input.value?.focus();
    };
    const togglePassword = () => {
      passwordVisible.value = !passwordVisible.value;
    };
    expose({ 
      focus: () => input.value?.focus(), 
      blur: () => input.value?.blur(),
      select: () => input.value?.select()
    });
    return () => {
      if (props.type === 'textarea') {
        const { class: incomingClass, ...rest } = attrs;
        return h('div', { class: classes('vui-textarea-wrapper', { 'is-disabled': props.disabled }) }, [
          h('textarea', {
            ...rest,
            ref: input,
            class: classes('vui-textarea', incomingClass, {
              'is-disabled': props.disabled,
              'is-readonly': props.readonly && !props.disabled,
              'is-focused': isFocused.value
            }),
            value: props.modelValue ?? '',
            rows: Number(props.rows) || 3,
            placeholder: effectivePlaceholder.value,
            'aria-label': accessibleLabel.value || undefined,
            disabled: props.disabled,
            readonly: props.readonly,
            required: props.required,
            onInput,
            onFocus,
            onChange: (event: Event) =>
              emit('change', (event.target as HTMLTextAreaElement).value),
            onBlur
          }),
          props.clearable && props.modelValue
            ? h('span', { 
                class: 'vui-textarea-clear',
                onClick: handleClear
              }, h(VIcon, { type: 'close' }))
            : null
        ]);
      }
      const { rest, root } = controlAttrs(attrs, [
        'vui-input',
        {
          'is-disabled': props.disabled,
          'is-readonly': props.readonly && !props.disabled,
          'is-focused': isFocused.value,
          'has-prefix': !!(props.prefixIcon || props.prefix || slots.prefix),
          'has-suffix': !!(props.suffixIcon || props.suffix || slots.suffix || showClear.value || showPasswordToggle.value)
        }
      ]);
      return h('div', root, [
        // 前缀区域
        (props.prefixIcon || props.prefix || slots.prefix)
          ? h('span', { class: 'vui-input-prefix' }, [
              slots.prefix?.() || 
              (props.prefix ? h('span', { class: 'vui-input-prefix-text' }, props.prefix) : null),
              props.prefixIcon ? h('span', { class: ['vui-input-prefix-icon', props.prefixIcon] }) : null
            ])
          : null,
        // 输入框
        h('input', {
          ...rest,
          ref: input,
          class: 'vui-input-native',
          value: props.modelValue ?? '',
          type: inputType.value,
          placeholder: effectivePlaceholder.value,
          'aria-label': accessibleLabel.value || undefined,
          disabled: props.disabled,
          readonly: props.readonly,
          required: props.required,
          onInput,
          onFocus,
          onChange: (event: Event) => emit('change', (event.target as HTMLInputElement).value),
          onBlur
        }),
        // 后缀区域
        (props.suffixIcon || props.suffix || slots.suffix || showClear.value || showPasswordToggle.value)
          ? h('span', { class: 'vui-input-suffix' }, [
              // 清除按钮
              showClear.value
                ? h('span', { 
                    class: 'vui-input-clear',
                    onMousedown: (event: MouseEvent) => event.preventDefault(),
                    onClick: handleClear
                  }, h(VIcon, { type: 'close' }))
                : null,
              // 密码切换按钮
              showPasswordToggle.value
                ? h('span', { 
                    class: 'vui-input-password-toggle',
                    onMousedown: (event: MouseEvent) => event.preventDefault(),
                    onClick: togglePassword
                  }, h(VIcon, { type: passwordVisible.value ? 'eye-off' : 'eye' }))
                : null,
              slots.suffix?.() || 
              (props.suffix ? h('span', { class: 'vui-input-suffix-text' }, props.suffix) : null),
              props.suffixIcon ? h('span', { class: ['vui-input-suffix-icon', props.suffixIcon] }) : null
            ])
          : null
      ]);
    };
  }
});

/** 输入多行文本。 @category form */
export const VTextarea = defineComponent({
  name: 'VTextarea',
  inheritAttrs: false,
  props: {
    /** 当前多行文本值。 */
    modelValue: { type: String, default: '' },
    /** 无值时显示的输入提示。 */
    placeholder: { type: String, default: '' },
    /** 是否禁止输入。 */
    disabled: { type: Boolean, default: false },
    /** 是否仅允许读取。 */
    readonly: { type: Boolean, default: false },
    /** 默认可见行数。 */
    rows: { type: [Number, String], default: 3 },
    /** 是否根据内容自动调整高度。 */
    autosize: { type: [Boolean, Object], default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const formItem = inject(VUI_FORM_ITEM_KEY, undefined);
    const textarea = ref<HTMLTextAreaElement>();
    const effectivePlaceholder = computed(
      () => props.placeholder || fieldPlaceholder(formItem?.label, 'input')
    );
    const resize = () => {
      if (!props.autosize || !textarea.value) return;
      textarea.value.style.height = 'auto';
      textarea.value.style.height = `${textarea.value.scrollHeight}px`;
    };
    watch(() => props.modelValue, () => queueMicrotask(resize));
    onMounted(resize);
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      return h('textarea', {
        ...rest,
        ref: textarea,
        class: classes('vui-textarea', incomingClass, {
          'is-disabled': props.disabled,
          'is-readonly': props.readonly && !props.disabled
        }),
        value: props.modelValue,
        rows: Number(props.rows) || 3,
        placeholder: effectivePlaceholder.value,
        'aria-label': fieldLabel(formItem?.label) || effectivePlaceholder.value || undefined,
        disabled: props.disabled,
        readonly: props.readonly,
        onInput: (event: Event) => {
          emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
          resize();
        },
        onChange: (event: Event) => emit('change', (event.target as HTMLTextAreaElement).value)
      });
    };
  }
});

/** 输入带范围约束的数值。 @category form */
export const VInputNumber = defineComponent({
  name: 'VInputNumber',
  inheritAttrs: false,
  props: {
    /** 当前数值。 */
    modelValue: { type: Number, default: undefined },
    /** 允许输入的最小值。 */
    min: { type: Number, default: undefined },
    /** 允许输入的最大值。 */
    max: { type: Number, default: undefined },
    /** 是否禁止输入和步进操作。 */
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const update = (next: number) => {
      const value = Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, next));
      emit('update:modelValue', value);
      emit('change', value);
    };
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          class: classes('vui-number', incomingClass, {
            'is-disabled': props.disabled
          }),
          style,
          'aria-disabled': props.disabled || undefined
        },
        [
          h('button', {
            type: 'button',
            class: 'vui-number-step',
            disabled: props.disabled,
            onClick: () => update(Number(props.modelValue || 0) - 1)
          }, '−'),
          h('input', {
            ...rest,
            class: 'vui-number-input',
            type: 'number',
            value: props.modelValue ?? '',
            min: props.min,
            max: props.max,
            disabled: props.disabled,
            onInput: (event: Event) => update(Number((event.target as HTMLInputElement).value))
          }),
          h('button', {
            type: 'button',
            class: 'vui-number-step',
            disabled: props.disabled,
            onClick: () => update(Number(props.modelValue || 0) + 1)
          }, '+')
        ]
      );
    };
  }
});

interface SelectOptionData {
  key: string;
  value: unknown;
  label: string;
  disabled: boolean;
}

function vnodeTextContent(content: unknown): string {
  if (typeof content === 'string' || typeof content === 'number') return String(content);
  if (Array.isArray(content)) return content.map(vnodeTextContent).join('');
  if (!content || typeof content !== 'object') return '';

  const node = content as { children?: unknown; default?: () => unknown };
  if (typeof node.default === 'function') return vnodeTextContent(node.default());
  return vnodeTextContent(node.children);
}

function collectSelectOptions(nodes: VNode[], target: SelectOptionData[] = []): SelectOptionData[] {
  nodes.forEach((node, index) => {
    const componentName =
      typeof node.type === 'object' && node.type
        ? (node.type as { name?: string }).name
        : '';

    if (componentName === 'VSelectOption') {
      const props = (node.props || {}) as Record<string, unknown>;
      const value = props.value ?? '';
      const slotLabel = vnodeTextContent(node.children).trim();
      target.push({
        key: String(node.key ?? `${String(value)}-${index}`),
        value,
        label: String(props.label ?? (slotLabel || value)),
        disabled: props.disabled === true || props.disabled === ''
      });
      return;
    }

    if (Array.isArray(node.children)) {
      collectSelectOptions(node.children as VNode[], target);
    }
  });
  return target;
}

// 选项超过这个数量时自动提供输入检索，不需要每个页面单独声明 show-search；
// 少于该数量时一屏就能看完，再加一个输入框反而是干扰。
const SELECT_SEARCH_AUTO_THRESHOLD = 8;

/** 从有限选项中选择单值或多值。 @category form @useWhen 选项集合已知 @avoidWhen 自由文本输入 @related VFormItem,VRadio,VCheckbox @event update:modelValue :: string | number | Array<string | number> | null :: 更新后的选择值 @event change :: string | number | Array<string | number> | null :: 选择变更 */
export const VSelect = defineComponent({
  name: 'VSelect',
  inheritAttrs: false,
  props: {
    /** 当前选中值；多选模式使用数组。 */
    modelValue: { type: null, default: '' },
    /** 未选择时显示的提示。 */
    placeholder: { type: String, default: '请选择' },
    /** 是否禁止选择。 */
    disabled: { type: Boolean, default: false },
    /** 是否允许选择多个值。 */
    multiple: { type: Boolean, default: false },
    /** 是否提供清空入口。 */
    clearable: { type: Boolean, default: false },
    /** 是否向表单语义声明必填。 */
    required: { type: Boolean, default: false },
    /** 是否强制显示选项检索框。 */
    showSearch: { type: Boolean, default: false },
    /** 选项检索框的提示。 */
    searchPlaceholder: { type: String, default: '' },
    /** 下拉面板最小宽度。 */
    dropdownMinWidth: { type: Number, default: 0 },
    /** 下拉面板最大宽度。 */
    dropdownMaxWidth: { type: Number, default: 400 },
    /** 是否将下拉面板右边缘与父元素对齐。 */
    dropdownAlignToParent: { type: Boolean, default: false },
    /** 下拉宽度是否自动适应内容 */
    autoWidth: { type: Boolean, default: true },
    /** 兼容旧接口的选项集合。 */
    items: { type: Array as PropType<Array<Record<string, unknown>>>, default: () => [] },
    /** 结构化选项集合。 */
    options: { type: Array as PropType<Array<Record<string, unknown>>>, default: () => [] }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit, slots }) {
    const attrs = useAttrs();
    const formItem = inject(VUI_FORM_ITEM_KEY, undefined);
    const root = ref<HTMLElement>();
    const popover = ref<HTMLElement>();
    const searchInput = ref<HTMLInputElement>();
    const keyword = ref('');
    const opened = ref(false);
    const dropUp = ref(false);
    const currentOptionCount = ref(0);
    const popoverStyle = ref<Record<string, string>>({});
    const effectivePlaceholder = computed(() =>
      props.placeholder && props.placeholder !== '请选择'
        ? props.placeholder
        : fieldPlaceholder(formItem?.label, 'select')
    );
    const accessibleLabel = computed(
      () => fieldLabel(formItem?.label) || effectivePlaceholder.value
    );
    const suppliedOptions = computed(() => (props.options.length ? props.options : props.items));
    // 保存当前选项数据，用于计算宽度
    const currentOptionsData = ref<SelectOptionData[]>([]);
    const close = () => {
      opened.value = false;
      // 关闭即清空关键字，下次展开回到完整选项列表
      keyword.value = '';
    };
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!root.value?.contains(target) && !popover.value?.contains(target)) close();
    };

    // 测量选项文字宽度的临时元素
    let measureElement: HTMLSpanElement | null = null;
    const getMeasureElement = () => {
      if (!measureElement) {
        measureElement = document.createElement('span');
        measureElement.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:14px;padding:0 12px;';
        document.body.appendChild(measureElement);
      }
      return measureElement;
    };

    // 计算选项的最大宽度
    const calculateOptionsMaxWidth = (optionData: SelectOptionData[]) => {
      if (!props.autoWidth) return 0;
      const measure = getMeasureElement();
      let maxWidth = 0;
      // 只测量前20个选项，避免性能问题
      const optionsToMeasure = optionData.slice(0, 20);
      for (const option of optionsToMeasure) {
        measure.textContent = option.label;
        maxWidth = Math.max(maxWidth, measure.getBoundingClientRect().width);
      }
      // 加上 padding 和 checkbox 的宽度
      return Math.ceil(maxWidth) + 32;
    };

    const updatePopoverPosition = () => {
      if (!opened.value || !root.value) return;
      const anchor = props.dropdownAlignToParent
        ? root.value.parentElement || root.value
        : root.value;
      const anchorWidth = anchor.getBoundingClientRect().width;
      
      // 计算下拉宽度
      const optionsMaxWidth = currentOptionsData.value.length > 0 
        ? calculateOptionsMaxWidth(currentOptionsData.value) 
        : 0;
      const minWidth = Math.max(anchorWidth, props.dropdownMinWidth);
      const preferredWidth = props.autoWidth 
        ? Math.max(minWidth, Math.min(optionsMaxWidth, props.dropdownMaxWidth))
        : minWidth;
      
      const position = floatingPanelPosition(
        anchor,
        preferredWidth,
        searchEnabled(currentOptionCount.value) ? 300 : 248
      );
      dropUp.value = position.dropUp;
      popoverStyle.value = position.style;
    };
    const togglePopover = () => {
      if (props.disabled) return;
      if (opened.value) {
        close();
        return;
      }
      opened.value = true;
      // 展开后把焦点交给检索框，可以直接打字筛选
      nextTick(() => {
        updatePopoverPosition();
        searchInput.value?.focus({ preventScroll: true });
      });
    };
    const matchKeyword = (option: SelectOptionData) => {
      const text = keyword.value.trim().toLowerCase();
      if (!text) return true;
      return (
        option.label.toLowerCase().includes(text) ||
        String(option.value ?? '').toLowerCase().includes(text)
      );
    };
    // 检索框：显式声明 show-search，或选项数量超过阈值时自动出现
    const searchEnabled = (optionCount: number) =>
      props.showSearch || optionCount >= SELECT_SEARCH_AUTO_THRESHOLD;
    const renderSearch = (optionCount: number) => {
      if (!searchEnabled(optionCount)) return null;
      return h('div', { class: 'vui-select-search' }, [
        h('input', {
          ref: searchInput,
          type: 'text',
          class: 'vui-select-search-input',
          value: keyword.value,
          placeholder: props.searchPlaceholder || '输入关键字检索',
          'aria-label': '选项检索',
          autocomplete: 'off',
          onInput: (event: Event) => {
            keyword.value = (event.target as HTMLInputElement).value;
          },
          // 弹层常位于表单内，回车不能触发提交；Esc 交给根节点统一关闭
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter') event.preventDefault();
          }
        })
      ]);
    };
    const updateMultiple = (value: unknown, selected: boolean) => {
      const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
      const next = selected
        ? current.filter((item) => String(item) !== String(value))
        : [...current, value];
      emit('update:modelValue', next);
      emit('change', next);
    };
    onMounted(() => {
      document.addEventListener('mousedown', onDocumentClick);
      window.addEventListener('resize', updatePopoverPosition);
      window.addEventListener('scroll', updatePopoverPosition, true);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDocumentClick);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
      // 清理测量元素
      if (measureElement) {
        measureElement.remove();
        measureElement = null;
      }
    });
    watch(() => props.disabled, (disabled) => {
      if (disabled) close();
    });
    const selectSingle = (value: unknown) => {
      emit('update:modelValue', value);
      emit('change', value);
      close();
    };
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const slotOptions = slots.default?.() || [];
      const optionData = suppliedOptions.value.map((option, index): SelectOptionData => {
        const value = option.value ?? option.id ?? option._id ?? index;
        const label = option.label ?? option.name ?? option.title ?? value;
        return {
          key: String(value),
          value,
          label: String(label),
          disabled: Boolean(option.disabled)
        };
      });
      optionData.push(...collectSelectOptions(slotOptions));
      currentOptionCount.value = optionData.length;
      // 更新当前选项数据，用于计算下拉宽度
      currentOptionsData.value = optionData;

      if (props.multiple) {
        const selectedValues = Array.isArray(props.modelValue) ? props.modelValue : [];
        const selectedKeys = new Set(selectedValues.map(String));
        const selectedOptions = selectedValues.map((value) => {
          const option = optionData.find((item) => String(item.value) === String(value));
          return {
            value,
            label: option?.label || displayValue(value)
          };
        });

        return h(
          'div',
          {
            ref: root,
            class: classes('vui-select', 'vui-select-multiple', incomingClass, {
              'is-multiple': true,
              'is-open': opened.value,
              'is-disabled': props.disabled,
              'is-drop-up': dropUp.value
            }),
            style,
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Escape') close();
            }
          },
          [
            h(
              'button',
              {
                ...rest,
                type: 'button',
                class: 'vui-select-multiple-trigger',
                disabled: props.disabled,
                'aria-expanded': String(opened.value),
                'aria-haspopup': 'listbox',
                'aria-label': accessibleLabel.value || undefined,
                onClick: togglePopover
              },
              [
                h(
                  'span',
                  { class: 'vui-select-values' },
                  selectedOptions.length
                    ? [
                        ...selectedOptions.slice(0, 2).map((option) =>
                          h('span', { class: 'vui-select-chip', key: String(option.value) }, [
                            h('span', { class: 'vui-select-chip-label' }, option.label),
                            !props.disabled
                              ? h(
                                  'span',
                                  {
                                    class: 'vui-select-chip-remove',
                                    role: 'button',
                                    'aria-label': `移除${option.label}`,
                                    onMousedown: (event: MouseEvent) => event.stopPropagation(),
                                    onClick: (event: MouseEvent) => {
                                      event.stopPropagation();
                                      updateMultiple(option.value, true);
                                    }
                                  },
                                  h(VIcon, { type: 'close' })
                                )
                              : null
                          ])
                        ),
                        selectedOptions.length > 2
                          ? h(
                              'span',
                              { class: 'vui-select-selection-count' },
                              `+${selectedOptions.length - 2}`
                            )
                          : null
                      ]
                    : h('span', { class: 'vui-select-placeholder' }, effectivePlaceholder.value)
                ),
                h(VIcon, { class: 'vui-select-chevron', type: 'chevron-down' })
              ]
            ),
            opened.value
              ? h(Teleport, { to: 'body' }, [
                  h(
                    'div',
                    {
                      ref: popover,
                      class: classes('vui-select-popover', 'is-teleported', {
                        'has-search': searchEnabled(optionData.length),
                        'is-drop-up': dropUp.value
                      }),
                      style: popoverStyle.value,
                      role: 'listbox',
                      'aria-multiselectable': 'true',
                      onKeydown: (event: KeyboardEvent) => {
                        if (event.key === 'Escape') close();
                      }
                    },
                    [
                      renderSearch(optionData.length),
                      ...(optionData.length
                        ? (() => {
                            const visible = optionData.filter(matchKeyword);
                            if (!visible.length) {
                              return [h('div', { class: 'vui-select-empty' }, '无匹配选项')];
                            }
                            return visible.map((option) => {
                              const selected = selectedKeys.has(String(option.value));
                              return h(
                                'button',
                                {
                                  type: 'button',
                                  key: option.key,
                                  class: classes('vui-select-option', {
                                    'is-selected': selected
                                  }),
                                  role: 'option',
                                  disabled: option.disabled,
                                  'aria-selected': String(selected),
                                  onClick: () => updateMultiple(option.value, selected)
                                },
                                [
                                  h('span', { class: 'vui-select-option-check', 'aria-hidden': 'true' }, selected ? h(VIcon, { type: 'check' }) : undefined),
                                  h('span', { class: 'vui-select-option-label' }, option.label)
                                ]
                              );
                            });
                          })()
                        : [h('div', { class: 'vui-select-empty' }, '暂无可选项')])
                    ]
                  )
                ])
              : null
          ]
        );
      }

      const empty = isEmptyValue(props.modelValue);
      const selectedOption = empty
        ? undefined
        : optionData.find((option) => String(option.value) === String(props.modelValue));
      const filteredOptions = optionData.filter(matchKeyword);
      const singleOptions =
        props.clearable &&
        !keyword.value.trim() &&
        !optionData.some((option) => isEmptyValue(option.value))
          ? [
              {
                key: '__vui-select-placeholder',
                value: '',
                label: effectivePlaceholder.value,
                disabled: false
              },
              ...filteredOptions
            ]
          : filteredOptions;

      return h(
        'div',
        {
          ref: root,
          class: classes('vui-select', 'vui-select-single', incomingClass, {
            'is-open': opened.value,
            'is-disabled': props.disabled,
            'is-drop-up': dropUp.value,
            'is-placeholder': empty
          }),
          style,
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
          }
        },
        [
          h(
            'button',
            {
              ...rest,
              type: 'button',
              class: 'vui-select-trigger',
              disabled: props.disabled,
              role: 'combobox',
              'aria-expanded': String(opened.value),
              'aria-haspopup': 'listbox',
              'aria-required': String(props.required),
              'aria-label': accessibleLabel.value || undefined,
              onClick: togglePopover
            },
            [
              h(
                'span',
                {
                  class: classes('vui-select-value', {
                    'is-placeholder': empty
                  })
                },
                selectedOption?.label ||
                  (empty ? effectivePlaceholder.value : displayValue(props.modelValue))
              ),
              h(VIcon, { class: 'vui-select-chevron', type: 'chevron-down' })
            ]
          ),
          opened.value
            ? h(Teleport, { to: 'body' }, [
                h(
                  'div',
                  {
                    ref: popover,
                    class: classes('vui-select-popover', 'is-teleported', {
                      'has-search': searchEnabled(optionData.length),
                      'is-drop-up': dropUp.value
                    }),
                    style: popoverStyle.value,
                    role: 'listbox',
                    onKeydown: (event: KeyboardEvent) => {
                      if (event.key === 'Escape') close();
                    }
                  },
                  [
                    renderSearch(optionData.length),
                    ...(singleOptions.length
                    ? singleOptions.map((option) => {
                        const selected =
                          String(option.value ?? '') === String(props.modelValue ?? '');
                        return h(
                          'button',
                          {
                            type: 'button',
                            key: option.key,
                            class: classes('vui-select-option', 'is-single', {
                              'is-selected': selected
                            }),
                            role: 'option',
                            disabled: option.disabled,
                            'aria-selected': String(selected),
                            onClick: () => selectSingle(option.value)
                          },
                          [
                            h(
                              'span',
                              {
                                class: 'vui-select-option-check',
                                'aria-hidden': 'true'
                              },
                              selected ? h(VIcon, { type: 'check' }) : undefined
                            ),
                            h('span', { class: 'vui-select-option-label' }, option.label)
                          ]
                        );
                      })
                    : [
                        h(
                          'div',
                          { class: 'vui-select-empty' },
                          optionData.length ? '无匹配选项' : '暂无可选项'
                        )
                      ])
                  ]
                )
              ])
            : null
        ]
      );
    };
  }
});

/** 声明 VSelect 的插槽式选项。 @category form @props value::选项提交值;label::选项显示文字;disabled::是否禁用该选项 @related VSelect */
export const VSelectOption = defineComponent({
  name: 'VSelectOption',
  inheritAttrs: false,
  props: {
    value: { type: null, default: '' },
    label: { type: [String, Number], default: '' },
    disabled: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () =>
      h(
        'option',
        {
          ...attrs,
          value: String(props.value ?? ''),
          disabled: props.disabled,
          'data-vui-value': JSON.stringify(props.value)
        },
        slots.default?.() || String(props.label ?? props.value ?? '')
      );
  }
});

const CALENDAR_WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function parseCalendarDate(value: unknown): Date | undefined {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function formatCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameCalendarDate(left?: Date, right?: Date): boolean {
  return Boolean(left && right && formatCalendarDate(left) === formatCalendarDate(right));
}

function startOfCalendarMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addCalendarMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarToday(): Date {
  const current = new Date();
  return new Date(current.getFullYear(), current.getMonth(), current.getDate());
}

function calendarMonthDays(viewDate: Date): Date[] {
  const first = startOfCalendarMonth(viewDate);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = addCalendarDays(first, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(gridStart, index));
}

function calendarDateTimeParts(value: unknown): { date?: Date; hour: string; minute: string } {
  const text = String(value || '').replace('T', ' ');
  const timeMatch = text.match(/\s(\d{2}):(\d{2})/);
  return {
    date: parseCalendarDate(text),
    hour: timeMatch?.[1] || '09',
    minute: timeMatch?.[2] || '00'
  };
}

/** 输入单个日期、时间或日期范围。 @category form @event update:modelValue :: string | string[] :: 更新后的日期值 @event change :: string | string[] :: 日期变更 */
export const VDatePicker = defineComponent({
  name: 'VDatePicker',
  inheritAttrs: false,
  props: {
    /** 当前日期、时间或范围值。 */
    modelValue: { type: null, default: '' },
    /** 日期选择精度。 */
    type: { type: String, default: 'date' },
    /** 未选择时显示的提示。 */
    placeholder: { type: String, default: '' },
    /** 是否禁止选择。 */
    disabled: { type: Boolean, default: false },
    /** 是否向表单语义声明必填。 */
    required: { type: Boolean, default: false },
    /** 是否选择起止范围。 */
    range: { type: Boolean, default: false },
    /** 是否允许清空当前值。 */
    allowClear: { type: Boolean, default: false },
    /** 可选择的最小日期。 */
    min: { type: String, default: '' },
    /** 可选择的最大日期。 */
    max: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const formItem = inject(VUI_FORM_ITEM_KEY, undefined);
    const root = ref<HTMLElement>();
    const trigger = ref<HTMLButtonElement>();
    const calendarPopover = ref<HTMLElement>();
    const opened = ref(false);
    const dropUp = ref(false);
    const alignRight = ref(false);
    const calendarPopoverStyle = ref<Record<string, string>>({});
    const viewDate = ref(startOfCalendarMonth(calendarToday()));
    const activeDate = ref(calendarToday());
    const rangeStart = ref<Date>();
    const draftDate = ref<Date>();
    const draftHour = ref('09');
    const draftMinute = ref('00');
    const effectivePlaceholder = computed(
      () => props.placeholder || fieldPlaceholder(formItem?.label, 'select')
    );
    const accessibleLabel = computed(
      () => fieldLabel(formItem?.label) || effectivePlaceholder.value
    );
    const minimumDate = computed(() => parseCalendarDate(props.min));
    const maximumDate = computed(() => parseCalendarDate(props.max));
    const selectedDate = computed(() =>
      props.range ? undefined : parseCalendarDate(props.modelValue)
    );
    const selectedRange = computed<[Date | undefined, Date | undefined]>(() => {
      if (!props.range || !Array.isArray(props.modelValue)) return [undefined, undefined];
      return [parseCalendarDate(props.modelValue[0]), parseCalendarDate(props.modelValue[1])];
    });
    const displayText = computed(() => {
      if (props.range) {
        const values = Array.isArray(props.modelValue) ? props.modelValue : [];
        const startDate = parseCalendarDate(values[0]);
        const endDate = parseCalendarDate(values[1]);
        const start = startDate ? formatCalendarDate(startDate) : String(values[0] || '');
        const end = endDate ? formatCalendarDate(endDate) : String(values[1] || '');
        return start && end ? `${start} 至 ${end}` : start;
      }
      const value = String(props.modelValue || '');
      if (props.type === 'datetime') return value.replace('T', ' ').slice(0, 16);
      const date = parseCalendarDate(value);
      return date ? formatCalendarDate(date) : value;
    });
    const isDisabledDate = (date: Date) => {
      const key = formatCalendarDate(date);
      return Boolean(
        (minimumDate.value && key < formatCalendarDate(minimumDate.value)) ||
          (maximumDate.value && key > formatCalendarDate(maximumDate.value)) ||
          (props.range && rangeStart.value && date <= rangeStart.value)
      );
    };
    const clampDate = (date: Date) => {
      if (minimumDate.value && date < minimumDate.value) return minimumDate.value;
      if (maximumDate.value && date > maximumDate.value) return maximumDate.value;
      return date;
    };
    const emitValue = (value: string | string[]) => {
      emit('update:modelValue', value);
      emit('change', value);
    };
    const close = (restoreFocus = false) => {
      opened.value = false;
      rangeStart.value = undefined;
      if (restoreFocus) nextTick(() => trigger.value?.focus());
    };
    const focusActiveDate = () =>
      nextTick(() => {
        calendarPopover.value
          ?.querySelector<HTMLButtonElement>(
            `.vui-calendar-day[data-date="${formatCalendarDate(activeDate.value)}"]`
          )
          ?.focus();
      });
    const syncCalendar = () => {
      const dateTime = calendarDateTimeParts(props.modelValue);
      const rangeDate = selectedRange.value[0] || selectedRange.value[1];
      const target = clampDate(selectedDate.value || rangeDate || dateTime.date || calendarToday());
      activeDate.value = target;
      viewDate.value = startOfCalendarMonth(target);
      rangeStart.value = undefined;
      draftDate.value = dateTime.date || target;
      draftHour.value = dateTime.hour;
      draftMinute.value = dateTime.minute;
    };
    const open = (focusCalendar = false) => {
      if (props.disabled) return;
      syncCalendar();
      opened.value = true;
      nextTick(() => {
        updateCalendarPosition();
        if (focusCalendar) focusActiveDate();
      });
    };
    const toggle = () => {
      if (opened.value) close();
      else open(false);
    };
    const clearValue = (event?: Event) => {
      event?.stopPropagation();
      emitValue(props.range ? ['', ''] : '');
      close();
      nextTick(() => trigger.value?.focus());
    };
    const selectDate = (date: Date) => {
      if (isDisabledDate(date)) return;
      activeDate.value = date;
      viewDate.value = startOfCalendarMonth(date);

      if (props.range) {
        if (!rangeStart.value) {
          rangeStart.value = date;
          activeDate.value = addCalendarDays(date, 1);
          viewDate.value = startOfCalendarMonth(activeDate.value);
          focusActiveDate();
          return;
        }
        emitValue([rangeStart.value, date].map(formatCalendarDate));
        close(true);
        return;
      }

      if (props.type === 'datetime') {
        draftDate.value = date;
        focusActiveDate();
        return;
      }

      emitValue(formatCalendarDate(date));
      close(true);
    };
    const confirmDateTime = () => {
      const date = draftDate.value || activeDate.value;
      const hour = String(Math.min(23, Math.max(0, Number(draftHour.value) || 0))).padStart(2, '0');
      const minute = String(Math.min(59, Math.max(0, Number(draftMinute.value) || 0))).padStart(2, '0');
      emitValue(`${formatCalendarDate(date)} ${hour}:${minute}`);
      close(true);
    };
    const moveActiveDate = (amount: number) => {
      let next = addCalendarDays(activeDate.value, amount);
      const direction = amount < 0 ? -1 : 1;
      let attempts = 0;
      while (isDisabledDate(next) && attempts < 370) {
        next = addCalendarDays(next, direction);
        attempts += 1;
      }
      if (isDisabledDate(next)) return;
      activeDate.value = next;
      viewDate.value = startOfCalendarMonth(next);
      focusActiveDate();
    };
    const moveActiveMonth = (amount: number) => {
      const next = addCalendarMonths(viewDate.value, amount);
      const candidate = clampDate(
        new Date(
          next.getFullYear(),
          next.getMonth(),
          Math.min(
            activeDate.value.getDate(),
            new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
          )
        )
      );
      viewDate.value = startOfCalendarMonth(candidate);
      activeDate.value = candidate;
      focusActiveDate();
    };
    const onCalendarKeydown = (event: KeyboardEvent) => {
      const actions: Record<string, () => void> = {
        ArrowLeft: () => moveActiveDate(-1),
        ArrowRight: () => moveActiveDate(1),
        ArrowUp: () => moveActiveDate(-7),
        ArrowDown: () => moveActiveDate(7),
        Home: () => moveActiveDate(-((activeDate.value.getDay() + 6) % 7)),
        End: () => moveActiveDate(6 - ((activeDate.value.getDay() + 6) % 7)),
        PageUp: () => moveActiveMonth(-1),
        PageDown: () => moveActiveMonth(1)
      };
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectDate(activeDate.value);
        return;
      }
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    const onDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !root.value?.contains(target) &&
        !calendarPopover.value?.contains(target)
      ) {
        close();
      }
    };
    const updateCalendarPosition = () => {
      if (!opened.value || !root.value) return;
      const rect = root.value.getBoundingClientRect();
      const position = floatingPanelPosition(
        root.value,
        328,
        props.type === 'datetime' ? 450 : 390,
        rect.left + 328 > window.innerWidth - FLOATING_PANEL_VIEWPORT_MARGIN
      );
      dropUp.value = position.dropUp;
      alignRight.value = position.alignRight;
      calendarPopoverStyle.value = position.style;
    };

    onMounted(() => {
      document.addEventListener('mousedown', onDocumentPointerDown);
      window.addEventListener('resize', updateCalendarPosition);
      window.addEventListener('scroll', updateCalendarPosition, true);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDocumentPointerDown);
      window.removeEventListener('resize', updateCalendarPosition);
      window.removeEventListener('scroll', updateCalendarPosition, true);
    });
    watch(
      () => props.disabled,
      (disabled) => {
        if (disabled) close();
      }
    );
    watch(
      () => props.modelValue,
      () => {
        if (!opened.value) syncCalendar();
      },
      { deep: true }
    );

    const renderCalendar = () => {
      const visibleYear = viewDate.value.getFullYear();
      const visibleMonth = viewDate.value.getMonth();
      const current = calendarToday();
      const displayedStart = rangeStart.value || selectedRange.value[0];
      const displayedEnd = rangeStart.value ? undefined : selectedRange.value[1];
      const yearStart = minimumDate.value?.getFullYear() ?? current.getFullYear() - 100;
      const yearEnd = maximumDate.value?.getFullYear() ?? current.getFullYear() + 30;
      const years = Array.from(
        { length: Math.max(1, yearEnd - yearStart + 1) },
        (_, index) => yearStart + index
      );
      const days = calendarMonthDays(viewDate.value);

      return h(
        'div',
        {
          ref: calendarPopover,
          class: 'vui-calendar-popover',
          style: calendarPopoverStyle.value,
          role: 'dialog',
          'aria-label': accessibleLabel.value || '选择日期',
          onKeydown: onCalendarKeydown
        },
        [
          h('div', { class: 'vui-calendar-header' }, [
            h(
              'button',
              {
                type: 'button',
                class: 'vui-calendar-nav',
                'aria-label': '上个月',
                onClick: () => moveActiveMonth(-1)
              },
              '‹'
            ),
            h('div', { class: 'vui-calendar-title' }, [
              h(
                'select',
                {
                  class: 'vui-calendar-select',
                  value: visibleYear,
                  'aria-label': '选择年份',
                  onChange: (event: Event) => {
                    const year = Number((event.target as HTMLSelectElement).value);
                    const next = clampDate(new Date(year, visibleMonth, 1));
                    viewDate.value = startOfCalendarMonth(next);
                    activeDate.value = next;
                    focusActiveDate();
                  }
                },
                years.map((year) => h('option', { value: year, key: year }, `${year}年`))
              ),
              h(
                'select',
                {
                  class: 'vui-calendar-select',
                  value: visibleMonth,
                  'aria-label': '选择月份',
                  onChange: (event: Event) => {
                    const month = Number((event.target as HTMLSelectElement).value);
                    const next = clampDate(new Date(visibleYear, month, 1));
                    viewDate.value = startOfCalendarMonth(next);
                    activeDate.value = next;
                    focusActiveDate();
                  }
                },
                Array.from({ length: 12 }, (_, month) =>
                  h('option', { value: month, key: month }, `${month + 1}月`)
                )
              )
            ]),
            h(
              'button',
              {
                type: 'button',
                class: 'vui-calendar-nav',
                'aria-label': '下个月',
                onClick: () => moveActiveMonth(1)
              },
              '›'
            )
          ]),
          h(
            'div',
            { class: 'vui-calendar-weekdays', 'aria-hidden': 'true' },
            CALENDAR_WEEKDAYS.map((weekday) => h('span', { key: weekday }, weekday))
          ),
          h(
            'div',
            { class: 'vui-calendar-grid', role: 'grid' },
            days.map((date) => {
              const dateKey = formatCalendarDate(date);
              const outsideMonth = date.getMonth() !== visibleMonth;
              const disabled = isDisabledDate(date);
              const selected =
                sameCalendarDate(date, selectedDate.value) ||
                sameCalendarDate(date, displayedStart) ||
                sameCalendarDate(date, displayedEnd) ||
                (props.type === 'datetime' && sameCalendarDate(date, draftDate.value));
              const inRange = Boolean(
                displayedStart &&
                  displayedEnd &&
                  date > displayedStart &&
                  date < displayedEnd
              );
              return h(
                'button',
                {
                  type: 'button',
                  key: dateKey,
                  class: classes('vui-calendar-day', {
                    'is-outside': outsideMonth,
                    'is-today': sameCalendarDate(date, current),
                    'is-selected': selected,
                    'is-in-range': inRange,
                    'is-active': sameCalendarDate(date, activeDate.value)
                  }),
                  'data-date': dateKey,
                  role: 'gridcell',
                  tabindex: sameCalendarDate(date, activeDate.value) ? 0 : -1,
                  disabled,
                  'aria-selected': String(selected),
                  'aria-label': `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
                  onClick: () => selectDate(date)
                },
                String(date.getDate())
              );
            })
          ),
          props.type === 'datetime'
            ? h('div', { class: 'vui-calendar-time' }, [
                h('span', { class: 'vui-calendar-time-label' }, '时间'),
                h('input', {
                  class: 'vui-calendar-time-input',
                  type: 'number',
                  min: 0,
                  max: 23,
                  value: draftHour.value,
                  'aria-label': '小时',
                  onInput: (event: Event) => {
                    draftHour.value = (event.target as HTMLInputElement).value;
                  }
                }),
                h('span', { 'aria-hidden': 'true' }, ':'),
                h('input', {
                  class: 'vui-calendar-time-input',
                  type: 'number',
                  min: 0,
                  max: 59,
                  value: draftMinute.value,
                  'aria-label': '分钟',
                  onInput: (event: Event) => {
                    draftMinute.value = (event.target as HTMLInputElement).value;
                  }
                })
              ])
            : null,
          h('div', { class: 'vui-calendar-footer' }, [
            h(
              'div',
              { class: 'vui-calendar-footer-start' },
              props.range && rangeStart.value
                ? h('span', { class: 'vui-calendar-hint', role: 'status' }, '请选择结束日期')
                : h(
                    'button',
                    {
                      type: 'button',
                      class: 'vui-calendar-text-button',
                      disabled: isDisabledDate(current),
                      onClick: () => selectDate(current)
                    },
                    '今天'
                  )
            ),
            h('div', { class: 'vui-calendar-actions' }, [
              props.allowClear && displayText.value
                ? h(
                    'button',
                    {
                      type: 'button',
                      class: 'vui-calendar-text-button',
                      onClick: clearValue
                    },
                    '清除'
                  )
                : null,
              props.type === 'datetime'
                ? [
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'vui-calendar-text-button',
                        onClick: () => close(true)
                      },
                      '取消'
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'vui-calendar-confirm',
                        onClick: confirmDateTime
                      },
                      '确定'
                    )
                  ]
                : null
            ])
          ])
        ]
      );
    };

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      if (props.type === 'month' || props.type === 'year') {
        return h(
          'div',
          {
            class: classes('vui-date', incomingClass, {
              'is-disabled': props.disabled
            }),
            style
          },
          [
            h('input', {
              ...rest,
              class: 'vui-date-native',
              type: 'month',
              value: String(props.modelValue || '').slice(0, 7),
              min: props.min ? props.min.slice(0, 7) : undefined,
              max: props.max ? props.max.slice(0, 7) : undefined,
              placeholder: effectivePlaceholder.value,
              'aria-label': accessibleLabel.value || undefined,
              disabled: props.disabled,
              required: props.required,
              onInput: (event: Event) =>
                emitValue((event.target as HTMLInputElement).value)
            }),
            h('span', { class: 'vui-date-icon', 'aria-hidden': 'true' }, [
              h('span', { class: 'vui-date-icon-binding' }),
              h('span', { class: 'vui-date-icon-page' })
            ])
          ]
        );
      }

      return h(
        'div',
        {
          ref: root,
          class: classes('vui-date', incomingClass, {
            'is-range': props.range,
            'is-open': opened.value,
            'is-disabled': props.disabled,
            'is-drop-up': dropUp.value,
            'is-align-right': alignRight.value,
            'is-placeholder': !displayText.value
          }),
          style,
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Escape') close(true);
          }
        },
        [
          h(
            'button',
            {
              ...rest,
              ref: trigger,
              type: 'button',
              class: 'vui-date-trigger',
              disabled: props.disabled,
              role: 'combobox',
              'aria-expanded': String(opened.value),
              'aria-haspopup': 'dialog',
              'aria-required': String(props.required),
              'aria-label': accessibleLabel.value || undefined,
              onClick: toggle,
              onKeydown: (event: KeyboardEvent) => {
                if (
                  !opened.value &&
                  (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  open(true);
                }
              }
            },
            [
              h(
                'span',
                {
                  class: classes('vui-date-value', {
                    'is-placeholder': !displayText.value
                  })
                },
                displayText.value || effectivePlaceholder.value
              ),
              props.allowClear && displayText.value && !props.disabled
                ? h(
                    'span',
                    {
                      class: 'vui-date-clear',
                      role: 'button',
                      tabindex: 0,
                      'aria-label': '清除日期',
                      onMousedown: (event: MouseEvent) => event.preventDefault(),
                      onClick: clearValue,
                      onKeydown: (event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') clearValue(event);
                      }
                    },
                    h(VIcon, { type: 'close' })
                  )
                : h('span', { class: 'vui-date-icon', 'aria-hidden': 'true' }, [
                    h('span', { class: 'vui-date-icon-binding' }),
                    h('span', { class: 'vui-date-icon-page' })
                  ])
            ]
          ),
          opened.value ? h(Teleport, { to: 'body' }, [renderCalendar()]) : null
        ]
      );
    };
  }
});

/** 在两个互斥状态之间切换。 @category form */
export const VSwitch = defineComponent({
  name: 'VSwitch',
  inheritAttrs: false,
  props: {
    /** 当前开关值。 */
    modelValue: { type: [Boolean, String, Number], default: false },
    /** 是否禁止切换。 */
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const checked = computed(() => props.modelValue === true || props.modelValue === 1 || props.modelValue === '1');
    const toggle = () => {
      if (props.disabled) return;
      const next = !checked.value;
      emit('update:modelValue', next);
      emit('change', next);
    };
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      return h(
        'button',
        {
          ...rest,
          type: 'button',
          role: 'switch',
          'aria-checked': checked.value,
          disabled: props.disabled,
          class: classes('vui-switch', incomingClass, {
            'is-checked': checked.value,
            'is-disabled': props.disabled
          }),
          onClick: toggle
        },
        h('span', { class: 'vui-switch-thumb' })
      );
    };
  }
});

/** 管理一组互斥单选项的值。 @category form @event update:modelValue :: string | number | boolean :: 更新后的单选值 @event change :: string | number | boolean :: 单选变更 */
export const VRadioGroup = defineComponent({
  name: 'VRadioGroup',
  inheritAttrs: false,
  props: {
    /** 当前选中值。 */
    modelValue: { type: null, default: '' },
    /** 是否禁止组内所有选项。 */
    disabled: { type: Boolean, default: false },
    /** 无需插槽时使用的结构化选项。 */
    options: {
      type: Array as PropType<Array<{ label: string; value: unknown; disabled?: boolean }>>,
      default: () => []
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit, slots }) {
    const attrs = useAttrs();
    const value = computed(() => props.modelValue);
    provide(VUI_RADIO_KEY, {
      value,
      update: (next) => {
        emit('update:modelValue', next);
        emit('change', next);
      }
    });
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      const content = slots.default?.();
      return h(
        'div',
        { ...rest, class: classes('vui-radio-group', incomingClass), role: 'radiogroup' },
        content?.length
          ? content
          : props.options.map((option) => h(
              VRadio,
              { value: option.value, disabled: props.disabled || option.disabled },
              { default: () => option.label }
            ))
      );
    };
  }
});

/** 在有限选项中选择一个值。 @category form */
export const VRadio = defineComponent({
  name: 'VRadio',
  inheritAttrs: false,
  props: {
    /** 当前单选项代表的值。 */
    value: { type: null, default: '' },
    /** 是否禁止选择当前项。 */
    disabled: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const group = inject(VUI_RADIO_KEY, undefined);
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      return h('label', {
        class: classes('vui-radio', incomingClass, {
          'is-disabled': props.disabled
        }),
        'aria-disabled': props.disabled || undefined
      }, [
        h('input', {
          ...rest,
          type: 'radio',
          checked: group?.value.value === props.value,
          disabled: props.disabled,
          onChange: () => group?.update(props.value)
        }),
        h('span', { class: 'vui-radio-dot' }),
        h('span', { class: 'vui-radio-label' }, slots.default?.())
      ]);
    };
  }
});

/** 展示状态、分类或可移除关键词。 @category data */
export const VTag = defineComponent({
  name: 'VTag',
  inheritAttrs: false,
  props: {
    /** 标签的语义色类型。 */
    type: { type: String, default: 'default' },
    /** 是否展示移除按钮。 */
    closable: { type: Boolean, default: false },
    /** 是否禁止移除操作。 */
    disabled: { type: Boolean, default: false }
  },
  emits: ['close'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      return h(
        'span',
        {
          ...rest,
          class: classes('vui-tag', `is-${props.type}`, incomingClass, {
            'is-disabled': props.disabled
          })
        },
        [
          slots.default?.(),
          props.closable
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'vui-tag-close',
                  disabled: props.disabled,
                  'aria-label': '关闭',
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation();
                    emit('close', event);
                  }
                },
                [h(VIcon, { type: 'close' })]
              )
            : null
        ]
      );
    };
  }
});

/** 输入和维护一组标签值。 @category form */
export const VTagInput = defineComponent({
  name: 'VTagInput',
  inheritAttrs: false,
  props: {
    /** 当前标签值集合。 */
    modelValue: { type: Array as PropType<unknown[]>, default: () => [] },
    /** 是否允许清空全部标签。 */
    allowClear: { type: Boolean, default: false },
    /** 是否禁止新增标签但允许查看现有值。 */
    disabledInput: { type: Boolean, default: false },
    /** 是否禁止全部交互。 */
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const draft = ref('');
    const tagLabel = (value: unknown) => {
      if (value && typeof value === 'object' && 'label' in value) {
        return String((value as { label?: unknown }).label ?? '');
      }
      return displayValue(value);
    };
    const update = (next: unknown[]) => {
      emit('update:modelValue', next);
      emit('change', next);
    };
    const append = () => {
      const value = draft.value.trim();
      if (!value) return;
      update([...props.modelValue, value]);
      draft.value = '';
    };
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          class: classes('vui-tag-input', incomingClass, {
            'is-disabled': props.disabled
          }),
          style,
          'aria-disabled': props.disabled || undefined
        },
        [
          ...props.modelValue.map((value, index) =>
            h('span', { class: 'vui-tag-input-item', key: `${displayValue(value)}-${index}` }, [
              tagLabel(value),
              !props.disabled
                ? h('button', {
                    type: 'button',
                    'aria-label': '移除',
                    onClick: () => update(props.modelValue.filter((_, itemIndex) => itemIndex !== index))
                  }, h(VIcon, { type: 'close' }))
                : null
            ])
          ),
          !props.disabledInput
            ? h('input', {
                ...rest,
                value: draft.value,
                disabled: props.disabled,
                onInput: (event: Event) => {
                  draft.value = (event.target as HTMLInputElement).value;
                },
                onKeydown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    append();
                  }
                },
                onBlur: append
              })
            : null,
          props.allowClear && props.modelValue.length && !props.disabled
            ? h('button', { type: 'button', class: 'vui-tag-clear', onClick: () => update([]) }, '清空')
            : null
        ]
      );
    };
  }
});
