/**
 * @vima-tech/ui-admin · 补充型表单与操作组件
 *
 * 这些组件是模板 DSL 已声明、但原始提取层没有实现的基础能力。
 * 独立成手写文件，避免 npm run extract 覆盖。
 */
import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  useAttrs,
  type InjectionKey,
  type PropType,
  type Ref
} from 'vue';

import { classes } from '../utils';
import { VIcon } from './icons';

type CheckboxValue = string | number | boolean;
interface CheckboxOption {
  label: string;
  value: CheckboxValue;
  disabled?: boolean;
}

interface CheckboxGroupContext {
  value: Ref<CheckboxValue[]>;
  disabled: boolean;
  update: (value: CheckboxValue, checked: boolean) => void;
}

const CHECKBOX_GROUP_KEY: InjectionKey<CheckboxGroupContext> = Symbol('VuiCheckboxGroup');

/** 管理一组多选项的值。 @category form @props modelValue::当前选中的值数组;disabled::是否禁用整组;options::可选项列表 */
export const VCheckboxGroup = defineComponent({
  name: 'VCheckboxGroup',
  inheritAttrs: false,
  props: {
    modelValue: { type: Array as PropType<CheckboxValue[]>, default: () => [] },
    disabled: { type: Boolean, default: false },
    options: { type: Array as PropType<CheckboxOption[]>, default: () => [] }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit, slots }) {
    const attrs = useAttrs();
    const value = computed(() => props.modelValue);
    provide(CHECKBOX_GROUP_KEY, {
      value,
      get disabled() {
        return props.disabled;
      },
      update: (item, checked) => {
        if (props.disabled) return;
        const next = checked
          ? [...props.modelValue.filter((value) => !Object.is(value, item)), item]
          : props.modelValue.filter((value) => !Object.is(value, item));
        emit('update:modelValue', next);
        emit('change', next);
      }
    });
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      const content = slots.default?.();
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-checkbox-group', incomingClass, { 'is-disabled': props.disabled }),
          role: 'group',
          'aria-disabled': props.disabled || undefined
        },
          content?.length
            ? content
            : props.options.map((option) => h(
                VCheckbox,
                { value: option.value, label: option.label, disabled: option.disabled },
              ))
      );
    };
  }
});

/** 在有限选项中切换单个多选状态。 @category form @props modelValue::独立使用时的当前值;value::在复选框组中的选项值;label::选项显示文字;disabled::是否禁用;indeterminate::是否显示半选态;trueValue::选中时写入的值;falseValue::未选中时写入的值 @event update:modelValue :: PropValue :: 更新后的独立复选值 @event change :: PropValue :: 值变更 */
export const VCheckbox = defineComponent({
  name: 'VCheckbox',
  inheritAttrs: false,
  props: {
    modelValue: { type: null, default: false },
    value: { type: [String, Number, Boolean] as PropType<CheckboxValue>, default: '' },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    trueValue: { type: null, default: true },
    falseValue: { type: null, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit, slots }) {
    const attrs = useAttrs();
    const group = inject(CHECKBOX_GROUP_KEY, undefined);
    const checked = computed(() => group
      ? group.value.value.some((value) => Object.is(value, props.value))
      : Object.is(props.modelValue, props.trueValue));
    const isDisabled = computed(() => props.disabled || group?.disabled || false);
    const update = (nextChecked: boolean) => {
      if (isDisabled.value) return;
      if (group) {
        group.update(props.value, nextChecked);
        return;
      }
      const next = nextChecked ? props.trueValue : props.falseValue;
      emit('update:modelValue', next);
      emit('change', next);
    };

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const mixed = props.indeterminate && !checked.value;
      return h(
        'label',
        {
          class: classes('vui-checkbox', incomingClass, {
            'is-checked': checked.value,
            'is-indeterminate': mixed,
            'is-disabled': isDisabled.value
          }),
          style,
          'aria-disabled': isDisabled.value || undefined
        },
        [
          h('input', {
            ...rest,
            class: 'vui-checkbox-input',
            type: 'checkbox',
            checked: checked.value,
            disabled: isDisabled.value,
            'aria-checked': mixed ? 'mixed' : String(checked.value),
            onChange: (event: Event) => update((event.target as HTMLInputElement).checked)
          }),
          h('span', { class: 'vui-checkbox-box', 'aria-hidden': 'true' }, [
            mixed ? h('span', { class: 'vui-checkbox-mixed' }) : h(VIcon, { type: 'check' })
          ]),
          props.label || slots.default
            ? h('span', { class: 'vui-checkbox-label' }, slots.default?.() || props.label)
            : null
        ]
      );
    };
  }
});

/** 输入或选择一天中的时间。 @category form @props modelValue::HH:mm 格式的当前时间;min::允许选择的最早时间;max::允许选择的最晚时间;step::分钟步长;disabled::是否禁用;readonly::是否只读;clearable::是否允许清空 */
export const VTimePicker = defineComponent({
  name: 'VTimePicker',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    min: { type: String, default: '' },
    max: { type: String, default: '' },
    step: { type: [Number, String], default: 60 },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'change', 'focus', 'blur', 'clear'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const update = (value: string) => emit('update:modelValue', value);
    const clear = () => {
      update('');
      emit('change', '');
      emit('clear');
    };
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'span',
        {
          class: classes('vui-time-picker', incomingClass, {
            'is-disabled': props.disabled,
            'is-readonly': props.readonly
          }),
          style
        },
        [
          h(VIcon, { class: 'vui-time-picker-icon', type: 'clock' }),
          h('input', {
            ...rest,
            class: 'vui-time-picker-input',
            type: 'time',
            value: props.modelValue,
            min: props.min || undefined,
            max: props.max || undefined,
            step: props.step,
            disabled: props.disabled,
            readonly: props.readonly,
            onInput: (event: Event) => update((event.target as HTMLInputElement).value),
            onChange: (event: Event) => emit('change', (event.target as HTMLInputElement).value),
            onFocus: (event: FocusEvent) => emit('focus', event),
            onBlur: (event: FocusEvent) => emit('blur', event)
          }),
          props.clearable && props.modelValue && !props.disabled && !props.readonly
            ? h('button', { type: 'button', class: 'vui-time-picker-clear', 'aria-label': '清除时间', onClick: clear }, [
                h(VIcon, { type: 'close' })
              ])
            : null
        ]
      );
    };
  }
});

/** 页面导航或低强调文字操作。 @category navigation @props href::目标地址;target::链接打开方式;type::链接语义类型;underline::悬停时是否显示下划线;disabled::是否禁用;download::是否作为下载链接 */
export const VLink = defineComponent({
  name: 'VLink',
  inheritAttrs: false,
  props: {
    href: { type: String, default: '' },
    target: { type: String as PropType<'_self' | '_blank' | '_parent' | '_top'>, default: '_self' },
    type: { type: String, default: 'default' },
    underline: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    download: { type: [Boolean, String], default: false }
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, ...rest } = attrs;
      return h(
        'a',
        {
          ...rest,
          class: classes('vui-link', `is-${props.type}`, incomingClass, {
            'is-underline': props.underline,
            'is-disabled': props.disabled
          }),
          href: props.disabled ? undefined : props.href || undefined,
          target: props.target,
          rel: props.target === '_blank' ? 'noopener noreferrer' : undefined,
          download: props.download || undefined,
          tabindex: props.disabled ? -1 : undefined,
          'aria-disabled': props.disabled || undefined,
          onClick: (event: MouseEvent) => {
            if (props.disabled) {
              event.preventDefault();
              return;
            }
            emit('click', event);
          }
        },
        slots.default?.()
      );
    };
  }
});
