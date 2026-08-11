import {
  Teleport,
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useAttrs,
  watch,
  type PropType
} from 'vue';
import { FLOATING_MENU_PENDING_STYLE, floatingMenuPosition } from '../floating';
import { classes, mergeStyles, sizeToCss } from '../utils';
import { VIcon } from './icons';

function panelSize(area: string | number | Array<string | number>) {
  const values = Array.isArray(area) ? area : area ? [area] : [];
  return {
    width: sizeToCss(values[0]) || 'min(720px, calc(100vw - 32px))',
    height: sizeToCss(values[1]),
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100dvh - 32px)'
  };
}

/** 在模态浮层中承载需要用户处理的内容。 @category overlay @props modelValue::浮层是否可见;title::浮层标题;area::面板宽高;shadeClose::点击遮罩是否关闭;closeBtn::是否显示关闭按钮;loading::是否显示处理遮罩;type::兼容层类型 */
export const VLayer = defineComponent({
  name: 'VLayer',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    area: {
      type: [String, Number, Array] as PropType<string | number | Array<string | number>>,
      default: ''
    },
    shadeClose: { type: Boolean, default: true },
    closeBtn: { type: [Boolean, Number, String], default: true },
    loading: { type: Boolean, default: false },
    type: { type: [String, Number], default: 1 }
  },
  emits: ['update:modelValue', 'close', 'open'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    const panel = ref<HTMLElement>();
    const close = () => {
      emit('update:modelValue', false);
      emit('close');
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (props.modelValue && event.key === 'Escape') close();
    };
    watch(
      () => props.modelValue,
      async (visible) => {
        document.documentElement.classList.toggle('vui-layer-open', visible);
        if (visible) {
          emit('open');
          await nextTick();
          panel.value?.focus();
        }
      },
      { immediate: true }
    );
    onMounted(() => document.addEventListener('keydown', onKeydown));
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', onKeydown);
      document.documentElement.classList.remove('vui-layer-open');
    });

    return () =>
      props.modelValue
        ? h(Teleport, { to: 'body' }, [
            h(
              'div',
              {
                class: 'vui-layer-wrap',
                role: 'presentation',
                onMousedown: (event: MouseEvent) => {
                  const target = event.target as HTMLElement;
                  if (
                    props.shadeClose &&
                    (event.target === event.currentTarget || target.classList.contains('vui-layer-shade'))
                  ) close();
                }
              },
              [
                h('div', { class: 'vui-layer-shade' }),
                h(
                  'section',
                  {
                    ...attrs,
                    ref: panel,
                    class: classes('vui-layer', attrs.class),
                    style: mergeStyles(panelSize(props.area), attrs.style as never),
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': props.title || '对话框',
                    tabindex: -1
                  },
                  [
                    h('header', { class: ['vui-layer-header'] }, [
                      h('div', { class: 'vui-layer-heading' }, props.title || '信息'),
                      props.closeBtn !== false && props.closeBtn !== 0 && props.closeBtn !== '0'
                        ? h(
                            'button',
                            {
                              type: 'button',
                              class: 'vui-layer-close',
                              'aria-label': '关闭',
                              onClick: close
                            },
                            h(VIcon, { type: 'close' })
                          )
                        : null
                    ]),
                    h('div', { class: ['vui-layer-content'] }, slots.default?.()),
                    slots.footer
                      ? h('footer', { class: 'vui-layer-footer' }, slots.footer())
                      : null,
                    props.loading
                      ? h('div', { class: 'vui-layer-loading', role: 'status' }, [
                          h('span', { class: 'vui-spinner' }),
                          h('span', '处理中…')
                        ])
                      : null
                  ]
                )
              ]
            )
          ])
        : null;
  }
});

/**
 * 与上游 ui-v3 已分歧：面板从「贴着触发器的 absolute」改成 teleport 到 body 的 fixed。
 * 重跑 scripts/extract-from-ui-v3.mjs 会把这段覆盖回去，理由见 src/floating.ts 的文件注释。
 * @category overlay
 * @props visible::受控的面板可见状态;placement::面板相对触发器的位置
 */
export const VDropdown = defineComponent({
  name: 'VDropdown',
  inheritAttrs: false,
  props: {
    visible: { type: Boolean, default: undefined },
    placement: { type: String, default: 'bottom-start' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const root = ref<HTMLElement>();
    const popover = ref<HTMLElement>();
    const opened = ref(false);
    const dropUp = ref(false);
    const panelStyle = ref<Record<string, string>>({ ...FLOATING_MENU_PENDING_STYLE });
    /** 打开前的焦点落点：面板搬到 body 后 Tab 序已经断开，关闭时得把焦点还回来 */
    let restoreFocus: HTMLElement | null = null;
    const show = computed(() => (props.visible === true ? true : opened.value));
    const alignEnd = computed(() => props.placement === 'bottom-end');
    const close = () => {
      opened.value = false;
    };
    const updatePosition = () => {
      if (!show.value || !root.value || !popover.value) return;
      const position = floatingMenuPosition(root.value, popover.value, alignEnd.value);
      dropUp.value = position.dropUp;
      panelStyle.value = position.style;
    };
    const openEffects = () => {
      restoreFocus = document.activeElement as HTMLElement | null;
      updatePosition();
      // 焦点跟进面板：节点已经不在触发器后面，不主动送焦点键盘就走不进来
      popover.value
        ?.querySelector<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex="-1"])')
        ?.focus({ preventScroll: true });
    };
    const closeEffects = () => {
      panelStyle.value = { ...FLOATING_MENU_PENDING_STYLE };
      dropUp.value = false;
      // 焦点原本在面板里（点菜单项或按 Esc）时，节点一卸载焦点会掉回 body，这时才收回来；
      // 若用户是点了别处关闭的，焦点已经落在那个别处，不能抢
      const active = document.activeElement;
      if (restoreFocus && (!active || active === document.body)) {
        restoreFocus.focus({ preventScroll: true });
      }
      restoreFocus = null;
    };
    // 面板不再是 root 的后代，「点在外面」必须两处都问：只问 root 的话，点菜单项时
    // mousedown 会先把面板关掉、节点卸载，click 根本落不下来，菜单等于点不动
    const onDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!root.value?.contains(target) && !popover.value?.contains(target)) close();
    };
    watch(show, (visible) => (visible ? openEffects() : closeEffects()), { flush: 'post' });
    onMounted(() => {
      if (show.value) openEffects();
      document.addEventListener('mousedown', onDocumentPointerDown);
      // fixed 定位的面板不会跟着祖先滚，得在滚动/缩放时重算（捕获阶段才收得到内层容器的滚动）
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDocumentPointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    });
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          ...rest,
          ref: root,
          class: classes('vui-dropdown', incomingClass, `is-${props.placement}`, {
            'is-open': show.value
          }),
          style
        },
        [
          h(
            'div',
            {
              class: 'vui-dropdown-trigger',
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
                opened.value = !opened.value;
              },
              onKeydown: (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                  close();
                }
              }
            },
            slots.default?.()
          ),
          show.value
            ? h(Teleport, { to: 'body' }, [
                h(
                  'div',
                  {
                    ref: popover,
                    class: classes('vui-dropdown-popover', {
                      'is-drop-up': dropUp.value,
                      'is-align-end': alignEnd.value
                    }),
                    style: panelStyle.value,
                    onClick: () => queueMicrotask(close),
                    // 焦点进了面板之后，Esc 的 keydown 落在面板上，触发器那个监听收不到
                    onKeydown: (event: KeyboardEvent) => {
                      if (event.key === 'Escape') close();
                    }
                  },
                  slots.content?.()
                )
              ])
            : null
        ]
      );
    };
  }
});

/** 下拉操作中的菜单容器。 @category navigation @related VDropdown */
export const VDropdownMenu = defineComponent({
  name: 'VDropdownMenu',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-dropdown-menu', incomingClass),
          style,
          role: 'menu'
        },
        slots.default?.()
      );
    };
  }
});

/** 下拉菜单中的单个操作项。 @category navigation @props disabled::是否禁用该菜单项 @related VDropdownMenu */
export const VDropdownMenuItem = defineComponent({
  name: 'VDropdownMenuItem',
  inheritAttrs: false,
  props: {
    disabled: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'button',
        {
          ...rest,
          type: 'button',
          class: classes('vui-dropdown-item', incomingClass),
          style,
          disabled: props.disabled,
          role: 'menuitem'
        },
        slots.default?.()
      );
    };
  }
});

// ==================== Tooltip 文字提示 ====================

type TooltipPlacement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end';

function tooltipPosition(
  trigger: HTMLElement,
  tooltip: HTMLElement,
  placement: TooltipPlacement
): Record<string, string> {
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const viewportMargin = 8;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'top-start':
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.left;
      break;
    case 'top-end':
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.right - tooltipRect.width;
      break;
    case 'bottom':
      top = triggerRect.bottom + gap;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom-start':
      top = triggerRect.bottom + gap;
      left = triggerRect.left;
      break;
    case 'bottom-end':
      top = triggerRect.bottom + gap;
      left = triggerRect.right - tooltipRect.width;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.left - tooltipRect.width - gap;
      break;
    case 'left-start':
      top = triggerRect.top;
      left = triggerRect.left - tooltipRect.width - gap;
      break;
    case 'left-end':
      top = triggerRect.bottom - tooltipRect.height;
      left = triggerRect.left - tooltipRect.width - gap;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.right + gap;
      break;
    case 'right-start':
      top = triggerRect.top;
      left = triggerRect.right + gap;
      break;
    case 'right-end':
      top = triggerRect.bottom - tooltipRect.height;
      left = triggerRect.right + gap;
      break;
  }

  left = Math.max(viewportMargin, Math.min(left, window.innerWidth - tooltipRect.width - viewportMargin));
  top = Math.max(viewportMargin, Math.min(top, window.innerHeight - tooltipRect.height - viewportMargin));

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`
  };
}

/** 为目标内容展示简短文字提示。 @category overlay @props content::提示文字;placement::提示相对目标的位置;disabled::是否禁用提示;trigger::触发方式;showAfter::显示延迟毫秒数;hideAfter::隐藏延迟毫秒数;effect::深色或浅色主题;enterable::鼠标是否可进入提示层 */
export const VTooltip = defineComponent({
  name: 'VTooltip',
  inheritAttrs: false,
  props: {
    content: { type: String, default: '' },
    placement: { type: String as PropType<TooltipPlacement>, default: 'top' },
    disabled: { type: Boolean, default: false },
    trigger: { type: String as PropType<'hover' | 'click' | 'focus'>, default: 'hover' },
    showAfter: { type: Number, default: 0 },
    hideAfter: { type: Number, default: 200 },
    effect: { type: String as PropType<'dark' | 'light'>, default: 'dark' },
    enterable: { type: Boolean, default: true }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const triggerRef = ref<HTMLElement>();
    const tooltipRef = ref<HTMLElement>();
    const visible = ref(false);
    const tooltipStyle = ref<Record<string, string>>({ position: 'fixed', visibility: 'hidden' });
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const updatePosition = () => {
      if (!visible.value || !triggerRef.value || !tooltipRef.value) return;
      tooltipStyle.value = tooltipPosition(triggerRef.value, tooltipRef.value, props.placement);
    };

    const show = () => {
      if (props.disabled) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      showTimer = setTimeout(() => {
        visible.value = true;
        nextTick(updatePosition);
      }, props.showAfter);
    };

    const hide = () => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      hideTimer = setTimeout(() => {
        visible.value = false;
      }, props.hideAfter);
    };

    onMounted(() => {
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    });
    onBeforeUnmount(() => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    });

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'span',
        {
          ...rest,
          ref: triggerRef,
          class: classes('vui-tooltip-host', incomingClass),
          style,
          onMouseenter: () => { if (props.trigger === 'hover') show(); },
          onMouseleave: () => { if (props.trigger === 'hover') hide(); },
          onClick: () => { if (props.trigger === 'click') visible.value ? hide() : show(); },
          onFocusin: () => { if (props.trigger === 'focus') show(); },
          onFocusout: () => { if (props.trigger === 'focus') hide(); }
        },
        [
          slots.default?.(),
          visible.value && (props.content || slots.content)
            ? h(
                Teleport,
                { to: 'body' },
                [
                  h(
                    'div',
                    {
                      ref: tooltipRef,
                      class: classes('vui-tooltip', `vui-tooltip--${props.placement}`, `is-${props.effect}`, {
                        'is-visible': visible.value
                      }),
                      style: tooltipStyle.value,
                      role: 'tooltip',
                      onMouseenter: () => {
                        if (props.enterable && props.trigger === 'hover' && hideTimer) {
                          clearTimeout(hideTimer);
                          hideTimer = null;
                        }
                      },
                      onMouseleave: () => { if (props.trigger === 'hover') hide(); }
                    },
                    [
                      h('div', { class: 'vui-tooltip-arrow' }),
                      h('div', { class: 'vui-tooltip-content' }, slots.content?.() || props.content)
                    ]
                  )
                ]
              )
            : null
        ]
      );
    };
  }
});

// ==================== Popover 气泡卡片 ====================

/** 在目标附近展示可交互的浮层内容。 @category overlay @props title::浮层标题;content::浮层正文;placement::浮层相对目标的位置;disabled::是否禁用;trigger::触发方式;width::浮层宽度;showAfter::显示延迟毫秒数;hideAfter::隐藏延迟毫秒数;enterable::鼠标是否可进入浮层;popperClass::浮层附加类名 */
export const VPopover = defineComponent({
  name: 'VPopover',
  inheritAttrs: false,
  props: {
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    placement: { type: String as PropType<TooltipPlacement>, default: 'bottom' },
    disabled: { type: Boolean, default: false },
    trigger: { type: String as PropType<'hover' | 'click' | 'focus'>, default: 'click' },
    width: { type: [String, Number], default: '' },
    showAfter: { type: Number, default: 0 },
    hideAfter: { type: Number, default: 200 },
    enterable: { type: Boolean, default: true },
    popperClass: { type: String, default: '' }
  },
  emits: ['show', 'hide'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    const triggerRef = ref<HTMLElement>();
    const popoverRef = ref<HTMLElement>();
    const visible = ref(false);
    const popoverStyle = ref<Record<string, string>>({ position: 'fixed', visibility: 'hidden' });
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const updatePosition = () => {
      if (!visible.value || !triggerRef.value || !popoverRef.value) return;
      popoverStyle.value = tooltipPosition(triggerRef.value, popoverRef.value, props.placement);
    };

    const show = () => {
      if (props.disabled) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      showTimer = setTimeout(() => {
        visible.value = true;
        emit('show');
        nextTick(updatePosition);
      }, props.showAfter);
    };

    const hide = () => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      hideTimer = setTimeout(() => {
        visible.value = false;
        emit('hide');
      }, props.hideAfter);
    };

    const toggle = () => {
      visible.value ? hide() : show();
    };

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        visible.value &&
        !triggerRef.value?.contains(target) &&
        !popoverRef.value?.contains(target)
      ) {
        hide();
      }
    };

    const widthStyle = computed(() => {
      const w = sizeToCss(props.width);
      return w ? { width: w, minWidth: w } : {};
    });

    onMounted(() => {
      document.addEventListener('mousedown', onClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    });

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const triggerEvents: Record<string, Function> = {};
      if (props.trigger === 'hover') {
        triggerEvents.onMouseenter = show;
        triggerEvents.onMouseleave = hide;
      } else if (props.trigger === 'click') {
        triggerEvents.onClick = toggle;
      } else if (props.trigger === 'focus') {
        triggerEvents.onFocusin = show;
        triggerEvents.onFocusout = hide;
      }

      return h(
        'span',
        {
          ...rest,
          ref: triggerRef,
          class: classes('vui-popover-host', incomingClass),
          style,
          ...triggerEvents
        },
        [
          slots.default?.(),
          visible.value
            ? h(
                Teleport,
                { to: 'body' },
                [
                  h(
                    'div',
                    {
                      ref: popoverRef,
                      class: classes('vui-popover', `vui-popover--${props.placement}`, props.popperClass, {
                        'is-visible': visible.value
                      }),
                      style: mergeStyles(popoverStyle.value, widthStyle.value),
                      onMouseenter: () => {
                        if (props.enterable && props.trigger === 'hover' && hideTimer) {
                          clearTimeout(hideTimer);
                          hideTimer = null;
                        }
                      },
                      onMouseleave: () => { if (props.trigger === 'hover') hide(); }
                    },
                    [
                      h('div', { class: 'vui-popover-arrow' }),
                      props.title || slots.title
                        ? h('div', { class: 'vui-popover-title' }, slots.title?.() || props.title)
                        : null,
                      h(
                        'div',
                        { class: 'vui-popover-content' },
                        slots.content?.() || props.content
                      )
                    ]
                  )
                ]
              )
            : null
        ]
      );
    };
  }
});

// ==================== Drawer 抽屉 ====================

/** 从视口边缘展开辅助任务面板。 @category overlay @props modelValue::抽屉是否可见;title::抽屉标题;direction::抽屉展开方向;size::抽屉宽度或高度;modal::是否显示遮罩;showClose::是否显示关闭按钮;closeOnClickModal::点击遮罩是否关闭;closeOnPressEscape::按 Escape 是否关闭;beforeClose::关闭前钩子;destroyOnClose::关闭后是否销毁内容;withHeader::是否渲染头部 */
export const VDrawer = defineComponent({
  name: 'VDrawer',
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    direction: { type: String as PropType<'rtl' | 'ltr' | 'ttb' | 'btt'>, default: 'rtl' },
    size: { type: [String, Number], default: '30%' },
    modal: { type: Boolean, default: true },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    beforeClose: { type: Function as PropType<(done: () => void) => void>, default: undefined },
    destroyOnClose: { type: Boolean, default: false },
    withHeader: { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'open', 'close', 'opened', 'closed'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    const drawerRef = ref<HTMLElement>();
    const opened = ref(false);
    const rendered = ref(!props.destroyOnClose);

    const sizeStyle = computed(() => {
      const s = sizeToCss(props.size);
      if (props.direction === 'rtl' || props.direction === 'ltr') {
        return { width: s || '30%' };
      }
      return { height: s || '30%' };
    });

    const close = () => {
      const done = () => {
        opened.value = false;
        emit('update:modelValue', false);
        emit('close');
      };
      if (props.beforeClose) {
        props.beforeClose(done);
      } else {
        done();
      }
    };

    const onClickModal = () => {
      if (props.closeOnClickModal) close();
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && props.closeOnPressEscape) close();
    };

    watch(
      () => props.modelValue,
      (val) => {
        if (val) {
          rendered.value = true;
          emit('open');
          nextTick(() => {
            opened.value = true;
            drawerRef.value?.focus();
            emit('opened');
          });
        } else {
          opened.value = false;
          if (props.destroyOnClose) {
            setTimeout(() => {
              rendered.value = false;
            }, 300);
          }
          emit('closed');
        }
      },
      { immediate: true }
    );

    onMounted(() => {
      document.addEventListener('keydown', onKeydown);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', onKeydown);
    });

    return () => {
      if (!rendered.value && !props.modelValue) return null;
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        Teleport,
        { to: 'body' },
        [
          h(
            'div',
            {
              ...rest,
              class: classes('vui-drawer-wrap', incomingClass, {
                'is-open': opened.value,
                'is-modal': props.modal
              }),
              style
            },
            [
              props.modal
                ? h('div', {
                    class: 'vui-drawer-mask',
                    onClick: onClickModal
                  })
                : null,
              h(
                'div',
                {
                  ref: drawerRef,
                  class: classes('vui-drawer', `is-${props.direction}`, {
                    'is-open': opened.value
                  }),
                  style: sizeStyle.value,
                  tabindex: -1,
                  role: 'dialog',
                  'aria-modal': props.modal,
                  'aria-label': props.title || '抽屉'
                },
                [
                  props.withHeader
                    ? h('header', { class: 'vui-drawer-header' }, [
                        h('div', { class: 'vui-drawer-title' }, slots.title?.() || props.title || '信息'),
                        props.showClose
                          ? h(
                              'button',
                              {
                                type: 'button',
                                class: 'vui-drawer-close',
                                'aria-label': '关闭',
                                onClick: close
                              },
                              h(VIcon, { type: 'close' })
                            )
                          : null
                      ])
                    : null,
                  h('div', { class: 'vui-drawer-body' }, slots.default?.()),
                  slots.footer
                    ? h('footer', { class: 'vui-drawer-footer' }, slots.footer())
                    : null
                ]
              )
            ]
          )
        ]
      );
    };
  }
});
