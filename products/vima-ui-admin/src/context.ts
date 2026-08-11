import type { InjectionKey, Ref } from 'vue';

export interface VuiFormContext {
  model: Record<string, unknown>;
  required: boolean;
  rules: Record<string, Array<Record<string, unknown>>>;
  labelWidth: string | number;
  layout: 'horizontal' | 'vertical' | 'inline';
  register: (field: VuiFormField) => void;
  unregister: (field: VuiFormField) => void;
}

export interface VuiFormField {
  prop: string;
  validate: () => Promise<void>;
  clear: () => void;
}

export interface VuiFormItemContext {
  readonly label: string;
}

export interface VuiRadioContext {
  value: Ref<unknown>;
  update: (value: unknown) => void;
}

export const VUI_FORM_KEY: InjectionKey<VuiFormContext> = Symbol('VuiForm');
export const VUI_FORM_ITEM_KEY: InjectionKey<VuiFormItemContext> = Symbol('VuiFormItem');
export const VUI_RADIO_KEY: InjectionKey<VuiRadioContext> = Symbol('VuiRadio');
