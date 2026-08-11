/**
 * @vima-tech/ui-admin · 轻量弹层服务（消息 / 通知 / 确认 / 加载）
 *
 * 创建日期: 2026-08-10
 *
 * 手工移植自 juvenile-guard/apps/admin-web/src/ui/layer.ts（不由 extract-from-ui-v3.mjs 生成）。
 * 移植时删掉的东西：宿主里那层 `setLayerBackend` + Proxy——它的用途是把调用转发给 layui-vue，
 * 属于宿主渐进迁移期的脚手架，框架里没有 legacy 后端可转发。
 *
 * API 形状（icon / time / btn / closeAll(type)）刻意保持与 Layui layer 一致：
 * 存量工程从 layui-vue 迁过来时调用点一行都不用改。
 */

import { iconSvgMarkup } from './components/icons';

export type LayerIndex = number | string;
export type LayerCallback = (index: LayerIndex) => void;
export type LayerButton = { text?: string; callback?: LayerCallback };
export type LayerOptions = {
  /** 0=信息 1=成功 2=警告，与 Layui 取值一致 */
  icon?: number;
  /** 自动关闭毫秒数 */
  time?: number;
  title?: string;
  content?: unknown;
  btn?: LayerButton[];
};

/** 与 Layui 的 layer.closeAll(type) 取值对齐 */
type LayerKind = 'msg' | 'notify' | 'confirm' | 'loading';

const CLOSE_ALL_ALIAS: Record<string, LayerKind> = {
  msg: 'msg',
  notify: 'notify',
  loading: 'loading',
  confirm: 'confirm',
  dialog: 'confirm',
  page: 'confirm',
  prompt: 'confirm'
};

let sequence = 0;
const elements = new Map<LayerIndex, HTMLElement>();
const timers = new Map<LayerIndex, number>();
/** 记录每个弹层的类型，供 closeAll('loading') 这类按类型批量关闭使用 */
const kinds = new Map<LayerIndex, LayerKind>();

function nextId() {
  sequence += 1;
  return `vui-layer-${sequence}`;
}

function mount(element: HTMLElement, kind: LayerKind, id = nextId()) {
  element.dataset.layerId = String(id);
  document.body.appendChild(element);
  elements.set(id, element);
  kinds.set(id, kind);
  return id;
}

function closeNative(index: LayerIndex) {
  const element = elements.get(index);
  if (!element) return;
  element.classList.add('is-leaving');
  window.setTimeout(() => element.remove(), 150);
  elements.delete(index);
  kinds.delete(index);
  const timer = timers.get(index);
  if (timer) window.clearTimeout(timer);
  timers.delete(index);
}

function closeAllNative(type?: unknown) {
  const wanted = type == null || type === '' ? null : CLOSE_ALL_ALIAS[String(type)];
  // 传了无法识别的类型时不做任何关闭，避免误关其他弹层
  if (type != null && type !== '' && !wanted) return;
  Array.from(elements.keys()).forEach((id) => {
    if (!wanted || kinds.get(id) === wanted) closeNative(id);
  });
}

function iconName(icon?: number) {
  if (icon === 1) return 'check';
  if (icon === 2) return 'alert';
  return 'info';
}

export const layer = {
  msg(content: unknown, options: LayerOptions = {}, callback?: () => void): LayerIndex {
    const element = document.createElement('div');
    element.className = `vui-native-message is-icon-${options.icon || 0}`;
    element.setAttribute('role', 'status');
    element.innerHTML = '<span class="vui-native-message-icon"></span><span></span>';
    (element.firstElementChild as HTMLElement).innerHTML = iconSvgMarkup(iconName(options.icon));
    (element.lastElementChild as HTMLElement).textContent = String(content ?? '');
    const id = mount(element, 'msg');
    const timer = window.setTimeout(() => {
      closeNative(id);
      callback?.();
    }, Number(options.time || 2200));
    timers.set(id, timer);
    return id;
  },

  notify(options: LayerOptions = {}): LayerIndex {
    const element = document.createElement('aside');
    element.className = 'vui-native-notify';
    element.setAttribute('role', 'status');
    const title = document.createElement('strong');
    title.textContent = String(options.title || '提示');
    const content = document.createElement('div');
    content.textContent = String(options.content ?? '');
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭');
    close.innerHTML = iconSvgMarkup('close');
    element.append(title, content, close);
    const id = mount(element, 'notify');
    close.addEventListener('click', () => closeNative(id));
    const timer = window.setTimeout(() => closeNative(id), Number(options.time || 3600));
    timers.set(id, timer);
    return id;
  },

  confirm(content: unknown, options: LayerOptions = {}): LayerIndex {
    const wrap = document.createElement('div');
    wrap.className = 'vui-native-confirm-wrap';
    wrap.setAttribute('role', 'presentation');
    const panel = document.createElement('section');
    panel.className = 'vui-native-confirm';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    const heading = document.createElement('header');
    heading.textContent = String(options.title || '请确认');
    const body = document.createElement('div');
    body.className = 'vui-native-confirm-body';
    body.textContent = String(content ?? '');
    const footer = document.createElement('footer');
    panel.append(heading, body, footer);
    wrap.append(panel);
    const id = mount(wrap, 'confirm');
    const buttons = options.btn?.length
      ? options.btn
      : [
          { text: '确认', callback: (index: LayerIndex) => closeNative(index) },
          { text: '取消', callback: (index: LayerIndex) => closeNative(index) }
        ];
    buttons.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === 0 ? 'is-primary' : '';
      button.textContent = item.text || (index === 0 ? '确认' : '取消');
      button.addEventListener('click', () => {
        if (item.callback) item.callback(id);
        else closeNative(id);
      });
      footer.append(button);
    });
    wrap.addEventListener('mousedown', (event) => {
      // 点遮罩等同于点最后一个按钮（约定俗成是「取消」）；只有一个按钮时不响应
      if (event.target === wrap && buttons.length > 1) {
        const cancel = buttons[buttons.length - 1];
        if (cancel.callback) cancel.callback(id);
        else closeNative(id);
      }
    });
    queueMicrotask(() => (footer.querySelector('button') as HTMLButtonElement | null)?.focus());
    return id;
  },

  load(): LayerIndex {
    const element = document.createElement('div');
    element.className = 'vui-native-loading';
    element.setAttribute('role', 'status');
    element.innerHTML = '<span class="vui-spinner"></span><span></span>';
    (element.lastElementChild as HTMLElement).textContent = '正在处理…';
    return mount(element, 'loading');
  },

  close(index: LayerIndex) {
    closeNative(index);
  },

  closeAll(type?: unknown) {
    closeAllNative(type);
  }
};

export default layer;
