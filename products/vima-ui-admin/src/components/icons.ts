import { defineComponent, h, useAttrs, type PropType } from 'vue';
import { classes, mergeStyles } from '../utils';

/**
 * SVG 图标统一注册表。
 *
 * 图标只使用描边路径并继承 currentColor，组件和文档站不再各自维护字符/emoji。
 * 业务侧可通过 registerIcon 注册同一 24×24 坐标系的自定义图标。
 */
export type IconDefinition = readonly string[];

const icons: Record<string, IconDefinition> = {
  alert: ['M12 3 2.5 20h19L12 3Z', 'M12 9v4', 'M12 17h.01'],
  app: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
  'arrow-down': ['M12 5v14', 'm19 12-7 7-7-7'],
  'arrow-left': ['M19 12H5', 'm12 19-7-7 7-7'],
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'arrow-up': ['M12 19V5', 'm5 12 7-7 7 7'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  building: ['M4 21V5l8-3v19M12 8h8v13M8 7h.01M8 11h.01M8 15h.01M16 11h.01M16 15h.01M2 21h20'],
  button: ['M5 7h14a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z', 'M9 12h6'],
  calendar: ['M4 5h16v16H4z', 'M8 3v4M16 3v4M4 10h16'],
  'chart-bar': ['M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M2 20h20'],
  check: ['m5 12 4 4L19 6'],
  'check-circle': ['M22 11.1V12a10 10 0 1 1-5.9-9.1', 'm22 4-10 10-3-3'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-up': ['m18 15-6-6-6 6'],
  circle: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  close: ['M6 6l12 12M18 6 6 18'],
  cloud: ['M17.5 19H6a4 4 0 0 1-.6-8 6.5 6.5 0 0 1 12.4-2A5 5 0 0 1 17.5 19Z'],
  columns: ['M3 4h18v16H3z', 'M12 4v16'],
  copy: ['M8 8h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8Z', 'M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3'],
  database: ['M20 5c0 1.7-3.6 3-8 3S4 6.7 4 5s3.6-3 8-3 8 1.3 8 3Z', 'M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5', 'M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'],
  divider: ['M3 12h18'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 21h16'],
  'drag-handle': ['M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01'],
  edit: ['M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z'],
  eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  'eye-off': ['m3 3 18 18', 'M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a14.7 14.7 0 0 1-2.1 2.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8'],
  'external-link': ['M14 4h6v6', 'm20 4-9 9', 'M18 13v7H4V6h7'],
  file: ['M6 2h8l4 4v16H6z', 'M14 2v5h5'],
  'file-text': ['M6 2h8l4 4v16H6z', 'M14 2v5h5M9 13h6M9 17h6'],
  flask: ['M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3', 'M7.5 16h9'],
  filter: ['M3 5h18l-7 8v6l-4 2v-8L3 5Z'],
  folder: ['M3 5h7l2 3h9v12H3z'],
  form: ['M5 3h14v18H5z', 'M8 8h8M8 12h8M8 16h5'],
  fullscreen: ['M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5'],
  'fullscreen-exit': ['M9 3v6H3M15 3v6h6M21 15h-6v6M3 15h6v6'],
  home: ['m3 11 9-8 9 8v10h-6v-6H9v6H3z'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'],
  'help-circle': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01'],
  image: ['M3 4h18v16H3z', 'M8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'm3 17 5-5 4 4 3-3 6 6'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v6M12 7h.01'],
  layout: ['M3 4h18v16H3z', 'M3 9h18M9 9v11'],
  link: ['M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1', 'M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1'],
  list: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  'log-in': ['M15 3h5v18h-5', 'M10 17l5-5-5-5M15 12H3'],
  'log-out': ['M9 3H4v18h5', 'm14 17 5-5-5-5M19 12H7'],
  lock: ['M5 10h14v11H5z', 'M8 10V7a4 4 0 0 1 8 0v3'],
  mail: ['M3 5h18v14H3z', 'm3 6 9 7 9-7'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  minus: ['M5 12h14'],
  'minus-circle': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M8 12h8'],
  monitor: ['M3 4h18v13H3zM8 21h8M12 17v4'],
  'more-vertical': ['M12 5h.01M12 12h.01M12 19h.01'],
  package: ['m12 2 9 5-9 5-9-5 9-5Z', 'm3 7 9 5 9-5M3 7v10l9 5 9-5V7M12 12v10'],
  paperclip: ['m20 11-8.5 8.5a5 5 0 0 1-7-7L14 3a3.5 3.5 0 0 1 5 5l-9.5 9.5a2 2 0 0 1-3-3L15 6'],
  pause: ['M8 5v14M16 5v14'],
  phone: ['M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2A16 16 0 0 1 3 5c0-1 1-2 2-2Z'],
  play: ['m8 5 11 7-11 7V5Z'],
  plus: ['M12 5v14M5 12h14'],
  printer: ['M6 9V3h12v6M6 18H4V9h16v9h-2M6 14h12v7H6z'],
  refresh: ['M20 7v5h-5M4 17v-5h5', 'M18.5 9A7 7 0 0 0 6 6l-2 3M5.5 15A7 7 0 0 0 18 18l2-3'],
  redo: ['M20 7h-7a7 7 0 0 0-7 7v3', 'm16 3 4 4-4 4'],
  save: ['M4 3h14l2 2v16H4z', 'M8 3v6h8V3M8 21v-7h8v7'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm17 17 4 4'],
  server: ['M4 4h16v6H4zM4 14h16v6H4z', 'M8 7h.01M8 17h.01'],
  settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z'],
  shield: ['M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z'],
  'shield-check': ['M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z', 'm8 12 3 3 5-6'],
  sort: ['M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4'],
  star: ['m12 2 3 6 7 .9-5 4.8 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.8L9 8l3-6Z'],
  table: ['M3 4h18v16H3zM3 9h18M3 14h18M9 4v16M15 4v16'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'],
  text: ['M4 6V3h16v3M12 3v18M8 21h8'],
  trash: ['M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6'],
  undo: ['M4 7h7a7 7 0 0 1 7 7v3', 'm8 3-4 4 4 4'],
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 20h16'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0'],
  'user-plus': ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M19 8v6M16 11h6'],
  users: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 7M18 14a6 6 0 0 1 4 6'],
  unlock: ['M5 10h14v11H5z', 'M16 10V7a4 4 0 0 0-7.5-2'],
  'zoom-in': ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm17 17 4 4M8 11h6M11 8v6'],
  'zoom-out': ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm17 17 4 4M8 11h6']
};

const aliases: Record<string, string> = {
  addition: 'plus',
  down: 'chevron-down',
  left: 'chevron-left',
  right: 'chevron-right',
  'screen-full': 'fullscreen',
  'screen-restore': 'fullscreen-exit',
  'triangle-d': 'chevron-down',
  username: 'user'
};

export function normalizeIconName(type: string): string {
  const key = type.replace(/^layui-icon-/, '');
  return aliases[key] || key;
}

export function registerIcon(name: string, definition: IconDefinition): void {
  if (!/^[a-z][a-z0-9-]*$/.test(name) || !definition.length) {
    throw new Error('图标名称必须是小写短横线格式，且路径不能为空');
  }
  if (definition.some((path) => !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(path))) {
    throw new Error('图标路径包含无效字符');
  }
  icons[name] = [...definition];
}

export function hasIcon(name: string): boolean {
  return Boolean(icons[normalizeIconName(name)]);
}

export function getIconNames(): string[] {
  return Object.keys(icons).sort();
}

export function iconSvgMarkup(name: string, className = 'vui-icon'): string {
  const key = normalizeIconName(name);
  const definition = icons[key] || icons.info;
  const safeClass = className.replace(/[^a-zA-Z0-9 _-]/g, '');
  const paths = definition.map((d) => `<path d="${d}"></path>`).join('');
  return `<svg class="${safeClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

/** 从统一 SVG 注册表渲染图标。 @category icon @props type::兼容旧调用的图标名或别名;name::注册表中的规范图标名;color::图标颜色，默认继承 currentColor;size::图标尺寸;title::无障碍标题，提供后图标不再隐藏 */
export const VIcon = defineComponent({
  name: 'VIcon',
  inheritAttrs: false,
  props: {
    type: { type: String, default: '' },
    name: { type: String, default: '' },
    color: { type: String, default: '' },
    size: { type: [Number, String] as PropType<number | string>, default: '1em' },
    title: { type: String, default: '' }
  },
  setup(props) {
    const attrs = useAttrs();
    return () => {
      const key = normalizeIconName(props.name || props.type);
      const definition = icons[key] || icons.info;
      const size = typeof props.size === 'number' ? `${props.size}px` : props.size;
      const { class: incomingClass, style: incomingStyle, ...rest } = attrs;
      return h(
        'svg',
        {
          ...rest,
          class: classes('vui-icon', key ? `vui-icon-${key}` : '', incomingClass),
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': props.title ? undefined : 'true',
          role: props.title ? 'img' : undefined,
          style: mergeStyles(props.color ? { color: props.color } : undefined, incomingStyle as never)
        },
        [props.title ? h('title', props.title) : null, ...definition.map((d) => h('path', { d }))]
      );
    };
  }
});
