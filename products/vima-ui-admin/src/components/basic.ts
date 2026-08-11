import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  useAttrs,
  type PropType
} from 'vue';
import { classes, mergeStyles } from '../utils';
import { VIcon } from './icons';

export { VIcon } from './icons';

function passthroughAttrs(attrs: Record<string, unknown>, ownClass: unknown, style?: unknown) {
  const { class: incomingClass, style: incomingStyle, ...rest } = attrs;
  return {
    ...rest,
    class: classes(ownClass, incomingClass),
    style: mergeStyles(style as never, incomingStyle as never)
  };
}

/** 页面内容容器。 @category layout */
export const VContainer = defineComponent({
  name: 'VContainer',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () =>
      h('main', passthroughAttrs(attrs, ['vui-container']), slots.default?.());
  }
});

/** 24 栅格中的行容器。 @category layout @props gutter::列间距（像素）;justify::主轴对齐方式;align::交叉轴对齐方式 */
export const VRow = defineComponent({
  name: 'VRow',
  inheritAttrs: false,
  props: {
    gutter: { type: [Number, String], default: 12 },
    justify: {
      type: String as PropType<'start' | 'center' | 'end' | 'space-between' | 'space-around'>,
      default: 'start'
    },
    align: { type: String as PropType<'top' | 'middle' | 'bottom'>, default: 'top' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const justifyContent = computed(() => ({
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      'space-between': 'space-between',
      'space-around': 'space-around'
    })[props.justify]);
    const alignItems = computed(() => ({ top: 'flex-start', middle: 'center', bottom: 'flex-end' })[props.align]);
    return () => h(
      'div',
      passthroughAttrs(attrs, ['vui-row'], {
        '--vui-row-gutter': `${Math.max(0, Number(props.gutter) || 0)}px`,
        justifyContent: justifyContent.value,
        alignItems: alignItems.value
      }),
      slots.default?.()
    );
  }
});

/** 24 栅格中的列。 @category layout @props md::中等屏幕默认占用栅格数;span::占用的 24 栅格数;offset::左侧偏移栅格数 */
export const VCol = defineComponent({
  name: 'VCol',
  inheritAttrs: false,
  props: {
    md: { type: [Number, String], default: 24 },
    span: { type: [Number, String], default: undefined },
    offset: { type: [Number, String], default: 0 }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const span = computed(() => Math.min(24, Math.max(1, Number(props.span ?? props.md) || 24)));
    const offset = computed(() => Math.min(23, Math.max(0, Number(props.offset) || 0)));
    return () =>
      h(
        'div',
        passthroughAttrs(
          attrs,
          ['vui-col'],
          {
            '--vui-col-span': span.value,
            marginLeft: offset.value ? `${offset.value / 24 * 100}%` : undefined
          }
        ),
        slots.default?.()
      );
  }
});

/** 承载后台页面信息区块的卡片。 @category layout @props title::卡片标题;shadow::阴影显示策略 */
export const VCard = defineComponent({
  name: 'VCard',
  inheritAttrs: false,
  props: {
    title: { type: String, default: '' },
    shadow: { type: String as PropType<'always' | 'hover' | 'never'>, default: 'always' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () =>
      h('section', passthroughAttrs(attrs, ['vui-card', `is-shadow-${props.shadow}`]), [
        props.title || slots.title || slots.extra
          ? h('header', { class: ['vui-card-header'] }, [
              h('div', { class: 'vui-card-title' }, slots.title?.() || props.title),
              slots.extra ? h('div', { class: 'vui-card-extra' }, slots.extra()) : null
            ])
          : null,
        h('div', { class: ['vui-card-body'] }, slots.default?.())
      ]);
  }
});

/** 触发操作或提交的按钮。 @category basic @props type::按钮语义与视觉类型;size::按钮尺寸;disabled::是否禁用;loading::是否显示加载态;nativeType::原生 button 类型;borderStyle::边框样式，none 为无边框 */
export const VButton = defineComponent({
  name: 'VButton',
  inheritAttrs: false,
  props: {
    type: { type: String, default: 'default' },
    size: { type: String, default: 'md' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    nativeType: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
    borderStyle: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () =>
      h(
        'button',
        {
          ...passthroughAttrs(attrs, [
            'vui-button',
            `vui-button-${props.size}`,
            `vui-button-${props.type}`,
            {
              'is-text': props.type === 'text',
              'is-borderless': props.borderStyle === 'none',
              'is-loading': props.loading
            }
          ]),
          type: props.nativeType,
          disabled: props.disabled || props.loading,
          'aria-busy': props.loading || undefined
        },
        [
          props.loading ? h('span', { class: 'vui-button-spinner', 'aria-hidden': 'true' }) : null,
          slots.default?.()
        ]
      );
  }
});

/** 将相关按钮组织成连续操作组。 @category basic */
export const VButtonGroup = defineComponent({
  name: 'VButtonGroup',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () =>
      h('div', passthroughAttrs(attrs, ['vui-button-group']), slots.default?.());
  }
});

/** 分隔相邻内容区块。 @category layout @props content::分隔线文字;theme::分隔线颜色;direction::水平或垂直方向;contentPosition::文字对齐位置 */
export const VDivider = defineComponent({
  name: 'VDivider',
  inheritAttrs: false,
  props: {
    content: { type: String, default: '' },
    theme: { type: String, default: '' },
    direction: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    contentPosition: { type: String as PropType<'left' | 'center' | 'right'>, default: 'center' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const hasContent = Boolean(props.content || slots.default);
      return h('div', passthroughAttrs(attrs, [
        'vui-divider',
        `is-${props.direction}`,
        `is-content-${props.contentPosition}`
      ]), [
        h('span', { class: 'vui-divider-line', style: props.theme ? { background: props.theme } : undefined }),
        hasContent
          ? h('span', { class: 'vui-divider-content' }, slots.default?.() || props.content)
          : null,
        hasContent
          ? h('span', { class: 'vui-divider-line', style: props.theme ? { background: props.theme } : undefined })
          : null
      ]);
    };
  }
});

/** 展示任务或流程完成进度。 @category data @props percent::完成百分比，范围 0–100;status::进度状态样式 */
export const VProgress = defineComponent({
  name: 'VProgress',
  inheritAttrs: false,
  props: {
    percent: { type: Number, default: 0 },
    status: { type: String, default: '' }
  },
  setup(props) {
    const attrs = useAttrs();
    const normalized = computed(() => Math.min(100, Math.max(0, Number(props.percent) || 0)));
    return () =>
      h('div', passthroughAttrs(attrs, ['vui-progress', `is-${props.status || 'normal'}`]), [
        h('div', { class: 'vui-progress-track' }, [
          h('div', { class: 'vui-progress-bar', style: { width: `${normalized.value}%` } })
        ]),
        h('span', { class: 'vui-progress-label' }, `${normalized.value}%`)
      ]);
  }
});

/** 选择文件并交由业务逻辑上传。 @category form */
export const VUpload = defineComponent({
  name: 'VUpload',
  inheritAttrs: false,
  props: {
    /** 业务上传端点；组件本身只负责文件选择。 */
    url: { type: String, default: '' },
    /** 原生文件类型过滤表达式。 */
    accept: { type: String, default: '' },
    /** accept 的历史拼写兼容属性。 */
    accpet: { type: String, default: '' },
    /** 是否允许一次选择多个文件。 */
    multiple: { type: Boolean, default: false },
    /** 文件选择后的业务处理函数。 */
    beforeUpload: { type: Function as PropType<(files: FileList | File[]) => unknown>, default: undefined }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const input = ref<HTMLInputElement>();
    const choose = () => input.value?.click();
    const onChange = (event: Event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files?.length) props.beforeUpload?.(files);
      if (input.value) input.value.value = '';
    };
    return () =>
      h('div', passthroughAttrs(attrs, ['vui-upload']), [
        h('input', {
          ref: input,
          class: 'vui-upload-input',
          type: 'file',
          accept: props.accept || props.accpet || undefined,
          multiple: props.multiple,
          onChange
        }),
        h(
          'button',
          { type: 'button', class: ['vui-button', 'vui-upload-trigger'], onClick: choose },
          slots.default?.() || ['选择文件']
        )
      ]);
  }
});

/** 为指定元素提供全屏切换能力。 @category utility */
export const VFullscreen = defineComponent({
  name: 'VFullscreen',
  emits: ['fullscreenchange'],
  setup(_, { slots, emit }) {
    const isFullscreen = ref(Boolean(document.fullscreenElement));
    const update = () => {
      isFullscreen.value = Boolean(document.fullscreenElement);
      emit('fullscreenchange', isFullscreen.value);
    };
    const toggle = async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    };
    onMounted(() => document.addEventListener('fullscreenchange', update));
    onBeforeUnmount(() => document.removeEventListener('fullscreenchange', update));
    return () => slots.default?.({ toggle, isFullscreen: isFullscreen.value });
  }
});

/** 后台系统页面骨架的根布局。 @category layout */
export const VLayout = defineComponent({
  name: 'VLayout',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () => h('section', passthroughAttrs(attrs, ['vui-layout']), slots.default?.());
  }
});

/** 后台布局的顶部区域。 @category layout */
export const VHeader = defineComponent({
  name: 'VHeader',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () => h('header', passthroughAttrs(attrs, ['vui-header']), slots.default?.());
  }
});

/** 后台布局的主体区域。 @category layout */
export const VBody = defineComponent({
  name: 'VBody',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () => h('div', passthroughAttrs(attrs, ['vui-body']), slots.default?.());
  }
});

/** 后台布局的侧边区域。 @category layout */
export const VSide = defineComponent({
  name: 'VSide',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () => h('aside', passthroughAttrs(attrs, ['vui-side']), slots.default?.());
  }
});

// ==================== Avatar 头像 ====================

/** 展示用户或实体头像。 @category basic @props size::预设尺寸或像素值;shape::圆形或方形;src::头像图片地址;icon::无图片时的图标名;text::无图片时的文字;color::文字头像背景色;fit::图片 object-fit 方式 */
export const VAvatar = defineComponent({
  name: 'VAvatar',
  inheritAttrs: false,
  props: {
    size: { type: [String, Number], default: 'md' },
    shape: { type: String as PropType<'circle' | 'square'>, default: 'circle' },
    src: { type: String, default: '' },
    icon: { type: String, default: '' },
    text: { type: String, default: '' },
    color: { type: String, default: '' },
    fit: { type: String as PropType<'fill' | 'contain' | 'cover' | 'none' | 'scale-down'>, default: 'cover' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const sizeClass = computed(() => {
      const sizeMap: Record<string, string> = { xs: 'is-xs', sm: 'is-sm', md: 'is-md', lg: 'is-lg', xl: 'is-xl' };
      return sizeMap[String(props.size)] || '';
    });
    const sizeStyle = computed(() => {
      const num = Number(props.size);
      if (!isNaN(num) && num > 0) {
        return { width: `${num}px`, height: `${num}px`, fontSize: `${num * 0.4}px` };
      }
      return {};
    });
    const backgroundColor = computed(() => {
      if (props.color) return props.color;
      if (props.text) {
        const colors = ['#2f73c5', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];
        let hash = 0;
        for (let i = 0; i < props.text.length; i++) {
          hash = props.text.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
      }
      return undefined;
    });
    return () => {
      const { class: incomingClass, style: incomingStyle, ...rest } = attrs;
      const content = slots.default?.() ||
        (props.src
          ? h('img', { src: props.src, alt: '', style: { objectFit: props.fit } })
          : props.text
            ? h('span', { class: 'vui-avatar-text' }, props.text.slice(0, 2))
            : props.icon
              ? h('span', { class: ['vui-icon', props.icon] })
              : h(VIcon, { class: 'vui-avatar-icon', type: 'user' }));
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-avatar', incomingClass, sizeClass.value, `is-${props.shape}`),
          style: mergeStyles(sizeStyle.value, backgroundColor.value ? { backgroundColor: backgroundColor.value } : undefined, incomingStyle as never)
        },
        [content]
      );
    };
  }
});

/** 紧凑展示一组头像。 @category basic @props max::最多展示的头像数，0 表示不限 */
export const VAvatarGroup = defineComponent({
  name: 'VAvatarGroup',
  inheritAttrs: false,
  props: {
    max: { type: [Number, String], default: 0 }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const children = slots.default?.() || [];
      const max = Number(props.max) || 0;
      const visible = max > 0 ? children.slice(0, max) : children;
      const excess = max > 0 ? children.length - max : 0;
      return h(
        'div',
        { ...rest, class: classes('vui-avatar-group', incomingClass), style },
        [
          ...visible,
          excess > 0
            ? h(VAvatar, { class: 'vui-avatar-excess', text: `+${excess}` })
            : null
        ]
      );
    };
  }
});

// ==================== Badge 徽标 ====================

/** 在内容旁展示数量或状态徽标。 @category data @props value::徽标数值或文字;max::数值上限，超出后显示加号;dot::是否仅显示圆点;type::徽标语义类型;showZero::值为零时是否显示;hidden::是否隐藏徽标 */
export const VBadge = defineComponent({
  name: 'VBadge',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: '' },
    max: { type: [String, Number], default: 99 },
    dot: { type: Boolean, default: false },
    type: { type: String as PropType<'primary' | 'success' | 'warning' | 'danger' | 'info'>, default: 'danger' },
    showZero: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const displayValue = computed(() => {
      const num = Number(props.value);
      if (!isNaN(num) && num > Number(props.max)) {
        return `${props.max}+`;
      }
      return String(props.value);
    });
    const shouldShow = computed(() => {
      if (props.hidden) return false;
      if (props.dot) return true;
      if (props.value === '' || props.value === undefined) return false;
      if (props.value === 0 && !props.showZero) return false;
      return true;
    });
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const hasDefault = slots.default;
      if (!hasDefault) {
        return shouldShow.value
          ? h(
              'span',
              {
                ...rest,
                class: classes('vui-badge', 'vui-badge--alone', incomingClass, `vui-badge--${props.type}`, {
                  'is-dot': props.dot
                }),
                style
              },
              props.dot ? undefined : displayValue.value
            )
          : null;
      }
      return h(
        'span',
        { ...rest, class: classes('vui-badge-host', incomingClass), style },
        [
          slots.default?.(),
          shouldShow.value
            ? h(
                'span',
                {
                  class: classes('vui-badge', `vui-badge--${props.type}`, {
                    'is-dot': props.dot
                  })
                },
                props.dot ? undefined : displayValue.value
              )
            : null
        ]
      );
    };
  }
});

// ==================== Breadcrumb 面包屑 ====================

/** 展示当前页面的层级导航路径。 @category navigation @props separator::层级分隔文字;separatorIcon::层级分隔 SVG 图标名 */
export const VBreadcrumb = defineComponent({
  name: 'VBreadcrumb',
  inheritAttrs: false,
  props: {
    separator: { type: String, default: '/' },
    separatorIcon: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'nav',
        {
          ...rest,
          class: classes('vui-breadcrumb', incomingClass),
          style,
          'aria-label': '面包屑导航'
        },
        slots.default?.()
      );
    };
  }
});

/** 面包屑导航中的单个层级。 @category navigation @props to::目标路由或地址;replace::导航时是否替换历史记录 */
export const VBreadcrumbItem = defineComponent({
  name: 'VBreadcrumbItem',
  inheritAttrs: false,
  props: {
    to: { type: [String, Object], default: '' },
    replace: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'span',
        { ...rest, class: classes('vui-breadcrumb-item', incomingClass), style },
        [
          h(
            'a',
            {
              class: 'vui-breadcrumb-link',
              href: typeof props.to === 'string' ? props.to : undefined,
              onClick: (event: MouseEvent) => {
                if (props.to) {
                  event.preventDefault();
                }
              }
            },
            slots.default?.()
          )
        ]
      );
    };
  }
});
