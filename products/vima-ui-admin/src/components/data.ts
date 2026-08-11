import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  ref,
  useAttrs,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
  type VNodeChild
} from 'vue';
import { classes, displayValue, mergeStyles, sizeToCss } from '../utils';
import { VButton } from './basic';
import { hasIcon, VIcon } from './icons';
import {
  FLEXIBLE_COLUMN_MIN_WIDTH,
  OPERATION_COLUMN_MIN_WIDTH,
  operationColumnWidth,
  tableMinWidth
} from './columnWidth';

type RowData = Record<string, any>;
type TableColumn = Record<string, any>;

/**
 * 冻结列（横向滚动时保持可见）的判定。
 *
 * 刻意**不**读列定义里的 `fixed`：存量 46 个页面共 394 个列定义中有 286 个带
 * `fixed: "left"`，是历史复制粘贴留下的噪声（整张表除操作列外全被标成左固定）。
 * 照字面执行等于每一列都冻结，没有任何一列能横向滚动，与需求正好相反。
 *
 * 改为按**角色**判定，与列定义无关：
 *   前导 —— 勾选列（若有）+ 第一个数据列（各页均为姓名/名称一类的标识列）
 *   尾随 —— 末列且是操作列
 * 少数页面把「状态」列也标了 `fixed: "right"`，同样按噪声处理：多冻结一列会吃掉
 * 本就紧张的横向空间，而需求只要求操作列常驻。
 */
function isOperationColumn(column: TableColumn | undefined) {
  if (!column) return false;
  return column.title === '操作' || column.key === 'operator' || column.customSlot === 'operator';
}

function rowKey(row: RowData, keyField: string, index: number) {
  return row[keyField] ?? row._id ?? row.id ?? index;
}

/** 取 vnode（含组件插槽）里的纯文本，用于读按钮文案 */
function vnodeText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(vnodeText).join('');
  const children = (node as Record<string, any>).children;
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(vnodeText).join('');
  if (typeof children === 'object' && typeof children.default === 'function') {
    return vnodeText(children.default());
  }
  return '';
}

function isButtonVNode(node: Record<string, any>) {
  return node.type === VButton || node.type === 'button' || node.type?.name === 'VButton';
}

/**
 * 从操作列插槽渲染出的 vnode 树里收集按钮文案。
 * 走 vnode 而不是量 DOM：DOM 测量要等布局，且把「列宽」写回样式会与 ResizeObserver
 * 互相触发；vnode 在渲染前就能拿到，结果稳定。
 */
function collectButtonLabels(node: unknown, labels: string[] = []) {
  if (node == null || typeof node !== 'object') return labels;
  if (Array.isArray(node)) {
    node.forEach((child) => collectButtonLabels(child, labels));
    return labels;
  }
  const vnode = node as Record<string, any>;
  if (isButtonVNode(vnode)) {
    labels.push(vnodeText(vnode));
    return labels;
  }
  const children = vnode.children;
  if (Array.isArray(children)) children.forEach((child) => collectButtonLabels(child, labels));
  else if (children && typeof children === 'object' && typeof children.default === 'function') {
    collectButtonLabels(children.default(), labels);
  }
  return labels;
}

function csvCell(value: unknown) {
  return `"${displayValue(value).replaceAll('"', '""')}"`;
}

/** 展示、选择、排序和分页处理结构化数据。 @category data @event update:selectedKeys :: unknown[] :: 更新后的选中行键 @event change :: Record<string, unknown> :: 表格分页或查询状态变更 @event sortChange :: [string, 'asc' | 'desc' | ''] :: 排序字段和方向 @event columnOrderChange :: [TableColumn[], { fromIndex: number; toIndex: number }] :: 列顺序变更 */
export const VTable = defineComponent({
  name: 'VTable',
  inheritAttrs: false,
  props: {
    /** 表格列定义。 */
    columns: { type: Array as PropType<TableColumn[]>, default: () => [] },
    /** 当前展示的数据行。 */
    dataSource: { type: Array as PropType<RowData[]>, default: () => [] },
    /** 分页配置；false 表示不展示内部分页。 */
    page: { type: [Object, Boolean] as PropType<Record<string, any> | false>, default: false },
    /** 是否展示加载状态。 */
    loading: { type: Boolean, default: false },
    /** 当前选中行的唯一键集合。 */
    selectedKeys: { type: Array as PropType<unknown[]>, default: () => [] },
    /** 是否展示行选择框。 */
    showCheckbox: { type: Boolean, default: false },
    /** 是否展示默认工具栏。 */
    defaultToolbar: { type: Boolean, default: false },
    /** 表格内容区高度。 */
    height: { type: [String, Number], default: '' },
    /** 行数据中的唯一键字段名。 */
    id: { type: String, default: '_id' },
    /** 表格密度。 */
    size: { type: String, default: 'md' },
    /** 行类名或行类名计算函数。 */
    rowClassName: { type: [String, Function] as PropType<string | ((row: RowData, index: number) => string)>, default: '' },
    /** 树形数据的字段映射。 */
    treeProps: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    /** 是否默认展开全部树节点。 */
    defaultExpandAll: { type: Boolean, default: false },
    /** 是否允许拖动列边缘调整宽度。 */
    resize: { type: Boolean, default: false },
    /** 启用表头列拖拽排序 */
    draggable: { type: Boolean, default: false },
    /** 全量数据，用于导出全部数据。如果提供此属性，导出时会使用此数据而非 dataSource */
    exportAllData: { type: Array as PropType<RowData[]>, default: undefined },
    /** 异步获取全量数据的函数，用于导出全部数据 */
    fetchAllData: { type: Function as PropType<() => Promise<RowData[]>>, default: undefined }
  },
  emits: ['update:selectedKeys', 'change', 'sortChange', 'columnOrderChange'],
  setup(props, { slots, emit, expose }) {
    const attrs = useAttrs();
    const sortState = ref<{ key: string; order: '' | 'asc' | 'desc' }>({ key: '', order: '' });
    const selected = computed(() => new Set(props.selectedKeys.map(String)));
    const checkboxColumn = computed(() =>
      props.columns.some((column) => column.type === 'checkbox') || props.showCheckbox
    );
    const visibleColumns = computed(() => props.columns.filter((column) => column.type !== 'checkbox'));
    const hasOperationColumn = computed(() => visibleColumns.value.some(isOperationColumn));

    // 拖拽状态
    const dragState = ref({
      dragging: false,
      fromIndex: -1,
      toIndex: -1,
      dragOverIndex: -1
    });

    /* 列太少时不冻结：本来就不会横向溢出，冻结只会白白占掉可滚动宽度 */
    const freezeLead = computed(() => visibleColumns.value.length > 2);
    const freezeTail = computed(
      () =>
        visibleColumns.value.length > 2 &&
        isOperationColumn(visibleColumns.value[visibleColumns.value.length - 1])
    );

    /** 数据列（不含勾选列）在冻结体系中的位置类名 */
    const stickyClass = (index: number) => ({
      'is-sticky-left': freezeLead.value && index === 0,
      /* 勾选列在前时，第一个数据列要让开它的宽度 */
      'is-sticky-left-offset': freezeLead.value && index === 0 && checkboxColumn.value,
      'is-sticky-right': freezeTail.value && index === visibleColumns.value.length - 1
    });

    /*
     * 第二个冻结列的左偏移必须是勾选列的**实际**宽度，不能写死。
     * 带操作列的表格用 table-layout: auto，浏览器可能把勾选列撑得比 CSS 里的
     * --vui-table-check-w 略宽；差多少就有多少像素的重叠——姓名列会压住勾选框。
     * 因此测量真实宽度写回 CSS 变量，由 ui.css 的 .is-sticky-left-offset 使用。
     */
    const tableEl = ref<HTMLTableElement | null>(null);
    let widthObserver: ResizeObserver | null = null;
    const syncCheckColumnWidth = () => {
      const table = tableEl.value;
      if (!table || !checkboxColumn.value) return;
      const first = table.querySelector('thead th');
      if (!first) return;
      const next = `${Math.round(first.getBoundingClientRect().width)}px`;
      // 只在变化时写入，避免与 ResizeObserver 形成回调循环
      if (table.style.getPropertyValue('--vui-table-check-w') !== next) {
        table.style.setProperty('--vui-table-check-w', next);
      }
    };

    onMounted(() => {
      syncCheckColumnWidth();
      if (typeof ResizeObserver === 'undefined' || !tableEl.value) return;
      widthObserver = new ResizeObserver(syncCheckColumnWidth);
      widthObserver.observe(tableEl.value);
    });
    /* 列定义或数据变化后表头会重建，需要重新量一次 */
    onUpdated(syncCheckColumnWidth);
    onBeforeUnmount(() => widthObserver?.disconnect());
    const childrenField = computed(() => props.treeProps.children || 'children');
    const rows = computed(() => {
      if (!props.defaultExpandAll) return props.dataSource.map((row) => ({ row, level: 0 }));
      const flattened: Array<{ row: RowData; level: number }> = [];
      const visit = (items: RowData[], level: number) => {
        items.forEach((row) => {
          flattened.push({ row, level });
          const children = row[childrenField.value];
          if (Array.isArray(children)) visit(children, level + 1);
        });
      };
      visit(props.dataSource, 0);
      return flattened;
    });
    /**
     * 操作列宽度：按各行实际渲染出的按钮文案算出最宽的一行，见 columnWidth.ts。
     * 页面声明的宽度对操作列一律不采纳——「编辑」一个按钮和「查看 / 通过 / 驳回」
     * 三个按钮所需的宽度差一倍以上，写死值只会留白或挤掉按钮。
     */
    const operationWidth = computed(() => {
      const column = visibleColumns.value.find(isOperationColumn);
      if (!column) return 0;
      const slot = column.customSlot ? slots[column.customSlot] : undefined;
      if (!slot) return OPERATION_COLUMN_MIN_WIDTH;
      return operationColumnWidth(
        rows.value.map(({ row }, index) =>
          collectButtonLabels(slot({ row, column, rowIndex: index }))
        )
      );
    });

    /**
     * 数据列按声明的固定 px 走。声明百分比会让浏览器先按比例分掉可用宽度、再把**剩余
     * 宽度全塞给没写百分比的列**——勾选列与姓名列就是这么被撑宽的。百分比由
     * test/table-column-width.test.mjs 在源码层禁掉，这里不静默兜，以免掩盖问题。
     */
    const columnStyle = (column: TableColumn) => {
      if (isOperationColumn(column)) {
        const width = `${operationWidth.value}px`;
        return { width, minWidth: width };
      }
      const width = sizeToCss(column.width);
      return width ? { width, minWidth: width } : undefined;
    };

    /** 各列所需宽度，用于算表格最小宽度；没写固定 px 的列按吸收列下限计 */
    const declaredColumnWidths = computed(() =>
      visibleColumns.value.map((column) => {
        if (isOperationColumn(column)) return operationWidth.value;
        const declared = /^(\d+)px$/.exec(sizeToCss(column.width) || '');
        return declared ? Number(declared[1]) : FLEXIBLE_COLUMN_MIN_WIDTH;
      })
    );
    const tableStyle = computed(() => ({
      minWidth: `${tableMinWidth(declaredColumnWidths.value, checkboxColumn.value)}px`
    }));

    const allKeys = computed(() =>
      rows.value.map(({ row }, index) => rowKey(row, props.id, index))
    );
    const allChecked = computed(
      () => allKeys.value.length > 0 && allKeys.value.every((key) => selected.value.has(String(key)))
    );
    const someChecked = computed(
      () => !allChecked.value && allKeys.value.some((key) => selected.value.has(String(key)))
    );

    const toggleRow = (key: unknown, checked: boolean) => {
      const next = new Map(props.selectedKeys.map((value) => [String(value), value]));
      if (checked) next.set(String(key), key);
      else next.delete(String(key));
      emit('update:selectedKeys', [...next.values()]);
    };
    const toggleAll = (checked: boolean) => {
      emit('update:selectedKeys', checked ? allKeys.value : []);
    };
    const sort = (column: TableColumn) => {
      if (!column.sort || !column.key) return;
      const order =
        sortState.value.key !== column.key || sortState.value.order === 'desc'
          ? 'asc'
          : sortState.value.order === 'asc'
            ? 'desc'
            : '';
      sortState.value = { key: column.key, order };
      emit('sortChange', column.key, order);
    };

    // 列拖拽功能
    const onColumnDragStart = (event: DragEvent, index: number) => {
      if (!props.draggable) return;
      dragState.value.dragging = true;
      dragState.value.fromIndex = index;
      event.dataTransfer!.effectAllowed = 'move';
      event.dataTransfer!.setData('text/plain', String(index));
      // 添加拖拽样式
      const th = event.target as HTMLElement;
      th.classList.add('is-dragging');
    };

    const onColumnDragOver = (event: DragEvent, index: number) => {
      if (!props.draggable || !dragState.value.dragging) return;
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'move';
      dragState.value.dragOverIndex = index;
      dragState.value.toIndex = index;
    };

    const onColumnDragLeave = (event: DragEvent) => {
      if (!props.draggable) return;
      const th = event.target as HTMLElement;
      th.classList.remove('is-drag-over');
    };

    const onColumnDragEnd = (event: DragEvent) => {
      if (!props.draggable) return;
      const th = event.target as HTMLElement;
      th.classList.remove('is-dragging');
      dragState.value.dragging = false;
      dragState.value.dragOverIndex = -1;
    };

    const onColumnDrop = (event: DragEvent, toIndex: number) => {
      if (!props.draggable) return;
      event.preventDefault();
      const fromIndex = dragState.value.fromIndex;
      if (fromIndex === -1 || fromIndex === toIndex) {
        dragState.value = { dragging: false, fromIndex: -1, toIndex: -1, dragOverIndex: -1 };
        return;
      }

      // 重新排列列
      const newColumns = [...props.columns];
      const [movedColumn] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, movedColumn);

      emit('columnOrderChange', newColumns, { fromIndex, toIndex });
      dragState.value = { dragging: false, fromIndex: -1, toIndex: -1, dragOverIndex: -1 };
    };

    const changePage = (current: number, limit?: number) => {
      if (!props.page || typeof props.page !== 'object') return;
      props.page.current = current;
      if (limit) props.page.limit = limit;
      emit('change', { ...props.page, current, limit: limit || props.page.limit });
    };

    // 导出相关状态和函数
    const exportDropdownOpen = ref(false);
    const exportLoading = ref(false);

    const exportCsv = (data: RowData[], filename: string) => {
      const columns = visibleColumns.value.filter((column) => !column.ignoreExport);
      const lines = [
        columns.map((column) => csvCell(column.title || column.key)).join(','),
        ...data.map((row) =>
          columns.map((column) => csvCell(row[column.key])).join(',')
        )
      ];
      const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    };

    const exportCurrentPage = () => {
      exportCsv(props.dataSource, '当前页数据');
      exportDropdownOpen.value = false;
    };

    const exportAll = async () => {
      exportLoading.value = true;
      exportDropdownOpen.value = false;
      try {
        let allData: RowData[];
        if (props.exportAllData) {
          allData = props.exportAllData;
        } else if (props.fetchAllData) {
          allData = await props.fetchAllData();
        } else {
          // 如果没有提供全量数据，则导出当前页
          allData = props.dataSource;
        }
        exportCsv(allData, '全量数据');
      } finally {
        exportLoading.value = false;
      }
    };

    const closeExportDropdown = () => {
      exportDropdownOpen.value = false;
    };

    // 点击外部关闭下拉菜单
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.vui-table-export-dropdown')) {
        exportDropdownOpen.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener('click', onDocumentClick);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', onDocumentClick);
    });

    expose({ reload: () => changePage(Number((props.page as Record<string, any>)?.current || 1)) });

    const renderCell = (
      column: TableColumn,
      row: RowData,
      index: number,
      level: number,
      columnIndex: number
    ) => {
      let content: VNodeChild;
      if (column.customSlot && slots[column.customSlot]) {
        content = slots[column.customSlot]?.({ row, column, rowIndex: index });
      } else if (typeof column.render === 'function') {
        content = column.render(h, { row, column, rowIndex: index });
      } else {
        content = displayValue(row[column.key]) || '-';
      }
      return h(
        'td',
        {
          key: column.key || column.title,
          class: classes(
            {
              'is-ellipsis': column.ellipsisTooltip
            },
            stickyClass(columnIndex)
          ),
          style: columnStyle(column),
          title: column.ellipsisTooltip ? displayValue(row[column.key]) : undefined
        },
        [
          h(
            'div',
            {
              class: 'vui-table-cell',
              style:
                level && column === visibleColumns.value[0]
                  ? { paddingLeft: `${level * 20 + 16}px` }
                  : undefined
            },
            [content]
          )
        ]
      );
    };

    return () => {
      const { class: incomingClass, style: incomingStyle, ...rest } = attrs;
      const page =
        props.page && typeof props.page === 'object'
          ? {
              current: Number(props.page.current || 1),
              limit: Number(props.page.limit || 10),
              total: Number(props.page.total || 0)
            }
          : null;
      const pageCount = page ? Math.max(1, Math.ceil(page.total / page.limit)) : 1;
      const tableHeight =
        props.height && props.height !== '100%' ? { maxHeight: sizeToCss(props.height) } : undefined;
      return h(
        'section',
        {
          ...rest,
          class: classes('vui-table', incomingClass, `is-${props.size}`),
          style: incomingStyle
        },
        [
          slots.toolbar || props.defaultToolbar
            ? h('div', { class: 'vui-table-toolbar' }, [
                h('div', { class: 'vui-table-toolbar-main' }, slots.toolbar?.()),
                props.defaultToolbar
                  ? h('div', { class: 'vui-table-tools' }, [
                      h(
                        'div',
                        { class: 'vui-table-export-dropdown' },
                        [
                          h(
                            'button',
                            {
                              type: 'button',
                              class: 'vui-icon-button',
                              title: '导出 CSV',
                              onClick: () => { exportDropdownOpen.value = !exportDropdownOpen.value; }
                            },
                            [
                              h(
                                'svg',
                                {
                                  width: 18,
                                  height: 18,
                                  viewBox: '0 0 24 24',
                                  fill: 'none',
                                  stroke: 'currentColor',
                                  'stroke-width': 1.8,
                                  'stroke-linecap': 'round',
                                  'stroke-linejoin': 'round',
                                  'aria-hidden': 'true',
                                  focusable: 'false'
                                },
                                [
                                  h('path', { d: 'M12 3v11' }),
                                  h('path', { d: 'm7.5 9.5 4.5 4.5 4.5-4.5' }),
                                  h('path', { d: 'M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15' })
                                ]
                              ),
                              h(VIcon, { class: 'vui-icon-button-arrow', type: 'chevron-down' })
                            ]
                          ),
                          exportDropdownOpen.value
                            ? h(
                                'div',
                                { class: 'vui-table-export-menu' },
                                [
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      class: 'vui-table-export-item',
                                      onClick: exportCurrentPage
                                    },
                                    [
                                      h(VIcon, { class: 'vui-table-export-icon', type: 'file-text' }),
                                      h('span', '导出当前页')
                                    ]
                                  ),
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      class: classes('vui-table-export-item', {
                                        'is-disabled': !props.exportAllData && !props.fetchAllData && !props.page,
                                        'is-loading': exportLoading.value
                                      }),
                                      disabled: !props.exportAllData && !props.fetchAllData && !props.page,
                                      onClick: exportAll
                                    },
                                    [
                                      h(VIcon, { class: 'vui-table-export-icon', type: 'table' }),
                                      h('span', exportLoading.value ? '导出中...' : '导出全部数据'),
                                      props.page
                                        ? h('span', { class: 'vui-table-export-hint' }, `共 ${props.page.total || 0} 条`)
                                        : null
                                    ]
                                  )
                                ]
                              )
                            : null
                        ]
                      )
                    ])
                  : null
              ])
            : null,
          h('div', { class: 'vui-table-scroll', style: tableHeight }, [
            h('table', {
              ref: tableEl,
              class: classes('vui-table-native', {
                'has-operation-column': hasOperationColumn.value
              }),
              style: tableStyle.value
            }, [
              h('thead', [
                h('tr', [
                  checkboxColumn.value
                    ? h('th', {
                        class: classes('vui-table-check', { 'is-sticky-left': freezeLead.value })
                      }, [
                        h('input', {
                          type: 'checkbox',
                          checked: allChecked.value,
                          indeterminate: someChecked.value,
                          'aria-label': '选择全部',
                          onChange: (event: Event) =>
                            toggleAll((event.target as HTMLInputElement).checked)
                        })
                      ])
                    : null,
                  ...visibleColumns.value.map((column, columnIndex) =>
                    h(
                      'th',
                      {
                        key: column.key || column.title,
                        class: classes(
                          {
                            'is-sortable': column.sort,
                            'is-draggable': props.draggable,
                            'is-drag-over': dragState.value.dragOverIndex === columnIndex
                          },
                          stickyClass(columnIndex)
                        ),
                        style: columnStyle(column),
                        draggable: props.draggable,
                        onClick: () => sort(column),
                        onDragstart: (event: DragEvent) => onColumnDragStart(event, columnIndex),
                        onDragover: (event: DragEvent) => onColumnDragOver(event, columnIndex),
                        onDragleave: onColumnDragLeave,
                        onDragend: onColumnDragEnd,
                        onDrop: (event: DragEvent) => onColumnDrop(event, columnIndex)
                      },
                      [
                        props.draggable
                          ? h(VIcon, { class: 'vui-table-drag-handle', type: 'drag-handle' })
                          : null,
                        h('span', column.title || column.key || ''),
                        column.sort
                          ? h(
                              'span',
                              { class: 'vui-table-sort' },
                              sortState.value.key === column.key
                                ? sortState.value.order === 'asc'
                                  ? '↑'
                                  : sortState.value.order === 'desc'
                                    ? '↓'
                                    : '↕'
                                : '↕'
                            )
                          : null
                      ]
                    )
                  )
                ])
              ]),
              h(
                'tbody',
                rows.value.length
                  ? rows.value.map(({ row, level }, index) => {
                      const key = rowKey(row, props.id, index);
                      const customClass =
                        typeof props.rowClassName === 'function'
                          ? props.rowClassName(row, index)
                          : props.rowClassName;
                      return h(
                        'tr',
                        {
                          key: String(key),
                          class: customClass,
                          onDblclick: () => slots.rowDoubleClick?.({ row, rowIndex: index })
                        },
                        [
                          checkboxColumn.value
                            ? h('td', {
                                class: classes('vui-table-check', {
                                  'is-sticky-left': freezeLead.value
                                })
                              }, [
                                h('input', {
                                  type: 'checkbox',
                                  checked: selected.value.has(String(key)),
                                  'aria-label': `选择第 ${index + 1} 行`,
                                  onChange: (event: Event) =>
                                    toggleRow(key, (event.target as HTMLInputElement).checked)
                                })
                              ])
                            : null,
                          ...visibleColumns.value.map((column, columnIndex) =>
                            renderCell(column, row, index, level, columnIndex)
                          )
                        ]
                      );
                    })
                  : [
                      h('tr', { class: 'vui-table-empty-row' }, [
                        h(
                          'td',
                          { colspan: visibleColumns.value.length + (checkboxColumn.value ? 1 : 0) },
                          [
                            h('div', { class: 'vui-empty' }, [
                              h('span', { class: 'vui-empty-icon' }, '◇'),
                              h('span', '暂无数据')
                            ])
                          ]
                        )
                      ])
                    ]
              )
            ])
          ]),
          page
            ? h('footer', { class: 'vui-pagination' }, [
                h('span', { class: 'vui-pagination-total' }, `共 ${page.total} 条`),
                h(
                  'button',
                  {
                    type: 'button',
                    disabled: page.current <= 1,
                    onClick: () => changePage(page.current - 1)
                  },
                  '‹'
                ),
                h('span', { class: 'vui-pagination-current' }, `${page.current} / ${pageCount}`),
                h(
                  'button',
                  {
                    type: 'button',
                    disabled: page.current >= pageCount,
                    onClick: () => changePage(page.current + 1)
                  },
                  '›'
                ),
                h(
                  'select',
                  {
                    value: page.limit,
                    'aria-label': '每页数量',
                    onChange: (event: Event) =>
                      changePage(1, Number((event.target as HTMLSelectElement).value))
                  },
                  [10, 20, 30, 50, 100].map((limit) =>
                    h('option', { value: limit }, `${limit} 条/页`)
                  )
                )
              ])
            : null,
          props.loading
            ? h('div', { class: 'vui-table-loading', role: 'status' }, [
                h('span', { class: 'vui-spinner' }),
                h('span', '正在加载')
              ])
            : null
        ]
      );
    };
  }
});

/** 按分组网格展示实体详情。 @category data @props title::详情区域标题;column::每行列数;border::是否显示边框;labelWidth::标签列宽度 */
export const VDescriptions = defineComponent({
  name: 'VDescriptions',
  inheritAttrs: false,
  props: {
    title: { type: String, default: '' },
    column: { type: [Number, String], default: 3 },
    border: { type: Boolean, default: false },
    labelWidth: { type: [Number, String], default: '' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'section',
        {
          ...rest,
          class: classes('vui-descriptions', incomingClass, { 'is-bordered': props.border }),
          style: mergeStyles(
            {
              '--vui-description-columns': Math.max(1, Number(props.column) || 1),
              '--vui-description-label-width': sizeToCss(props.labelWidth) || 'auto'
            },
            style as never
          )
        },
        [
          props.title ? h('h3', { class: 'vui-descriptions-title' }, props.title) : null,
          h('div', { class: 'vui-descriptions-grid' }, slots.default?.())
        ]
      );
    };
  }
});

/** 详情描述列表中的单个字段。 @category data @props label::字段标签;span::跨越的列数 @related VDescriptions */
export const VDescriptionsItem = defineComponent({
  name: 'VDescriptionsItem',
  inheritAttrs: false,
  props: {
    label: { type: String, default: '' },
    span: { type: [Number, String], default: 1 }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-descriptions-item', incomingClass),
          style: mergeStyles(
            { gridColumn: `span ${Math.max(1, Number(props.span) || 1)}` },
            style as never
          )
        },
        [
          h('div', { class: 'vui-descriptions-label' }, props.label),
          h('div', { class: 'vui-descriptions-value' }, slots.default?.() || '-')
        ]
      );
    };
  }
});

/** 展示和选择层级数据。 @category data @props data::树节点数据;checkedKeys::当前勾选的节点键;selectedKey::当前选中的节点键;showCheckbox::是否显示复选框;showIcon::是否显示节点图标;draggable::是否允许拖拽节点;defaultExpandAll::是否默认展开全部节点;expandedKeys::受控的已展开节点键;replaceFields::自定义字段映射 @event update:checkedKeys :: unknown[] :: 更新后的勾选键 @event update:selectedKey :: PropertyKey | null :: 更新后的选中键 @event update:expandedKeys :: unknown[] :: 更新后的展开键 @event check :: [unknown[], Record<string, unknown>] :: 勾选状态变更 @event select :: RowData :: 节点选择 @event nodeClick :: [RowData, Record<string, unknown>, MouseEvent] :: 节点单击 @event nodeDblclick :: [RowData, Record<string, unknown>, MouseEvent] :: 节点双击 @event nodeContextmenu :: [RowData, Record<string, unknown>, MouseEvent] :: 节点上下文菜单 @event expand :: [boolean, RowData] :: 展开状态变更 @event dragstart :: [RowData, DragEvent] :: 开始拖拽 @event dragover :: [RowData, DragEvent] :: 拖拽经过节点 @event drop :: [RowData, RowData, string, DragEvent] :: 放置节点 @event dragend :: [RowData, DragEvent] :: 结束拖拽 */
export const VTree = defineComponent({
  name: 'VTree',
  inheritAttrs: false,
  props: {
    data: { type: Array as PropType<RowData[]>, default: () => [] },
    checkedKeys: { type: Array as PropType<unknown[]>, default: () => [] },
    selectedKey: { type: null, default: '' },
    showCheckbox: { type: Boolean, default: false },
    showIcon: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false },
    defaultExpandAll: { type: Boolean, default: false },
    expandedKeys: { type: Array as PropType<unknown[]>, default: undefined },
    replaceFields: { type: Object as PropType<Record<string, string>>, default: () => ({}) }
  },
  emits: [
    'update:checkedKeys',
    'update:selectedKey',
    'update:expandedKeys',
    'check',
    'select',
    'nodeClick',
    'nodeDblclick',
    'nodeContextmenu',
    'expand',
    'dragstart',
    'dragover',
    'drop',
    'dragend'
  ],
  setup(props, { emit, slots, expose }) {
    const attrs = useAttrs();
    const checked = computed(() => new Set(props.checkedKeys.map(String)));
    const field = (name: string, fallback: string) => props.replaceFields[name] || fallback;

    // 展开状态管理
    const innerExpandedKeys = ref<Set<string>>(new Set());
    const expanded = computed(() => {
      if (props.expandedKeys !== undefined) {
        return new Set(props.expandedKeys.map(String));
      }
      return innerExpandedKeys.value;
    });

    // 初始化展开状态
    const initExpanded = (nodes: RowData[], level: number) => {
      if (props.defaultExpandAll) {
        nodes.forEach((node) => {
          const key = String(node[field('key', 'id')] ?? node._id ?? '');
          const children = node[field('children', 'children')];
          if (Array.isArray(children) && children.length) {
            innerExpandedKeys.value.add(key);
            initExpanded(children, level + 1);
          }
        });
      }
    };

    onMounted(() => {
      initExpanded(props.data, 0);
    });

    // 切换展开状态
    const toggleExpand = (key: string, node: RowData) => {
      const isExpanded = expanded.value.has(key);
      const newExpanded = new Set(expanded.value);

      if (isExpanded) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }

      if (props.expandedKeys !== undefined) {
        emit('update:expandedKeys', [...newExpanded]);
      } else {
        innerExpandedKeys.value = newExpanded;
      }

      emit('expand', !isExpanded, node);
    };

    // 选中状态管理
    const toggleSelect = (key: unknown, node: RowData) => {
      emit('update:selectedKey', key);
      emit('select', node);
    };

    // 获取所有子节点的key
    const getAllChildKeys = (node: RowData): unknown[] => {
      const keys: unknown[] = [];
      const children = node[field('children', 'children')];
      if (Array.isArray(children)) {
        children.forEach((child) => {
          const key = child[field('key', 'id')] ?? child._id;
          keys.push(key);
          keys.push(...getAllChildKeys(child));
        });
      }
      return keys;
    };

    // 获取父节点
    const findParentNode = (targetKey: unknown, nodes: RowData[], parent: RowData | null = null): RowData | null => {
      for (const node of nodes) {
        const key = node[field('key', 'id')] ?? node._id;
        if (String(key) === String(targetKey)) {
          return parent;
        }
        const children = node[field('children', 'children')];
        if (Array.isArray(children)) {
          const found = findParentNode(targetKey, children, node);
          if (found !== undefined) return found;
        }
      }
      return null;
    };

    // 计算节点的选中状态
    const getNodeCheckStatus = (node: RowData): 'checked' | 'indeterminate' | 'unchecked' => {
      const key = node[field('key', 'id')] ?? node._id;
      const children = node[field('children', 'children')];

      // 叶子节点
      if (!Array.isArray(children) || children.length === 0) {
        return checkedSet.value.has(String(key)) ? 'checked' : 'unchecked';
      }

      // 有子节点，递归计算
      let checkedCount = 0;
      let indeterminateCount = 0;

      for (const child of children) {
        const status = getNodeCheckStatus(child);
        if (status === 'checked') checkedCount++;
        else if (status === 'indeterminate') indeterminateCount++;
      }

      if (checkedCount === children.length) return 'checked';
      if (checkedCount > 0 || indeterminateCount > 0) return 'indeterminate';
      return 'unchecked';
    };

    // 更新父节点选中状态
    const updateParentCheckStatus = (key: unknown, checkedKeysMap: Map<string, unknown>) => {
      const parent = findParentNode(key, props.data);
      if (!parent) return;

      const parentKey = parent[field('key', 'id')] ?? parent._id;
      const parentKeyStr = String(parentKey);
      const parentStatus = getNodeCheckStatus(parent);

      if (parentStatus === 'checked') {
        checkedKeysMap.set(parentKeyStr, parentKey);
      } else {
        checkedKeysMap.delete(parentKeyStr);
      }

      // 递归更新上层父节点
      updateParentCheckStatus(parentKey, checkedKeysMap);
    };

    // 复选框切换（支持父子联动）
    const toggle = (key: unknown, enabled: boolean, node: RowData) => {
      const checkedKeysMap = new Map(props.checkedKeys.map((value) => [String(value), value]));

      // 获取当前节点
      const currentNode = node || findNodeByKey(key, props.data);
      if (!currentNode) return;

      // 更新当前节点
      if (enabled) {
        checkedKeysMap.set(String(key), key);
      } else {
        checkedKeysMap.delete(String(key));
      }

      // 联动子节点
      const childKeys = getAllChildKeys(currentNode);
      childKeys.forEach((childKey) => {
        if (enabled) {
          checkedKeysMap.set(String(childKey), childKey);
        } else {
          checkedKeysMap.delete(String(childKey));
        }
      });

      // 联动父节点
      updateParentCheckStatus(key, checkedKeysMap);

      const values = [...checkedKeysMap.values()];
      emit('update:checkedKeys', values);
      emit('check', values, { key, checked: enabled, node: currentNode });
    };

    // 根据key查找节点
    const findNodeByKey = (targetKey: unknown, nodes: RowData[]): RowData | null => {
      for (const node of nodes) {
        const key = node[field('key', 'id')] ?? node._id;
        if (String(key) === String(targetKey)) return node;
        const children = node[field('children', 'children')];
        if (Array.isArray(children)) {
          const found = findNodeByKey(targetKey, children);
          if (found) return found;
        }
      }
      return null;
    };

    // 计算checkedSet
    const checkedSet = computed(() => new Set(props.checkedKeys.map(String)));

    // 拖拽状态
    const dragState = ref({
      dragging: false,
      dragNode: null as RowData | null,
      dropNode: null as RowData | null,
      dropPosition: 0 // -1: 上方, 0: 内部, 1: 下方
    });

    const onDragStart = (event: DragEvent, node: RowData) => {
      if (!props.draggable) return;
      dragState.value.dragging = true;
      dragState.value.dragNode = node;
      event.dataTransfer!.effectAllowed = 'move';
      emit('dragstart', node, event);
    };

    const onDragOver = (event: DragEvent, node: RowData) => {
      if (!props.draggable || !dragState.value.dragging) return;
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'move';

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const y = event.clientY - rect.top;
      const height = rect.height;

      // 计算放置位置
      if (y < height * 0.25) {
        dragState.value.dropPosition = -1;
      } else if (y > height * 0.75) {
        dragState.value.dropPosition = 1;
      } else {
        dragState.value.dropPosition = 0;
      }

      dragState.value.dropNode = node;
      emit('dragover', node, event);
    };

    const onDrop = (event: DragEvent, node: RowData) => {
      if (!props.draggable || !dragState.value.dragNode) return;
      event.preventDefault();
      emit('drop', dragState.value.dragNode, node, dragState.value.dropPosition, event);
      dragState.value = { dragging: false, dragNode: null, dropNode: null, dropPosition: 0 };
    };

    const onDragEnd = (event: DragEvent) => {
      if (!props.draggable) return;
      emit('dragend', dragState.value.dragNode, event);
      dragState.value = { dragging: false, dragNode: null, dropNode: null, dropPosition: 0 };
    };

    // 获取节点路径
    const getNodePath = (targetKey: unknown, nodes: RowData[], path: RowData[] = []): RowData[] | null => {
      for (const node of nodes) {
        const key = node[field('key', 'id')] ?? node._id;
        const currentPath = [...path, node];

        if (String(key) === String(targetKey)) {
          return currentPath;
        }

        const children = node[field('children', 'children')];
        if (Array.isArray(children)) {
          const found = getNodePath(targetKey, children, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    const renderNodes = (nodes: RowData[], level = 0): VNode[] =>
      nodes.map((node, index) => {
        const key = node[field('key', 'id')] ?? node._id ?? index;
        const keyStr = String(key);
        const title = node[field('title', 'title')] ?? node.name ?? key;
        const icon = node[field('icon', 'icon')] ?? node.icon;
        const children = node[field('children', 'children')];
        const hasChildren = Array.isArray(children) && children.length;
        const isExpanded = expanded.value.has(keyStr);
        const isSelected = String(props.selectedKey) === keyStr;
        const isDragging = dragState.value.dragNode === node;
        const isDropTarget = dragState.value.dropNode === node;

        const checkStatus = hasChildren ? getNodeCheckStatus(node) : (checkedSet.value.has(keyStr) ? 'checked' : 'unchecked');

        const nodeContext = {
          node,
          key,
          title,
          level,
          path: getNodePath(key, props.data) || [node],
          isLeaf: !hasChildren,
          isExpanded,
          isSelected,
          isChecked: checkedSet.value.has(keyStr),
          checkStatus
        };

        // 点击行时的处理
        const handleLineClick = (event: MouseEvent) => {
          // 如果点击的是展开/折叠按钮或操作按钮，不处理
          const target = event.target as HTMLElement;
          if (target.closest('.vui-tree-switcher') || target.closest('.vui-tree-operations')) {
            return;
          }

          // 触发节点选中（单选）
          toggleSelect(key, node);

          // 如果启用了复选框，点击行也切换复选框状态
          if (props.showCheckbox) {
            const isChecked = checkedSet.value.has(keyStr);
            toggle(key, !isChecked, node);
          }

          emit('nodeClick', node, nodeContext, event);
        };

        return h('li', {
          key: keyStr,
          class: classes('vui-tree-node', {
            'is-expanded': isExpanded,
            'is-selected': isSelected,
            'is-checked': checkedSet.value.has(keyStr),
            'is-dragging': isDragging,
            'is-drop-above': isDropTarget && dragState.value.dropPosition === -1,
            'is-drop-inside': isDropTarget && dragState.value.dropPosition === 0,
            'is-drop-below': isDropTarget && dragState.value.dropPosition === 1
          }),
          draggable: props.draggable,
          onDragstart: (event: DragEvent) => onDragStart(event, node),
          onDragover: (event: DragEvent) => onDragOver(event, node),
          onDrop: (event: DragEvent) => onDrop(event, node),
          onDragend: onDragEnd
        }, [
          h(
            'div',
            {
              class: classes('vui-tree-line', { 'is-selected': isSelected }),
              style: { paddingLeft: `${level * 20 + 10}px` },
              onClick: handleLineClick,
              onDblclick: (event: MouseEvent) => {
                emit('nodeDblclick', node, nodeContext, event);
              },
              onContextmenu: (event: MouseEvent) => {
                event.preventDefault();
                emit('nodeContextmenu', node, nodeContext, event);
              }
            },
            [
              // 展开/折叠图标
              hasChildren
                ? h(
                    'span',
                    {
                      class: classes('vui-tree-switcher', { 'is-expanded': isExpanded }),
                      role: 'button',
                      'aria-expanded': String(isExpanded),
                      'aria-label': isExpanded ? '折叠' : '展开',
                      onClick: (event: MouseEvent) => {
                        event.stopPropagation();
                        toggleExpand(keyStr, node);
                      }
                    },
                    [
                      h(
                        'svg',
                        {
                          class: 'vui-tree-switcher-icon',
                          viewBox: '0 0 24 24',
                          fill: 'none',
                          stroke: 'currentColor',
                          'stroke-width': 2.5,
                          'stroke-linecap': 'round',
                          'stroke-linejoin': 'round'
                        },
                        [h('path', { d: 'M9 6l6 6-6 6' })]
                      )
                    ]
                  )
                : h(
                    'span',
                    { class: 'vui-tree-switcher is-leaf' },
                    [
                      slots.leafIcon?.() || h(
                        'svg',
                        {
                          class: 'vui-tree-leaf-icon',
                          viewBox: '0 0 24 24',
                          fill: 'none',
                          stroke: 'currentColor',
                          'stroke-width': 2,
                          'stroke-linecap': 'round',
                          'stroke-linejoin': 'round'
                        },
                        [h('circle', { cx: 12, cy: 12, r: 3 })]
                      )
                    ]
                  ),

              // 自定义图标
              props.showIcon && (icon || slots.icon)
                ? h(
                    'span',
                    { class: 'vui-tree-icon' },
                    slots.icon?.(nodeContext) || (typeof icon === 'string'
                      ? (hasIcon(icon) ? h(VIcon, { type: icon }) : h('span', { class: icon }))
                      : undefined)
                  )
                : null,

              // 复选框
              props.showCheckbox
                ? (() => {
                    const checkStatus = hasChildren ? getNodeCheckStatus(node) : (checkedSet.value.has(keyStr) ? 'checked' : 'unchecked');
                    const isChecked = checkStatus === 'checked';
                    const isIndeterminate = checkStatus === 'indeterminate';
                    return h('span', {
                      class: classes('vui-tree-checkbox', {
                        'is-checked': isChecked,
                        'is-indeterminate': isIndeterminate
                      }),
                      onClick: (event: MouseEvent) => {
                        event.stopPropagation();
                        toggle(key, !isChecked, node);
                      }
                    }, [
                      h('input', {
                        type: 'checkbox',
                        checked: isChecked,
                        indeterminate: isIndeterminate,
                        'aria-label': `选择 ${title}`,
                        onChange: (event: Event) => {
                          toggle(key, (event.target as HTMLInputElement).checked, node);
                        }
                      }),
                      h('span', { class: 'vui-tree-checkbox-inner' })
                    ]);
                  })()
                : null,

              // 标题
              h(
                'span',
                {
                  class: classes('vui-tree-title', { 'is-selected': isSelected })
                },
                slots.title?.(nodeContext) || displayValue(title)
              ),

              // 操作按钮
              slots.operations
                ? h('span', { class: 'vui-tree-operations' }, slots.operations(nodeContext))
                : null
            ]
          ),
          // 子节点
          hasChildren && isExpanded
            ? h('ul', { class: 'vui-tree-children' }, renderNodes(children!, level + 1))
            : null
        ]);
      });

    // 暴露方法
    const expandAll = () => {
      const keys: string[] = [];
      const collectKeys = (nodes: RowData[]) => {
        nodes.forEach((node) => {
          const key = String(node[field('key', 'id')] ?? node._id ?? '');
          const children = node[field('children', 'children')];
          if (Array.isArray(children) && children.length) {
            keys.push(key);
            collectKeys(children);
          }
        });
      };
      collectKeys(props.data);
      if (props.expandedKeys !== undefined) {
        emit('update:expandedKeys', keys);
      } else {
        innerExpandedKeys.value = new Set(keys);
      }
    };

    const collapseAll = () => {
      if (props.expandedKeys !== undefined) {
        emit('update:expandedKeys', []);
      } else {
        innerExpandedKeys.value = new Set();
      }
    };

    const expandNode = (key: unknown) => {
      const keyStr = String(key);
      if (!expanded.value.has(keyStr)) {
        toggleExpand(keyStr, {} as RowData);
      }
    };

    const collapseNode = (key: unknown) => {
      const keyStr = String(key);
      if (expanded.value.has(keyStr)) {
        toggleExpand(keyStr, {} as RowData);
      }
    };

    expose?.({ expandAll, collapseAll, expandNode, collapseNode });

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'ul',
        {
          ...rest,
          class: classes('vui-tree', incomingClass, {
            'is-draggable': props.draggable
          }),
          style
        },
        renderNodes(props.data)
      );
    };
  }
});

interface TabContext {
  active: Ref<unknown>;
  select: (id: unknown) => void;
  close: (id: unknown) => void;
}
const TAB_KEY: InjectionKey<TabContext> = Symbol('VuiTab');

/** 在同一区域切换多组内容。 @category navigation @props modelValue::当前激活的标签页键;type::标签页视觉类型;allowClose::是否允许关闭标签页 @event update:modelValue :: string | number :: 更新后的标签页键 @event change :: string | number :: 标签页变更 */
export const VTab = defineComponent({
  name: 'VTab',
  inheritAttrs: false,
  props: {
    modelValue: { type: null, default: '' },
    type: { type: String, default: '' },
    allowClose: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change', 'close'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    const active = computed(() => props.modelValue);
    provide(TAB_KEY, {
      active,
      select: (id) => {
        emit('update:modelValue', id);
        emit('change', id);
      },
      close: (id) => emit('close', id)
    });
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-tabs', incomingClass, `is-${props.type}`),
          style
        },
        slots.default?.()
      );
    };
  }
});

/** 标签页中的单个内容面板。 @category navigation @props id::面板唯一键;title::标签标题;closable::该标签是否可关闭 @related VTab */
export const VTabItem = defineComponent({
  name: 'VTabItem',
  inheritAttrs: false,
  props: {
    id: { type: null, default: '' },
    title: { type: String, default: '' },
    closable: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const tab = inject(TAB_KEY, undefined);
    return () => {
      const active = String(tab?.active.value) === String(props.id);
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'section',
        {
          ...rest,
          class: classes('vui-tab-item', incomingClass, { 'is-active': active }),
          style
        },
        [
          h('div', { class: 'vui-tab-title', onClick: () => tab?.select(props.id) }, [
            h('span', props.title),
            props.closable
              ? h(
                  'button',
                  {
                    type: 'button',
                    'aria-label': `关闭${props.title}`,
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation();
                      tab?.close(props.id);
                    }
                  },
                  h(VIcon, { type: 'close' })
                )
              : null
          ]),
          active ? h('div', { class: 'vui-tab-content' }, slots.default?.()) : null
        ]
      );
    };
  }
});

interface CollapseContext {
  open: Ref<unknown>;
  accordion: boolean;
  toggle: (id: unknown) => void;
}
const COLLAPSE_KEY: InjectionKey<CollapseContext> = Symbol('VuiCollapse');

/** 管理一组可折叠内容。 @category data @props modelValue::当前展开项键或键数组;accordion::是否手风琴单开 @event update:modelValue :: string | number :: 更新后的展开项键 @event change :: string | number :: 展开项变更 */
export const VCollapse = defineComponent({
  name: 'VCollapse',
  inheritAttrs: false,
  props: {
    modelValue: { type: null, default: '' },
    accordion: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    const open = computed(() => props.modelValue);
    provide(COLLAPSE_KEY, {
      open,
      accordion: props.accordion,
      toggle: (id) => {
        const next = String(props.modelValue) === String(id) ? '' : id;
        emit('update:modelValue', next);
        emit('change', next);
      }
    });
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        { ...rest, class: classes('vui-collapse', incomingClass), style },
        slots.default?.()
      );
    };
  }
});

/** 折叠面板中的单个内容项。 @category data @props id::内容项唯一键;title::内容项标题 @related VCollapse */
export const VCollapseItem = defineComponent({
  name: 'VCollapseItem',
  inheritAttrs: false,
  props: {
    id: { type: null, default: '' },
    title: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    const collapse = inject(COLLAPSE_KEY, undefined);
    return () => {
      const opened = String(collapse?.open.value) === String(props.id);
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'section',
        {
          ...rest,
          class: classes('vui-collapse-item', incomingClass, {
            'is-open': opened
          }),
          style
        },
        [
          h(
            'button',
            { type: 'button', class: 'vui-collapse-title', onClick: () => collapse?.toggle(props.id) },
            [h('span', props.title), h('span', opened ? '−' : '+')]
          ),
          opened ? h('div', { class: 'vui-collapse-content' }, slots.default?.()) : null
        ]
      );
    };
  }
});

// ==================== Pagination 分页 ====================

/** 在分页数据集合之间导航。 @category navigation @props current::当前页码;total::数据总条数;pageSize::每页条数;pageSizes::可选每页条数;layout::分页子控件布局;pagerCount::最多显示的页码按钮数;disabled::是否禁用;hideOnSinglePage::单页时是否隐藏;background::页码按钮是否有背景 @event update:current :: number :: 更新后的页码 @event update:pageSize :: number :: 更新后的每页条数 @event change :: [number, number] :: 页码和每页条数变更 @event sizeChange :: number :: 每页条数变更 */
export const VPagination = defineComponent({
  name: 'VPagination',
  inheritAttrs: false,
  props: {
    current: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    pageSize: { type: Number, default: 10 },
    pageSizes: { type: Array as PropType<number[]>, default: () => [10, 20, 30, 50, 100] },
    layout: { type: String, default: 'prev, pager, next, jumper, total' },
    pagerCount: { type: Number, default: 7 },
    disabled: { type: Boolean, default: false },
    hideOnSinglePage: { type: Boolean, default: false },
    background: { type: Boolean, default: false }
  },
  emits: ['update:current', 'update:pageSize', 'change', 'sizeChange'],
  setup(props, { emit }) {
    const attrs = useAttrs();
    const jumpPage = ref('');

    const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

    const pagers = computed(() => {
      const total = pageCount.value;
      const current = props.current;
      const count = props.pagerCount;
      const half = Math.floor(count / 2);

      if (total <= count) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }

      let start = Math.max(2, current - half);
      let end = Math.min(total - 1, current + half);

      if (current - half < 2) {
        end = count - 1;
      }
      if (current + half > total - 1) {
        start = total - count + 2;
      }

      const pages: (number | string)[] = [1];
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < total - 1) pages.push('...');
      pages.push(total);
      return pages;
    });

    const changePage = (page: number) => {
      if (page < 1 || page > pageCount.value || page === props.current || props.disabled) return;
      emit('update:current', page);
      emit('change', page, props.pageSize);
    };

    const changePageSize = (size: number) => {
      if (size === props.pageSize || props.disabled) return;
      emit('update:pageSize', size);
      emit('sizeChange', size);
      const newPageCount = Math.ceil(props.total / size);
      if (props.current > newPageCount) {
        changePage(newPageCount);
      }
    };

    const handleJump = () => {
      const page = parseInt(jumpPage.value, 10);
      if (!isNaN(page) && page >= 1 && page <= pageCount.value) {
        changePage(page);
      }
      jumpPage.value = '';
    };

    if (props.hideOnSinglePage && pageCount.value <= 1) {
      return () => null;
    }

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const parts = props.layout.split(',').map((s) => s.trim());

      return h(
        'div',
        {
          ...rest,
          class: classes('vui-pagination', incomingClass, {
            'is-background': props.background,
            'is-disabled': props.disabled
          }),
          style
        },
        [
          parts.includes('total')
            ? h('span', { class: 'vui-pagination-total' }, `共 ${props.total} 条`)
            : null,
          parts.includes('prev')
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'vui-pagination-prev',
                  disabled: props.current <= 1 || props.disabled,
                  'aria-label': '上一页',
                  onClick: () => changePage(props.current - 1)
                },
                '‹'
              )
            : null,
          parts.includes('pager')
            ? h(
                'div',
                { class: 'vui-pagination-pager', role: 'navigation' },
                pagers.value.map((page) => {
                  if (page === '...') {
                    return h('span', { class: 'vui-pagination-ellipsis', key: '...' }, '…');
                  }
                  const pageNum = page as number;
                  return h(
                    'button',
                    {
                      type: 'button',
                      key: pageNum,
                      class: classes('vui-pagination-page', {
                        'is-active': pageNum === props.current
                      }),
                      'aria-label': `第 ${pageNum} 页`,
                      'aria-current': pageNum === props.current ? 'page' : undefined,
                      onClick: () => changePage(pageNum)
                    },
                    String(pageNum)
                  );
                })
              )
            : null,
          parts.includes('next')
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'vui-pagination-next',
                  disabled: props.current >= pageCount.value || props.disabled,
                  'aria-label': '下一页',
                  onClick: () => changePage(props.current + 1)
                },
                '›'
              )
            : null,
          parts.includes('sizes')
            ? h(
                'select',
                {
                  class: 'vui-pagination-sizes',
                  value: props.pageSize,
                  disabled: props.disabled,
                  'aria-label': '每页条数',
                  onChange: (event: Event) => changePageSize(Number((event.target as HTMLSelectElement).value))
                },
                props.pageSizes.map((size) =>
                  h('option', { value: size, key: size }, `${size} 条/页`)
                )
              )
            : null,
          parts.includes('jumper')
            ? h('div', { class: 'vui-pagination-jumper' }, [
                h('span', {}, '前往'),
                h('input', {
                  type: 'number',
                  min: 1,
                  max: pageCount.value,
                  value: jumpPage.value,
                  disabled: props.disabled,
                  'aria-label': '跳转页码',
                  onInput: (event: Event) => {
                    jumpPage.value = (event.target as HTMLInputElement).value;
                  },
                  onKeydown: (event: KeyboardEvent) => {
                    if (event.key === 'Enter') handleJump();
                  },
                  onBlur: handleJump
                }),
                h('span', {}, '页')
              ])
            : null
        ]
      );
    };
  }
});

// ==================== Steps 步骤条 ====================

/** 展示多步骤流程的当前进度。 @category navigation @props active::当前步骤索引;direction::排列方向;processStatus::当前步骤状态;finishStatus::已完成步骤状态;alignCenter::是否居中对齐;simple::是否使用简洁模式 @event change :: number :: 点击的步骤索引 */
export const VSteps = defineComponent({
  name: 'VSteps',
  inheritAttrs: false,
  props: {
    active: { type: Number, default: 0 },
    direction: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    processStatus: { type: String as PropType<'wait' | 'process' | 'finish' | 'error' | 'success'>, default: 'process' },
    finishStatus: { type: String as PropType<'wait' | 'process' | 'finish' | 'error' | 'success'>, default: 'finish' },
    alignCenter: { type: Boolean, default: false },
    simple: { type: Boolean, default: false }
  },
  emits: ['change'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs();
    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      const children = slots.default?.() || [];
      return h(
        'div',
        {
          ...rest,
          class: classes('vui-steps', incomingClass, `is-${props.direction}`, {
            'is-simple': props.simple,
            'is-center': props.alignCenter
          }),
          style,
          role: 'navigation'
        },
        children.map((child, index) => {
          const status = index < props.active
            ? props.finishStatus
            : index === props.active
              ? props.processStatus
              : 'wait';
          return h(
            'div',
            {
              key: index,
              class: classes('vui-step', `is-${status}`, {
                'is-active': index === props.active
              }),
              onClick: () => emit('change', index)
            },
            [
              h('div', { class: 'vui-step-head' }, [
                h('div', { class: 'vui-step-line' }),
                h(
                  'div',
                  { class: 'vui-step-icon' },
                  [
                    slots[`step-${index}-icon`]?.() ||
                    h('span', { class: 'vui-step-number' }, String(index + 1))
                  ]
                )
              ]),
              h('div', { class: 'vui-step-main' }, [
                h('div', { class: 'vui-step-title' }, child.props?.title || `步骤 ${index + 1}`),
                child.props?.description || slots[`step-${index}-description`]
                  ? h(
                      'div',
                      { class: 'vui-step-description' },
                      slots[`step-${index}-description`]?.() || child.props?.description
                    )
                  : null
              ])
            ]
          );
        })
      );
    };
  }
});

/** 步骤条中的单个步骤。 @category navigation @props title::步骤标题;description::步骤说明;icon::步骤 SVG 图标名;status::覆盖自动计算的状态 @related VSteps */
export const VStep = defineComponent({
  name: 'VStep',
  inheritAttrs: false,
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    status: { type: String as PropType<'wait' | 'process' | 'finish' | 'error' | 'success'>, default: '' }
  },
  setup(_, { slots }) {
    return () => h('div', {}, slots.default?.());
  }
});

// ==================== Statistic 统计数值 ====================

/** 突出展示关键统计数值。 @category data @props value::统计值;title::指标标题;precision::小数位数;prefix::数值前缀;suffix::数值后缀;valueStyle::数值区域样式;groupSeparator::千位分隔符 */
export const VStatistic = defineComponent({
  name: 'VStatistic',
  inheritAttrs: false,
  props: {
    value: { type: [Number, String], default: 0 },
    title: { type: String, default: '' },
    precision: { type: Number, default: undefined },
    prefix: { type: String, default: '' },
    suffix: { type: String, default: '' },
    valueStyle: { type: Object, default: () => ({}) },
    groupSeparator: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();

    const formattedValue = computed(() => {
      let val = String(props.value);
      const num = Number(props.value);

      if (!isNaN(num) && props.precision !== undefined) {
        val = num.toFixed(props.precision);
      }

      if (!isNaN(num) && props.groupSeparator) {
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        val = parts.join('.');
      }

      return val;
    });

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        { ...rest, class: classes('vui-statistic', incomingClass), style },
        [
          props.title || slots.title
            ? h('div', { class: 'vui-statistic-title' }, slots.title?.() || props.title)
            : null,
          h(
            'div',
            { class: 'vui-statistic-content', style: props.valueStyle },
            [
              props.prefix || slots.prefix
                ? h('span', { class: 'vui-statistic-prefix' }, slots.prefix?.() || props.prefix)
                : null,
              h('span', { class: 'vui-statistic-value' }, slots.default?.() || formattedValue.value),
              props.suffix || slots.suffix
                ? h('span', { class: 'vui-statistic-suffix' }, slots.suffix?.() || props.suffix)
                : null
            ]
          )
        ]
      );
    };
  }
});

// ==================== Countdown 倒计时 ====================

/** 展示到目标时间的倒计时。 @category data @props value::目标时间戳或 Date;format::倒计时格式模板;title::指标标题;prefix::倒计时前缀;suffix::倒计时后缀 @event finish :: void :: 倒计时结束 @event change :: number :: 剩余毫秒数变更 */
export const VCountdown = defineComponent({
  name: 'VCountdown',
  inheritAttrs: false,
  props: {
    value: { type: [Number, Date], default: 0 },
    format: { type: String, default: 'HH:mm:ss' },
    title: { type: String, default: '' },
    prefix: { type: String, default: '' },
    suffix: { type: String, default: '' }
  },
  emits: ['finish', 'change'],
  setup(props, { emit, slots }) {
    const attrs = useAttrs();
    const remaining = ref(0);
    let timer: ReturnType<typeof setInterval> | null = null;

    const targetTime = computed(() => {
      if (props.value instanceof Date) return props.value.getTime();
      return Number(props.value);
    });

    const formatTime = (ms: number): string => {
      if (ms <= 0) return '00:00:00';

      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      const pad = (n: number) => String(n).padStart(2, '0');

      let result = props.format;
      result = result.replace('DD', pad(days));
      result = result.replace('HH', pad(hours % 24));
      result = result.replace('mm', pad(minutes % 60));
      result = result.replace('ss', pad(seconds % 60));
      result = result.replace('SSS', pad(ms % 1000));

      return result;
    };

    const start = () => {
      stop();
      const update = () => {
        const now = Date.now();
        const diff = targetTime.value - now;
        remaining.value = Math.max(0, diff);
        emit('change', remaining.value);

        if (diff <= 0) {
          stop();
          emit('finish');
        }
      };
      update();
      timer = setInterval(update, 1000);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    start();

    onBeforeUnmount(stop);

    return () => {
      const { class: incomingClass, style, ...rest } = attrs;
      return h(
        'div',
        { ...rest, class: classes('vui-countdown', incomingClass), style },
        [
          props.title || slots.title
            ? h('div', { class: 'vui-countdown-title' }, slots.title?.() || props.title)
            : null,
          h('div', { class: 'vui-countdown-content' }, [
            props.prefix || slots.prefix
              ? h('span', { class: 'vui-countdown-prefix' }, slots.prefix?.() || props.prefix)
              : null,
            h('span', { class: 'vui-countdown-value' }, slots.default?.() || formatTime(remaining.value)),
            props.suffix || slots.suffix
              ? h('span', { class: 'vui-countdown-suffix' }, slots.suffix?.() || props.suffix)
              : null
          ])
        ]
      );
    };
  }
});
