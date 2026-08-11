/**
 * @vima-tech/ui-admin · 入口
 *
 * 创建日期: 2026-08-10
 *
 * 用法：
 *   import VimaUiAdmin from '@vima-tech/ui-admin'
 *   import '@vima-tech/ui-admin/style.css'   // 令牌 + 组件样式，一并引入
 *   app.use(VimaUiAdmin)
 *
 * 组件也可以按名引入，不装插件：
 *   import { VTable, VButton } from '@vima-tech/ui-admin'
 */
import type { App, Component } from 'vue';

import {
  VAvatar,
  VAvatarGroup,
  VBadge,
  VBreadcrumb,
  VBreadcrumbItem,
  VBody,
  VButton,
  VButtonGroup,
  VCard,
  VCol,
  VContainer,
  VDivider,
  VFullscreen,
  VHeader,
  VIcon,
  VLayout,
  VProgress,
  VRow,
  VSide,
  VUpload
} from './components/basic';
import {
  VDatePicker,
  VForm,
  VFormItem,
  VInput,
  VInputNumber,
  VRadio,
  VRadioGroup,
  VSelect,
  VSelectOption,
  VSwitch,
  VTag,
  VTagInput,
  VTextarea
} from './components/form';
import {
  VCountdown,
  VCollapse,
  VCollapseItem,
  VDescriptions,
  VDescriptionsItem,
  VPagination,
  VStatistic,
  VStep,
  VSteps,
  VTab,
  VTabItem,
  VTable,
  VTree
} from './components/data';
import { VDropdown, VDropdownMenu, VDropdownMenuItem, VDrawer, VLayer, VPopover, VTooltip } from './components/overlay';
// 本库自己写的组件（上游 ui-v3 没有），见各文件顶部说明
import { VAlert, VEmpty, VLoading, VSkeleton, message, messageBox } from './components/feedback';
import { VColumnSetting } from './components/columnSetting';
import { VCheckbox, VCheckboxGroup, VLink, VTimePicker } from './components/selection';
import { registerComponents as registerTemplateComponents } from './template/renderer';
import { createTemplateComponentMap } from './template/contracts';
import { VTemplateEditor } from './template/VTemplateEditor';
export { getIconNames, hasIcon, iconSvgMarkup, normalizeIconName, registerIcon } from './components/icons';
export type { IconDefinition } from './components/icons';

export const components: Component[] = [
  VAlert,
  VAvatar,
  VAvatarGroup,
  VBadge,
  VBreadcrumb,
  VBreadcrumbItem,
  VBody,
  VColumnSetting,
  VButton,
  VButtonGroup,
  VCard,
  VCheckbox,
  VCheckboxGroup,
  VCol,
  VCollapse,
  VCollapseItem,
  VContainer,
  VCountdown,
  VDatePicker,
  VDescriptions,
  VDescriptionsItem,
  VDivider,
  VDrawer,
  VDropdown,
  VDropdownMenu,
  VDropdownMenuItem,
  VEmpty,
  VForm,
  VFormItem,
  VFullscreen,
  VHeader,
  VIcon,
  VInput,
  VInputNumber,
  VLayer,
  VLayout,
  VLoading,
  VLink,
  VPagination,
  VPopover,
  VProgress,
  VRadio,
  VRadioGroup,
  VRow,
  VSelect,
  VSelectOption,
  VSide,
  VSkeleton,
  VStatistic,
  VStep,
  VSteps,
  VSwitch,
  VTab,
  VTabItem,
  VTable,
  VTag,
  VTagInput,
  VTimePicker,
  VTextarea,
  VTooltip,
  VTree,
  VUpload,
  VTemplateEditor
];

// 模板渲染器默认使用本包组件；业务侧仍可通过 config.componentMap 覆盖。
registerTemplateComponents(createTemplateComponentMap({
  VAlert,
  VBadge,
  VButton,
  VButtonGroup,
  VCard,
  VCheckbox,
  VCheckboxGroup,
  VCol,
  VContainer,
  VDatePicker,
  VDescriptions,
  VDescriptionsItem,
  VDivider,
  VDrawer,
  VDropdown,
  VEmpty,
  VForm,
  VFormItem,
  VIcon,
  VInput,
  VInputNumber,
  VLayer,
  VLink,
  VLoading,
  VPagination,
  VPopover,
  VProgress,
  VRadio,
  VRadioGroup,
  VRow,
  VSelect,
  VStatistic,
  VSwitch,
  VTable,
  VTag,
  VTagInput,
  VTextarea,
  VTimePicker,
  VTooltip,
  VTree,
  VUpload
}));

export const VimaUiAdmin = {
  install(app: App) {
    components.forEach((component) => {
      if (component.name) app.component(component.name, component);
    });
  }
};

export {
  VAlert,
  VAvatar,
  VAvatarGroup,
  VBadge,
  VBreadcrumb,
  VBreadcrumbItem,
  VBody,
  VColumnSetting,
  VButton,
  VButtonGroup,
  VCard,
  VCheckbox,
  VCheckboxGroup,
  VCol,
  VCollapse,
  VCollapseItem,
  VContainer,
  VCountdown,
  VDatePicker,
  VDescriptions,
  VDescriptionsItem,
  VDivider,
  VDrawer,
  VDropdown,
  VDropdownMenu,
  VDropdownMenuItem,
  VEmpty,
  VForm,
  VFormItem,
  VFullscreen,
  VHeader,
  VIcon,
  VInput,
  VInputNumber,
  VLayer,
  VLayout,
  VLoading,
  VLink,
  VPagination,
  VPopover,
  VProgress,
  VRadio,
  VRadioGroup,
  VRow,
  VSelect,
  VSelectOption,
  VSide,
  VSkeleton,
  VStatistic,
  VStep,
  VSteps,
  VSwitch,
  VTab,
  VTabItem,
  VTable,
  VTag,
  VTagInput,
  VTimePicker,
  VTextarea,
  VTooltip,
  VTree,
  VUpload,
  message,
  messageBox
};

export { layer } from './layer';
export type { LayerButton, LayerIndex, LayerOptions } from './layer';
export * from './components/columnWidth';
export * from './context';
export * from './utils';
export * from './ai-friendly';
export * from './template';

export default VimaUiAdmin;
