/**
 * @vima-tech/ui-admin · 反馈组件
 *
 * 创建日期: 2026-08-10
 *
 * 注意：本文件组件**手写**，不由 scripts/extract-from-ui-v3.mjs 生成——
 *    上游 ui-v3 没有这些组件，写进 components/basic.ts 那类生成文件会被下次 extract 冲掉。
 *    样式同理，写在 styles/components.css（手写）而不是 styles/ui.css（生成）。
 *
 * 组件分工：
 *   VLoading    —— 内容**已经在**、正在刷新/提交。半透明遮罩盖住原内容，用户还能看见上下文。
 *   VSkeleton   —— 内容**还没有**（首屏）。按形状铺灰块占位，避免白屏和数据到达时的整页跳动。
 *   VAlert      —— 页面内警告提示
 *   VEmpty      —— 空状态占位
 *   message     —— 全局消息提示（函数式调用）
 *   messageBox  —— 确认对话框（函数式调用）
 */
import {
  Teleport,
  computed,
  createVNode,
  defineComponent,
  h,
  ref,
  useAttrs,
  type PropType,
  type VNode
} from 'vue';

import { classes } from '../utils';
import { iconSvgMarkup, VIcon } from './icons';

/** 展示局部或全屏加载状态。 @category feedback @props loading::是否显示加载遮罩 */
export const VLoading = defineComponent({
  name: 'VLoading',
  props: {
    loading: { type: Boolean, default: false },
    /** 遮罩上的文案，留空则只有转圈 */
    text: { type: String, default: '' },
    /** 铺满视口而不是包裹的内容区。此时组件本身不需要有默认插槽 */
    fullscreen: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const mask = () =>
      h(
        'div',
        {
          class: classes('vui-loading-mask', { 'is-fullscreen': props.fullscreen }),
          role: 'status',
          'aria-live': 'polite'
        },
        [h('span', { class: 'vui-spinner' }), props.text ? h('span', props.text) : null]
      );

    return () => {
      // 全屏遮罩挂到 body：留在原地会被祖先的 overflow/transform/z-index 裁掉，
      // 这是「转圈只出现半个」这类问题的常见来源。
      if (props.fullscreen) {
        return h('div', { class: 'vui-loading is-fullscreen-host' }, [
          slots.default?.(),
          props.loading ? h(Teleport, { to: 'body' }, [mask()]) : null
        ]);
      }
      return h(
        'div',
        { class: 'vui-loading', 'aria-busy': props.loading ? 'true' : 'false' },
        [slots.default?.(), props.loading ? mask() : null]
      );
    };
  }
});

/** 骨架形状。写成字面量联合而不是 `typeof 数组[number]`，文档站的 API 抽取才能直接展开它 */
type SkeletonType = 'text' | 'table' | 'card';

/** 在内容加载前展示结构占位。 @category feedback @props loading::是否显示骨架而非真实内容;type::骨架的内容形态 */
export const VSkeleton = defineComponent({
  name: 'VSkeleton',
  props: {
    loading: { type: Boolean, default: false },
    type: { type: String as () => SkeletonType, default: 'text' },
    /** 正文行数 / 表格行数 */
    rows: { type: [Number, String], default: 3 },
    /** 表格骨架的列数 */
    columns: { type: [Number, String], default: 4 },
    /** 关掉扫光动画（长列表里几十个骨架同时扫光会很吵） */
    animated: { type: Boolean, default: true }
  },
  setup(props, { slots }) {
    const rowCount = computed(() => Math.max(1, Number(props.rows) || 1));
    const colCount = computed(() => Math.max(1, Number(props.columns) || 1));
    const bar = (width: string, extra?: string) =>
      h('span', { class: classes('vui-skeleton-bar', extra), style: { width } });

    const body = () => {
      if (props.type === 'table') {
        return [
          h(
            'div',
            { class: 'vui-skeleton-row is-head' },
            Array.from({ length: colCount.value }, () => bar('62%'))
          ),
          ...Array.from({ length: rowCount.value }, () =>
            h(
              'div',
              { class: 'vui-skeleton-row' },
              Array.from({ length: colCount.value }, (_, i) => bar(i === 0 ? '54%' : '78%'))
            )
          )
        ];
      }
      if (props.type === 'card') {
        return [
          h('div', { class: 'vui-skeleton-head' }, [bar('34%', 'is-title')]),
          h(
            'div',
            { class: 'vui-skeleton-body' },
            // 末行短一截，这样一眼能看出是「文字段落」而不是色块
            Array.from({ length: rowCount.value }, (_, i) =>
              bar(i === rowCount.value - 1 ? '58%' : '100%')
            )
          )
        ];
      }
      return [
        bar('34%', 'is-title'),
        ...Array.from({ length: rowCount.value }, (_, i) =>
          bar(i === rowCount.value - 1 ? '58%' : '100%')
        )
      ];
    };

    return () =>
      props.loading
        ? h(
            'div',
            {
              class: classes('vui-skeleton', `is-${props.type}`, { 'is-animated': props.animated }),
              role: 'status',
              'aria-live': 'polite',
              'aria-label': '加载中'
            },
            body()
          )
        : slots.default?.();
  }
});

// ==================== Alert 警告提示 ====================

/** 展示需要持续可见的状态或警告信息。 @category feedback @props type::提示语义类型;title::提示标题;description::补充说明;closable::是否允许关闭;showIcon::是否显示语义 SVG 图标;center::内容是否居中;closeText::自定义关闭文案 */
export const VAlert = defineComponent({
  name: 'VAlert',
  inheritAttrs: false,
  props: {
    type: { type: String as PropType<'info' | 'success' | 'warning' | 'error'>, default: 'info' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    closable: { type: Boolean, default: true },
    showIcon: { type: Boolean, default: false },
    center: { type: Boolean, default: false },
    closeText: { type: String, default: '' }
  },
  emits: ['close'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    const visible = ref(true);
    const iconMap: Record<string, string> = {
      info: 'info',
      success: 'check-circle',
      warning: 'alert',
      error: 'close'
    };
    const handleClose = () => {
      visible.value = false;
      emit('close');
    };
    return () => {
      if (!visible.value) return null;
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-alert', incomingClass, `vui-alert--${props.type}`, {
            'is-center': props.center,
            'has-description': props.description || slots.description
          }),
          style,
          role: 'alert'
        },
        [
          props.showIcon
            ? h(VIcon, { class: 'vui-alert-icon', type: iconMap[props.type] || iconMap.info })
            : null,
          h('div', { class: 'vui-alert-content' }, [
            props.title || slots.title
              ? h('div', { class: 'vui-alert-title' }, slots.title?.() || props.title)
              : null,
            props.description || slots.description
              ? h('div', { class: 'vui-alert-description' }, slots.description?.() || props.description)
              : null
          ]),
          props.closable
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'vui-alert-close',
                  'aria-label': '关闭',
                  onClick: handleClose
                },
                props.closeText || h(VIcon, { type: 'close' })
              )
            : null
        ]
      );
    };
  }
});

// ==================== Empty 空状态 ====================

/** 在集合或页面无数据时展示空状态。 @category feedback @props description::空状态说明;image::自定义图片地址;imageSize::图片尺寸 */
export const VEmpty = defineComponent({
  name: 'VEmpty',
  inheritAttrs: false,
  props: {
    description: { type: String, default: '暂无数据' },
    image: { type: String, default: '' },
    imageSize: { type: [Number, String], default: 0 }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const imageStyle = computed(() => {
      const size = Number(props.imageSize);
      if (size > 0) {
        return { width: `${size}px`, height: `${size}px` };
      }
      return {};
    });
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        { ...rest, class: classes('vui-empty', incomingClass), style },
        [
          h('div', { class: 'vui-empty-image', style: imageStyle.value }, [
            props.image
              ? h('img', { src: props.image, alt: '' })
              : slots.image?.() || h('div', { class: 'vui-empty-default-image' }, [
                  h('svg', { viewBox: '0 0 64 41', xmlns: 'http://www.w3.org/2000/svg' }, [
                    h('path', {
                      d: 'M32 1C15.432 1 1 13.432 1 30s14.432 29 31 29 31-13.432 31-31S48.568 1 32 1zm0 56C17.64 57 6 45.36 6 31S17.64 5 32 5s26 11.64 26 26-11.64 26-26 26z',
                      fill: '#f0f0f0'
                    }),
                    h('circle', { cx: '24', cy: '26', r: '3', fill: '#d8d8d8' }),
                    h('circle', { cx: '40', cy: '26', r: '3', fill: '#d8d8d8' }),
                    h('path', {
                      d: 'M22 36s4 6 10 6 10-6 10-6',
                      stroke: '#d8d8d8',
                      fill: 'none',
                      'stroke-width': '2',
                      'stroke-linecap': 'round'
                    })
                  ])
                ])
          ]),
          h('div', { class: 'vui-empty-description' }, slots.default?.() || props.description),
          slots.footer ? h('div', { class: 'vui-empty-footer' }, slots.footer()) : null
        ]
      );
    };
  }
});

// ==================== Message 消息提示 ====================

type MessageType = 'info' | 'success' | 'warning' | 'error';

interface MessageOptions {
  type?: MessageType;
  content: string;
  duration?: number;
  closable?: boolean;
  icon?: string;
  onClose?: () => void;
}

interface MessageInstance {
  id: string;
  vnode: VNode;
  el: HTMLElement;
  close: () => void;
}

let messageInstances: MessageInstance[] = [];
let messageIdCounter = 0;

function createMessageContainer(): HTMLElement {
  let container = document.querySelector('.vui-message-container') as HTMLElement;
  if (!container) {
    container = document.createElement('div');
    container.className = 'vui-message-container';
    document.body.appendChild(container);
  }
  return container;
}

function removeMessage(instance: MessageInstance) {
  const index = messageInstances.indexOf(instance);
  if (index > -1) {
    messageInstances.splice(index, 1);
    instance.el.classList.add('is-leaving');
    setTimeout(() => {
      instance.el.remove();
    }, 300);
  }
}

export function showMessage(options: MessageOptions | string): { close: () => void } {
  const opts = typeof options === 'string' ? { content: options } : options;
  const id = `message-${++messageIdCounter}`;
  const container = createMessageContainer();

  const iconMap: Record<MessageType, string> = {
    info: 'info',
    success: 'check-circle',
    warning: 'alert',
    error: 'close'
  };

  const type = opts.type || 'info';
  const duration = opts.duration ?? 3000;
  const closable = opts.closable ?? duration === 0;

  const el = document.createElement('div');
  el.className = `vui-message vui-message--${type} is-enter`;
  el.setAttribute('role', 'alert');

  const icon = opts.icon || iconMap[type];
  const contentHtml = `
    <span class="vui-message-icon">${iconSvgMarkup(icon)}</span>
    <span class="vui-message-content">${opts.content}</span>
    ${closable ? `<button type="button" class="vui-message-close" aria-label="关闭">${iconSvgMarkup('close')}</button>` : ''}
  `;
  el.innerHTML = contentHtml;

  container.appendChild(el);

  requestAnimationFrame(() => {
    el.classList.remove('is-enter');
  });

  const instance: MessageInstance = {
    id,
    vnode: createVNode('div'),
    el,
    close: () => removeMessage(instance)
  };

  if (closable) {
    el.querySelector('.vui-message-close')?.addEventListener('click', () => instance.close());
  }

  messageInstances.push(instance);

  if (duration > 0) {
    setTimeout(() => instance.close(), duration);
  }

  if (opts.onClose) {
    const originalClose = instance.close;
    instance.close = () => {
      originalClose();
      opts.onClose?.();
    };
  }

  return { close: () => instance.close() };
}

export const message = {
  info: (content: string, duration?: number) => showMessage({ type: 'info', content, duration }),
  success: (content: string, duration?: number) => showMessage({ type: 'success', content, duration }),
  warning: (content: string, duration?: number) => showMessage({ type: 'warning', content, duration }),
  error: (content: string, duration?: number) => showMessage({ type: 'error', content, duration }),
  open: (options: MessageOptions) => showMessage(options),
  closeAll: () => {
    [...messageInstances].forEach((instance) => instance.close());
  }
};

// ==================== MessageBox 确认框 ====================

type MessageBoxAction = 'confirm' | 'cancel' | 'close';

interface MessageBoxOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | '';
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
  beforeClose?: (action: MessageBoxAction, instance: MessageBoxInstance, done: () => void) => void;
}

interface MessageBoxInstance {
  el: HTMLElement;
  close: (action?: MessageBoxAction) => void;
}

export function showMessageBox(options: MessageBoxOptions | string): Promise<MessageBoxAction> {
  const opts = typeof options === 'string' ? { message: options } : options;
  const title = opts.title || '提示';
  const type = opts.type || '';
  const showCancel = opts.showCancelButton ?? true;
  const showConfirm = opts.showConfirmButton ?? true;
  const confirmText = opts.confirmButtonText || '确定';
  const cancelText = opts.cancelButtonText || '取消';
  const closeOnClickModal = opts.closeOnClickModal ?? true;
  const closeOnPressEscape = opts.closeOnPressEscape ?? true;

  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.className = 'vui-message-box-wrap';

    const iconMap: Record<string, string> = {
      info: 'info',
      success: 'check-circle',
      warning: 'alert',
      error: 'close'
    };

    container.innerHTML = `
      <div class="vui-message-box-mask"></div>
      <div class="vui-message-box" role="dialog" aria-modal="true" tabindex="-1">
        <div class="vui-message-box-header">
          <div class="vui-message-box-title">${title}</div>
          <button type="button" class="vui-message-box-close" aria-label="关闭">${iconSvgMarkup('close')}</button>
        </div>
        <div class="vui-message-box-content">
          ${type ? `<span class="vui-message-box-icon vui-message-box-icon--${type}">${iconSvgMarkup(iconMap[type] || 'info')}</span>` : ''}
          <div class="vui-message-box-message">${opts.message}</div>
        </div>
        <div class="vui-message-box-footer">
          ${showCancel ? `<button type="button" class="vui-button vui-message-box-cancel ${opts.cancelButtonClass || ''}">${cancelText}</button>` : ''}
          ${showConfirm ? `<button type="button" class="vui-button vui-button-primary vui-message-box-confirm ${opts.confirmButtonClass || ''}">${confirmText}</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const box = container.querySelector('.vui-message-box') as HTMLElement;
    const closeBtn = container.querySelector('.vui-message-box-close') as HTMLButtonElement;
    const cancelBtn = container.querySelector('.vui-message-box-cancel') as HTMLButtonElement;
    const confirmBtn = container.querySelector('.vui-message-box-confirm') as HTMLButtonElement;
    const mask = container.querySelector('.vui-message-box-mask') as HTMLElement;

    let closed = false;

    const close = (action: MessageBoxAction = 'close') => {
      if (closed) return;

      const done = () => {
        closed = true;
        container.classList.add('is-leaving');
        setTimeout(() => {
          container.remove();
          resolve(action);
        }, 200);
      };

      if (opts.beforeClose) {
        opts.beforeClose(action, instance, done);
      } else {
        done();
      }
    };

    const instance: MessageBoxInstance = {
      el: container,
      close
    };

    closeBtn?.addEventListener('click', () => close('close'));
    cancelBtn?.addEventListener('click', () => close('cancel'));
    confirmBtn?.addEventListener('click', () => close('confirm'));

    if (closeOnClickModal) {
      mask?.addEventListener('click', () => close('close'));
    }

    if (closeOnPressEscape) {
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          close('close');
          document.removeEventListener('keydown', onKeydown);
        }
      };
      document.addEventListener('keydown', onKeydown);
    }

    requestAnimationFrame(() => box?.focus());
  });
}

export const messageBox = {
  alert: (message: string, title?: string, options?: Partial<MessageBoxOptions>) =>
    showMessageBox({ ...options, message, title, showCancelButton: false }),
  confirm: (message: string, title?: string, options?: Partial<MessageBoxOptions>) =>
    showMessageBox({ ...options, message, title }),
  prompt: (message: string, title?: string, options?: Partial<MessageBoxOptions>) =>
    showMessageBox({ ...options, message, title })
};
