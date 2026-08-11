/**
 * @vima-tech/ui-admin · 表格列设置（自定义字段）
 *
 * 创建日期: 2026-08-10
 *
 * 注意：手写文件，不由 scripts/extract-from-ui-v3.mjs 生成（理由见 components/feedback.ts 顶部）。
 *
 * 用法：放进 VTable 的 toolbar 插槽，它托管 columns 这一个数组——
 *
 *   <v-table :columns="columns" :data-source="rows">
 *     <template #toolbar>
 *       <v-column-setting v-model="columns" :source="ALL_COLUMNS" storage-key="user-list" />
 *     </template>
 *   </v-table>
 *
 * `source` 是全量列定义（顺序即默认顺序，不会被改写），`v-model` 是筛过、排过序的生效列。
 * 页面只需要把 `columns` 交给表格，不用自己算显隐。
 *
 * 刻意没做的两件事：
 *   - 不碰列宽与左右固定。本库的固定列是**按角色**自动判定的（首列 + 末尾的操作列，
 *     见 data.ts 的 isOperationColumn），开放手工固定会和那套判定打架。
 *   - 不做「至少保留一列」以外的校验。全隐藏会得到一张空表，那不是用户想要的结果，
 *     所以最后一个可见列的勾选框会禁用。
 */
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PropType } from 'vue';

import { classes } from '../utils';
import { VIcon } from './icons';

type ColumnLike = Record<string, any>;
type DraftItem = { key: string; title: string; visible: boolean };
/** 落盘的形状：只存身份与显隐，列定义本身永远以 source 为准 */
type StoredItem = { key: string; visible: boolean };

const STORAGE_PREFIX = 'vui-columns:';

/**
 * 列的身份。key 是首选；没有 key 的列（纯插槽列/占位列）退到 customSlot、title，
 * 最后才用下标——用下标的列一旦排序就会串位，所以文档里要求可配置的列都给 key。
 */
function identity(column: ColumnLike, index: number): string {
  return String(column.key ?? column.customSlot ?? column.title ?? `#${index}`);
}

function labelOf(column: ColumnLike, index: number): string {
  return String(column.title || column.key || column.customSlot || `第 ${index + 1} 列`);
}

/** localStorage 在隐私模式/SSR 下可能不可用或抛异常，读写都吞掉 */
function readStore(key: string): StoredItem[] | null {
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStore(key: string, value: StoredItem[]) {
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // 配额满 / 隐私模式：不持久化就是了，不该因此让页面报错
  }
}

/** 配置表格列的显示、隐藏与顺序。 @category data @props label::触发按钮文案;disabled::是否禁止调整列 */
export const VColumnSetting = defineComponent({
  name: 'VColumnSetting',
  props: {
    /** 全量列定义，顺序即默认顺序 */
    source: { type: Array as PropType<ColumnLike[]>, default: () => [] },
    /** v-model：生效的列，直接喂给 VTable 的 columns */
    modelValue: { type: Array as PropType<ColumnLike[]>, default: () => [] },
    /** 记忆用的键，同一张表在不同页面要用不同的键。留空 = 不落盘 */
    storageKey: { type: String, default: '' },
    label: { type: String, default: '列设置' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const root = ref<HTMLElement>();
    const open = ref(false);
    /** 面板里的草稿：关掉面板 = 放弃，点确定才生效 */
    const draft = ref<DraftItem[]>([]);
    /** 已生效的显隐/顺序，按钮上的计数与「打开面板」的初值都取它 */
    const applied = ref<DraftItem[]>([]);
    const dragFrom = ref(-1);
    /**
     * 面板默认右对齐（按钮通常在工具栏右侧）。但按钮出现在左侧时，右对齐会把
     * 232px 宽的面板往左甩出内容区——轻则跑到视口外，重则钻到侧边栏底下被挡住点不着。
     * 开面板后量一次，越界就翻成左对齐；判据取**最近的滚动容器**而不是视口，
     * 因为后台布局里内容区左边通常还站着一条侧边栏，视口边界管不到那里。
     */
    const alignLeft = ref(false);
    const panel = ref<HTMLElement>();

    const defaults = (): DraftItem[] =>
      props.source.map((column, index) => ({
        key: identity(column, index),
        title: labelOf(column, index),
        visible: true
      }));

    /**
     * 存档 + 当前 source 合成生效状态。
     * source 变了要能兼容：存档里没有的列（新加的）按 source 顺序补在后面并默认显示，
     * source 里没有的列（删掉的）丢弃——否则改一次列定义，用户的存档就得手动清。
     */
    const merge = (stored: StoredItem[] | null): DraftItem[] => {
      const base = defaults();
      if (!stored?.length) return base;
      const byKey = new Map(base.map((item) => [item.key, item]));
      const ordered: DraftItem[] = [];
      for (const item of stored) {
        const hit = byKey.get(item.key);
        if (!hit) continue;
        ordered.push({ ...hit, visible: item.visible !== false });
        byKey.delete(item.key);
      }
      for (const rest of base) if (byKey.has(rest.key)) ordered.push(rest);
      return ordered.length ? ordered : base;
    };

    /** 把状态翻译成列数组交给表格 */
    const emitColumns = (state: DraftItem[]) => {
      const byKey = new Map(props.source.map((column, index) => [identity(column, index), column]));
      const columns = state
        .filter((item) => item.visible)
        .map((item) => byKey.get(item.key))
        .filter(Boolean) as ColumnLike[];
      emit('update:modelValue', columns);
      emit('change', { columns, state: state.map((i) => ({ ...i })) });
    };

    const apply = (state: DraftItem[], persist = true) => {
      applied.value = state.map((item) => ({ ...item }));
      if (persist && props.storageKey) {
        writeStore(props.storageKey, state.map(({ key, visible }) => ({ key, visible })));
      }
      emitColumns(state);
    };

    // 挂载即生效：存档要在表格第一次渲染时就起作用，否则用户会看到「默认列闪一下再变」
    onMounted(() => apply(merge(readStore(props.storageKey)), false));

    // source 变了（页面按角色/开关换了列定义）重新合成，存档里认得的部分继续生效
    watch(
      () => props.source.map((c, i) => identity(c, i)).join('|'),
      () => apply(merge(readStore(props.storageKey)), false)
    );

    const visibleCount = () => applied.value.filter((i) => i.visible).length;

    const toggle = async () => {
      if (props.disabled) return;
      if (!open.value) draft.value = applied.value.map((item) => ({ ...item }));
      open.value = !open.value;
      if (!open.value) {
        alignLeft.value = false;
        return;
      }
      await nextTick();
      const box = panel.value?.getBoundingClientRect();
      if (!box || !root.value) return;
      const limit = scrollParent(root.value).getBoundingClientRect();
      if (box.left < Math.max(limit.left, 0) + 4) alignLeft.value = true;
    };

    const move = (from: number, to: number) => {
      const list = draft.value;
      if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return;
      const next = list.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      draft.value = next;
    };

    /** 最近的、会裁剪内容的祖先；面板必须待在它里面 */
    function scrollParent(el: HTMLElement): HTMLElement {
      let node = el.parentElement;
      while (node && node !== document.body) {
        if (/(auto|scroll|hidden)/.test(getComputedStyle(node).overflowX)) return node;
        node = node.parentElement;
      }
      return document.documentElement;
    }

    const onDocumentMousedown = (event: MouseEvent) => {
      if (open.value && !root.value?.contains(event.target as Node)) open.value = false;
    };
    const onDocumentKeydown = (event: KeyboardEvent) => {
      if (open.value && event.key === 'Escape') open.value = false;
    };
    onMounted(() => {
      document.addEventListener('mousedown', onDocumentMousedown);
      document.addEventListener('keydown', onDocumentKeydown);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDocumentMousedown);
      document.removeEventListener('keydown', onDocumentKeydown);
    });

    const renderItem = (item: DraftItem, index: number) => {
      const draftVisible = draft.value.filter((i) => i.visible).length;
      // 最后一根独苗不许再取消，否则得到一张没有列的表
      const lockUncheck = item.visible && draftVisible <= 1;
      return h(
        'li',
        {
          key: item.key,
          class: classes('vui-column-setting-item', { 'is-hidden': !item.visible }),
          draggable: true,
          onDragstart: () => {
            dragFrom.value = index;
          },
          onDragover: (event: DragEvent) => {
            event.preventDefault();
            if (dragFrom.value !== -1 && dragFrom.value !== index) {
              move(dragFrom.value, index);
              dragFrom.value = index;
            }
          },
          onDragend: () => {
            dragFrom.value = -1;
          }
        },
        [
          h('label', { class: 'vui-column-setting-label' }, [
            h('input', {
              type: 'checkbox',
              checked: item.visible,
              disabled: lockUncheck,
              title: lockUncheck ? '至少保留一列' : undefined,
              onChange: (event: Event) => {
                const next = draft.value.slice();
                next[index] = { ...item, visible: (event.target as HTMLInputElement).checked };
                draft.value = next;
              }
            }),
            h('span', item.title)
          ]),
          h(
            'button',
            {
              type: 'button',
              class: 'vui-column-setting-handle',
              // 只能拖会把键盘用户挡在外面，把手聚焦后上下键即可移动
              'aria-label': `调整「${item.title}」的顺序：拖拽，或用上下方向键`,
              onKeydown: async (event: KeyboardEvent) => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                event.preventDefault();
                const target = index + (event.key === 'ArrowUp' ? -1 : 1);
                if (target < 0 || target >= draft.value.length) return;
                move(index, target);
                await nextTick();
                // 移动 DOM 节点 = 先摘除再插入，浏览器会顺手清掉焦点，
                // 不还回去的话「连按两下上移」只会生效第一下。
                panel.value
                  ?.querySelectorAll<HTMLElement>('.vui-column-setting-handle')
                  [target]?.focus();
              }
            },
            h(VIcon, { type: 'drag-handle' })
          )
        ]
      );
    };

    return () =>
      h(
        'div',
        { ref: root, class: classes('vui-column-setting', { 'is-open': open.value }) },
        [
          h(
            'button',
            {
              type: 'button',
              class: 'vui-column-setting-trigger',
              disabled: props.disabled,
              'aria-expanded': open.value ? 'true' : 'false',
              'aria-haspopup': 'dialog',
              title: props.label,
              onClick: toggle
            },
            [
              h(VIcon, { class: 'vui-column-setting-gear', type: 'settings' }),
              h('span', { class: 'vui-column-setting-text' }, props.label),
              // 隐藏了列却没有任何提示，用户会以为是数据丢了
              applied.value.length && visibleCount() < applied.value.length
                ? h(
                    'span',
                    { class: 'vui-column-setting-badge' },
                    `隐藏 ${applied.value.length - visibleCount()}`
                  )
                : null
            ]
          ),
          open.value
            ? h(
                'div',
                {
                  ref: panel,
                  class: classes('vui-column-setting-panel', { 'is-align-left': alignLeft.value }),
                  role: 'dialog',
                  'aria-label': props.label
                },
                [
                  h('div', { class: 'vui-column-setting-head' }, '勾选显示，拖动排序'),
                  h(
                    'ul',
                    { class: 'vui-column-setting-list' },
                    draft.value.map((item, index) => renderItem(item, index))
                  ),
                  h('div', { class: 'vui-column-setting-foot' }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'vui-button vui-button-sm',
                        onClick: () => {
                          draft.value = defaults();
                        }
                      },
                      '重置'
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'vui-button vui-button-sm vui-button-primary',
                        onClick: () => {
                          apply(draft.value);
                          open.value = false;
                        }
                      },
                      '确定'
                    )
                  ])
                ]
              )
            : null
        ]
      );
  }
});
