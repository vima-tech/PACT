/**
 * 文档站的内容真源。
 *
 * 创建日期: 2026-08-10
 *
 * 站点是**数据驱动**的：一个组件页 = 这里的一条配置 + demos/ 里几个 .vue 示例文件。
 * 没有 28 个手写页面组件，也没有手写 API 表（表格由 scripts/build-api.mjs 从源码抽）。
 * 加一个组件的文档 = 写示例文件 + 在这里加一条，不用碰路由、导航、页面模板。
 *
 * demos 里的 `file` 对应 `site/demos/<file>.vue`，同一个文件既被渲染也被展示源码。
 * api 里写组件名，对应 api.generated.json 的键。
 */

export type DemoConfig = { file: string; title: string; desc?: string };

export type PageConfig = {
  id: string;
  /** 侧边栏与页头的标题 */
  title: string;
  group: string;
  /** 页头下的一段说明；讲清楚「什么时候用它」而不是复述属性表 */
  desc: string;
  /** 需要提醒的约定/坑，逐条列在示例之前 */
  notes?: string[];
  demos: DemoConfig[];
  api: string[];
};

export const GUIDE = [
  { id: 'home', title: '介绍', group: '指南' },
  { id: 'install', title: '安装与使用', group: '指南' },
  { id: 'theme', title: '主题与令牌', group: '指南' },
  { id: 'showcase', title: '组件总览', group: '指南' }
];

export const PAGES: PageConfig[] = [
  // ------------------------------------------------------------ 布局
  {
    id: 'layout',
    title: 'Layout 布局',
    group: '布局',
    desc: '24 栅格与页面骨架。VRow / VCol 负责一行内的分栏，VLayout 系列负责整页的头、侧、体。',
    notes: [
      'VCol 支持 span（推荐）与兼容属性 md；本库不提供多断点体系，窄于 1100px 时统一塌成一行一列。',
      'VLayout 默认纵向，直接子元素里有 VSide 时自动转横向，因此顶栏要放进 VBody 而不是与侧栏平级。',
      '整页外壳加 vui-layout-fill 才撑满（前提是宿主已给 html/body/#app 高度）；业务页面根用 vui-page，它负责占满高度、锁住内边距，并让末个卡片撑满、表格内部滚动——不要再自己写 height / overflow / calc(100vh - N)。'
    ],
    demos: [
      { file: 'layout-grid', title: '栅格', desc: 'md 取 1–24，24 为整行。' },
      { file: 'layout-shell', title: '页面骨架', desc: 'VLayout 包住 VHeader / VSide / VBody。' }
    ],
    api: ['VContainer', 'VRow', 'VCol', 'VLayout', 'VHeader', 'VSide', 'VBody']
  },
  {
    id: 'card',
    title: 'Card 卡片',
    group: '布局',
    desc: '后台页面的基本容器。标题可用 title 属性或 title 插槽，右侧操作放 extra 插槽。',
    demos: [
      { file: 'card-basic', title: '基础用法' },
      { file: 'card-title-slot', title: '标题区放操作', desc: 'title 与 extra 插槽各司其职。' }
    ],
    api: ['VCard']
  },
  {
    id: 'divider',
    title: 'Divider 分割线',
    group: '布局',
    desc: '分隔内容块，可带文字。',
    demos: [{ file: 'divider-basic', title: '基础用法' }],
    api: ['VDivider']
  },
  // ------------------------------------------------------------ 基础
  {
    id: 'button',
    title: 'Button 按钮',
    group: '基础',
    desc: '五种语义类型 + 文字按钮。业务主操作用纯色，不加渐变。',
    notes: ['size 只有 md（默认）与 sm 两档；sm 用于表格行内操作。'],
    demos: [
      { file: 'button-type', title: '类型' },
      { file: 'button-state', title: '尺寸与禁用' },
      { file: 'button-group', title: '按钮组' }
    ],
    api: ['VButton', 'VButtonGroup']
  },
  {
    id: 'icon',
    title: 'Icon 图标',
    group: '基础',
    desc: '统一的 SVG 图标组件，继承 currentColor，不依赖图标字体或 SVG 精灵。',
    notes: [
      'type 同时认 `home` 与上游写法 `layui-icon-home`，存量代码迁过来不用改。',
      '全部图标由注册表统一管理；可用 `getIconNames()` 查看清单，用 `registerIcon(name, paths)` 注册自定义 24×24 描边图标。'
    ],
    demos: [{ file: 'icon-gallery', title: '全部图标' }],
    api: ['VIcon']
  },
  {
    id: 'link',
    title: 'Link 链接',
    group: '基础',
    desc: '用于页面内导航和低强调操作，支持语义色、下划线、禁用态与安全的新窗口打开。',
    demos: [{ file: 'link-basic', title: '基础用法' }],
    api: ['VLink']
  },
  {
    id: 'avatar',
    title: 'Avatar 头像',
    group: '基础',
    desc: '用户或实体的头像展示，支持图片、文字、图标三种内容形式。',
    notes: [
      'size 支持预设值 xs/sm/md/lg/xl 或自定义数字。',
      'shape 支持 circle（圆形）和 square（方形）。'
    ],
    demos: [
      { file: 'avatar-basic', title: '基础用法', desc: '图片、文字、图标头像与头像组合。' }
    ],
    api: ['VAvatar', 'VAvatarGroup']
  },
  {
    id: 'badge',
    title: 'Badge 徽标',
    group: '基础',
    desc: '状态或数量标记，可显示数字、文字或圆点。',
    notes: [
      'max 控制显示的最大数值，超过显示 max+。',
      'dot 模式只显示小圆点，不显示具体数值。'
    ],
    demos: [
      { file: 'badge-basic', title: '基础用法', desc: '数字徽标、圆点徽标与自定义类型。' }
    ],
    api: ['VBadge']
  },
  {
    id: 'breadcrumb',
    title: 'Breadcrumb 面包屑',
    group: '基础',
    desc: '导航路径展示，显示当前页面在系统层级结构中的位置。',
    notes: [
      'separator 属性自定义分隔符，默认为 /。',
      '最后一个面包屑项通常是当前页面，不可点击。'
    ],
    demos: [
      { file: 'breadcrumb-basic', title: '基础用法', desc: '不同分隔符的面包屑。' }
    ],
    api: ['VBreadcrumb', 'VBreadcrumbItem']
  },
  {
    id: 'tag',
    title: 'Tag 标签',
    group: '基础',
    desc: '状态标记。弱背景 + 深色文字，不做实心填充。',
    demos: [{ file: 'tag-type', title: '类型' }],
    api: ['VTag']
  },
  {
    id: 'progress',
    title: 'Progress 进度条',
    group: '基础',
    desc: '线性进度，百分比显示在右侧。',
    demos: [{ file: 'progress-basic', title: '基础用法' }],
    api: ['VProgress']
  },
  {
    id: 'fullscreen',
    title: 'Fullscreen 全屏',
    group: '基础',
    desc: '无渲染组件：自己不产出任何 DOM，通过作用域插槽交出 toggle 与 isFullscreen，由你决定按钮长什么样、放哪里。',
    notes: [
      '注意：它全屏的是**整个文档**（`document.documentElement.requestFullscreen()`），不是被包裹的那块内容。想只全屏某个区域，得自己对该元素调 requestFullscreen。',
      '插槽参数：`v-slot="{ toggle, isFullscreen }"`；另有 fullscreenchange 事件，值为当前是否全屏。'
    ],
    demos: [{ file: 'fullscreen-basic', title: '基础用法' }],
    api: ['VFullscreen']
  },
  {
    id: 'upload',
    title: 'Upload 上传',
    group: '基础',
    desc: '文件选择器：点按钮选文件，把 FileList 交给 beforeUpload，由业务自己决定怎么传。',
    notes: [
      '注意：它**不会自己上传**。`url` 属性在实现里从未被读取，是上游留下的空属性；真正的上传请在 beforeUpload 里做。',
      '注意：`accpet` 是上游拼错的属性名，实现里作为 `accept` 的兜底保留（`accept || accpet`）。新代码一律用 `accept`。'
    ],
    demos: [{ file: 'upload-basic', title: '基础用法' }],
    api: ['VUpload']
  },
  // ------------------------------------------------------------ 表单
  {
    id: 'form',
    title: 'Form 表单',
    group: '表单',
    desc: 'VForm 托管 model 与校验规则，VFormItem 负责标签、必填星号与错误文案。',
    notes: ['校验在 VFormItem 上按 prop 生效，规则写在 VForm 的 rules 里。'],
    demos: [
      { file: 'form-basic', title: '基础用法与校验' },
      { file: 'form-inline', title: '行内模式', desc: '搜索栏常用，mode="inline"。' }
    ],
    api: ['VForm', 'VFormItem']
  },
  {
    id: 'input',
    title: 'Input 输入框',
    group: '表单',
    desc: '单行输入与多行文本域。',
    demos: [
      { file: 'input-basic', title: '基础用法' },
      { file: 'input-textarea', title: '文本域与自适应高度' },
      { file: 'input-enhanced', title: '前缀后缀与清空', desc: '支持文字/图标前缀后缀，可清空输入框。' }
    ],
    api: ['VInput', 'VTextarea']
  },
  {
    id: 'input-number',
    title: 'InputNumber 数字输入',
    group: '表单',
    desc: '带加减按钮的数字输入，min / max 会夹住取值。',
    demos: [{ file: 'input-number-basic', title: '基础用法' }],
    api: ['VInputNumber']
  },
  {
    id: 'select',
    title: 'Select 选择器',
    group: '表单',
    desc: '支持子组件写法与数组写法两种数据来源，可多选、可检索、可清空。',
    notes: [
      '选项多到一定数量会自动出现检索框；要强制显示用 showSearch。',
      'items 与 options 是同义属性（历史原因），新代码用 items。'
    ],
    demos: [
      { file: 'select-basic', title: '基础用法' },
      { file: 'select-multiple', title: '多选与检索' },
      { file: 'select-items', title: '数组数据源' }
    ],
    api: ['VSelect', 'VSelectOption']
  },
  {
    id: 'date-picker',
    title: 'DatePicker 日期选择',
    group: '表单',
    desc: '日期 / 日期时间 / 区间三种形态，自绘日历，不依赖日期库。',
    demos: [
      { file: 'date-basic', title: '基础用法' },
      { file: 'date-range', title: '区间与日期时间' }
    ],
    api: ['VDatePicker']
  },
  {
    id: 'time-picker',
    title: 'TimePicker 时间选择',
    group: '表单',
    desc: '基于原生时间输入的轻量选择器，支持范围、秒级步长、清空、只读和禁用。',
    demos: [{ file: 'time-picker-basic', title: '基础用法' }],
    api: ['VTimePicker']
  },
  {
    id: 'switch',
    title: 'Switch 开关',
    group: '表单',
    desc: '布尔开关。',
    demos: [{ file: 'switch-basic', title: '基础用法' }],
    api: ['VSwitch']
  },
  {
    id: 'radio',
    title: 'Radio 单选',
    group: '表单',
    desc: '单选组，值绑在 VRadioGroup 上。',
    demos: [{ file: 'radio-basic', title: '基础用法' }],
    api: ['VRadioGroup', 'VRadio']
  },
  {
    id: 'checkbox',
    title: 'Checkbox 复选框',
    group: '表单',
    desc: '单个布尔选择或数组多选，支持半选、禁用与 options 快捷配置。',
    demos: [{ file: 'checkbox-basic', title: '基础用法' }],
    api: ['VCheckbox', 'VCheckboxGroup']
  },
  {
    id: 'tag-input',
    title: 'TagInput 标签输入',
    group: '表单',
    desc: '回车追加、点 × 删除的字符串数组输入。',
    demos: [{ file: 'tag-input-basic', title: '基础用法' }],
    api: ['VTagInput']
  },
  // ------------------------------------------------------------ 数据展示
  {
    id: 'table',
    title: 'Table 表格',
    group: '数据展示',
    desc: '本库最重的组件：列模型、勾选、分页、树形、横向滚动与固定列都在里面。',
    notes: [
      '固定列**按角色自动判定**：前导（勾选列 + 首个数据列）与末尾的操作列，不读列定义里的 fixed。',
      '列宽不够时表格自己出现横向滚动条，不会把列挤到换行。',
      '操作列的识别方式：title 为「操作」，或 key/customSlot 为 operator。',
      '设置 draggable 属性启用表头列拖拽排序。'
    ],
    demos: [
      { file: 'table-basic', title: '基础用法' },
      { file: 'table-selection', title: '勾选与分页' },
      { file: 'table-loading', title: '工具栏与加载态' },
      { file: 'table-tree', title: '树形数据' },
      { file: 'table-draggable', title: '列拖拽排序', desc: '表头拖拽列来调整顺序，结合列设置使用。' },
      { file: 'table-export', title: '数据导出', desc: '支持导出当前页或全部数据。' }
    ],
    api: ['VTable']
  },
  {
    id: 'column-setting',
    title: 'ColumnSetting 列设置',
    group: '数据展示',
    desc: '让用户自己决定表格显示哪些字段、按什么顺序，并记住选择。放进表格的 toolbar 插槽。',
    notes: [
      'source 是全量列定义（组件不会改写它），v-model 是筛过排过序的生效列，直接喂给表格。',
      'storageKey 留空则完全不碰 localStorage；存档只记 { key, visible } 与顺序，列定义永远以 source 为准。',
      '参与配置的列要给 key——没有 key 会退化到用下标做身份，一排序就串位。',
      '最后一个可见列的勾选框会被禁用，避免得到一张没有列的表。'
    ],
    demos: [{ file: 'column-setting-basic', title: '基础用法', desc: '勾选显隐、拖拽或上下方向键排序，确定后刷新页面仍然生效。' }],
    api: ['VColumnSetting']
  },
  {
    id: 'pagination',
    title: 'Pagination 分页',
    group: '数据展示',
    desc: '数据分页控件，支持自定义布局、页码跳转、每页条数切换。',
    notes: [
      'layout 属性控制显示哪些组件：prev, pager, next, jumper, total, sizes。',
      'background 属性给页码按钮添加背景色。'
    ],
    demos: [
      { file: 'pagination-basic', title: '基础用法', desc: '不同布局的分页控件。' }
    ],
    api: ['VPagination']
  },
  {
    id: 'steps',
    title: 'Steps 步骤条',
    group: '数据展示',
    desc: '引导用户按照流程完成任务的分步导航条。',
    notes: [
      'active 属性设置当前步骤（从 0 开始）。',
      'direction 属性设置步骤条方向，支持 horizontal（水平）和 vertical（垂直）。'
    ],
    demos: [
      { file: 'steps-basic', title: '基础用法', desc: '水平与垂直步骤条。' }
    ],
    api: ['VSteps', 'VStep']
  },
  {
    id: 'statistic',
    title: 'Statistic 统计数值',
    group: '数据展示',
    desc: '展示统计数值，支持前缀、后缀、千分位分隔、精度控制和倒计时。',
    demos: [
      { file: 'statistic-basic', title: '基础用法', desc: '统计数值与倒计时。' }
    ],
    api: ['VStatistic', 'VCountdown']
  },
  {
    id: 'descriptions',
    title: 'Descriptions 描述列表',
    group: '数据展示',
    desc: '详情页的键值对展示，column 控制每行几组。',
    demos: [
      { file: 'descriptions-basic', title: '基础用法' },
      { file: 'descriptions-border', title: '带边框与跨列' }
    ],
    api: ['VDescriptions', 'VDescriptionsItem']
  },
  {
    id: 'tree',
    title: 'Tree 树形控件',
    group: '数据展示',
    desc: '组织架构一类的层级数据，可勾选。字段名不一致时用 replaceFields 映射。',
    demos: [
      { file: 'tree-basic', title: '基础用法' },
      { file: 'tree-checkbox', title: '可勾选' },
      { file: 'tree-enhanced', title: '增强功能', desc: '节点选中、展开折叠、拖拽、右键菜单。' }
    ],
    api: ['VTree']
  },
  {
    id: 'tab',
    title: 'Tab 标签页',
    group: '数据展示',
    desc: '内容分组切换，可关闭。',
    demos: [{ file: 'tab-basic', title: '基础用法' }],
    api: ['VTab', 'VTabItem']
  },
  {
    id: 'collapse',
    title: 'Collapse 折叠面板',
    group: '数据展示',
    desc: '折叠次要内容，accordion 为手风琴模式。',
    demos: [
      { file: 'collapse-basic', title: '基础用法' },
      { file: 'collapse-accordion', title: '手风琴' }
    ],
    api: ['VCollapse', 'VCollapseItem']
  },
  // ------------------------------------------------------------ 反馈
  {
    id: 'loading',
    title: 'Loading 加载遮罩',
    group: '反馈',
    desc: '内容**已经在**、正在刷新或提交时用它：半透明遮罩盖住原内容，用户还能看见上下文。',
    notes: [
      '首屏没有内容时别用它，会得到「一片空白 + 转圈」——那是 Skeleton 的场合。',
      'fullscreen 时遮罩传送到 body，z-index 3400，盖过弹层(3000)与下拉日历(3200)。'
    ],
    demos: [
      { file: 'loading-wrap', title: '包裹内容' },
      { file: 'loading-fullscreen', title: '全屏遮罩' }
    ],
    api: ['VLoading']
  },
  {
    id: 'skeleton',
    title: 'Skeleton 骨架屏',
    group: '反馈',
    desc: '内容**还没有**（首屏）时用它：按形状铺灰块占位，避免白屏和数据到达时的整页跳动。',
    notes: ['二次刷新别用它——把用户正在看的表格换成灰块比转圈更糟。'],
    demos: [
      { file: 'skeleton-types', title: '三种形态' },
      { file: 'skeleton-switch', title: '加载完成后替换' }
    ],
    api: ['VSkeleton']
  },
  {
    id: 'alert',
    title: 'Alert 警告提示',
    group: '反馈',
    desc: '页面内的警告提示，用于展示重要信息。支持 info、success、warning、error 四种类型。',
    notes: [
      'closable 控制是否可关闭，默认为 true。',
      'showIcon 控制是否显示图标。'
    ],
    demos: [
      { file: 'alert-basic', title: '基础用法', desc: '四种类型与可关闭提示。' }
    ],
    api: ['VAlert']
  },
  {
    id: 'empty',
    title: 'Empty 空状态',
    group: '反馈',
    desc: '数据为空时的占位提示，可自定义图片、描述和操作按钮。',
    demos: [
      { file: 'empty-basic', title: '基础用法', desc: '默认空状态与自定义操作。' }
    ],
    api: ['VEmpty']
  },
  {
    id: 'message',
    title: 'Message 消息提示',
    group: '反馈',
    desc: '全局消息提示，命令式调用。支持 message.info/success/warning/error 和 messageBox.confirm/alert。',
    notes: [
      '消息自动消失，默认 3 秒，duration=0 表示不自动消失。',
      'message.closeAll() 可关闭所有消息。'
    ],
    demos: [
      { file: 'message-basic', title: '基础用法', desc: '消息提示与确认对话框。' }
    ],
    api: ['message', 'messageBox']
  },
  {
    id: 'layer-service',
    title: 'Message 弹层服务',
    group: '反馈',
    desc: '命令式弹层：消息、通知、确认框、全局加载。不是组件，直接 import { layer } 调用。',
    notes: [
      'API 形状与 Layui layer 一致（icon / time / btn / closeAll(type)），从 layui-vue 迁过来调用点不用改。',
      'layer.confirm 的按钮回调拿到弹层 id，自己决定何时 layer.close(id)。'
    ],
    demos: [{ file: 'layer-service-basic', title: '四种弹层' }],
    api: []
  },
  // ------------------------------------------------------------ 浮层
  {
    id: 'layer',
    title: 'Layer 弹窗',
    group: '浮层',
    desc: '模态对话框，area 控制尺寸，footer 插槽放操作按钮。',
    notes: [
      'Esc 可关闭；shadeClose 默认为 true，点遮罩会关闭。编辑类弹窗担心误关时请显式设为 false。'
    ],
    demos: [
      { file: 'layer-basic', title: '基础用法' },
      { file: 'layer-footer', title: '底部操作与加载态' }
    ],
    api: ['VLayer']
  },
  {
    id: 'drawer',
    title: 'Drawer 抽屉',
    group: '浮层',
    desc: '屏幕边缘滑出的浮层面板，支持四个方向。',
    notes: [
      'direction 属性控制方向：rtl（右）、ltr（左）、ttb（上）、btt（下）。',
      'size 属性控制宽度或高度，默认 30%。'
    ],
    demos: [
      { file: 'drawer-basic', title: '基础用法', desc: '四个方向的抽屉。' }
    ],
    api: ['VDrawer']
  },
  {
    id: 'tooltip',
    title: 'Tooltip 文字提示',
    group: '浮层',
    desc: '鼠标悬停时显示的文字提示，支持 12 个方向。',
    notes: [
      'trigger 属性控制触发方式：hover（默认）、click、focus。',
      'effect 属性控制样式：dark（深色）、light（浅色）。'
    ],
    demos: [
      { file: 'tooltip-basic', title: '基础用法', desc: '不同方向与触发方式。' }
    ],
    api: ['VTooltip']
  },
  {
    id: 'popover',
    title: 'Popover 气泡卡片',
    group: '浮层',
    desc: '点击或悬停弹出的气泡卡片，可承载标题、内容和复杂组件。',
    demos: [
      { file: 'popover-basic', title: '基础用法', desc: '点击与悬停触发。' }
    ],
    api: ['VPopover']
  },
  {
    id: 'dropdown',
    title: 'Dropdown 下拉菜单',
    group: '浮层',
    desc: '点击触发的菜单。注意它是菜单语义——点面板内任何位置都会关闭。',
    notes: [
      '需要在浮层里放勾选框、输入框这类要停留的控件时，不要用它，自己写浮层（参考 VColumnSetting）。',
      '面板渲染到 body 上（fixed 定位，坐标按触发器位置实时算）：卡片、折叠面板、可滚动表格这些 overflow 不是 visible 的容器不会把它裁掉，在对话框里打开也能盖住对话框。下方空间不够会自动向上翻，横向超出视口会往回夹。'
    ],
    demos: [{ file: 'dropdown-basic', title: '基础用法' }],
    api: ['VDropdown', 'VDropdownMenu', 'VDropdownMenuItem']
  },
  // ------------------------------------------------------------ 高级功能
  {
    id: 'ai-friendly',
    title: 'AI Friendly API',
    group: '高级功能',
    desc: '通过可预测的字段推断、结构化错误和代码生成辅助，让 AI 更稳定地组合后台界面。',
    demos: [
      { file: 'ai-friendly-demo', title: '字段推断与代码生成' }
    ],
    api: []
  },
  {
    id: 'template',
    title: 'Template 模板系统',
    group: '高级功能',
    desc: '自定义模板功能，允许通过JSON配置定义UI结构，支持表单、卡片、列表等场景，可用于低代码平台和AI生成。',
    notes: [
      '三种摆放模式，写在 Template.layoutMode 上：flow（流式，默认，旧模板行为不变）、grid（24 栅格 × 行高，能表达「从第 7 列第 3 行开始」且响应式）、absolute（像素画布，自由摆放 + 参考线吸附，不响应式）。节点上写 layoutMode 可以在流式模板里嵌一块画布。',
      '每个节点的几何写在 node.layout，含 minW/maxW/minH/maxH 尺寸约束。grid 模式下约束是编辑期用的（拖拽缩放时夹取），absolute 模式下同时会输出成 CSS 的 min/max 兜底。',
      'grid 模式不做自动向上压实——那会改掉你亲手放的 y。落点重叠时只把被压住的节点下推；想紧凑排列点工具栏的「紧凑排列」。',
      '响应式：同一模板可为 LG / MD / SM 各存一份几何（layout.breakpoints），断点覆盖只盖写了的字段。在非 LG 断点下编辑时改动只写进该断点，不会动宽屏布局。',
      'VTemplateEditor 随包发布，直接 import 即用；快捷键：Ctrl+Z/Y 撤销重做、Ctrl+C/X/V/D 复制剪切粘贴复制一份、Ctrl+A 全选、Delete 删除、方向键微调（自由模式按住 Shift 走 10px）。'
    ],
    demos: [
      { file: 'template-basic', title: '可视化编辑器', desc: '拖拽摆放、八向缩放、尺寸约束、对齐吸附、撤销重做与断点切换。' },
      { file: 'template-layout-modes', title: '三种摆放模式', desc: '同一份内容在 flow / grid / absolute 下的渲染差异。' }
    ],
    api: ['VTemplateEditor', 'TemplateRenderer', 'FormTemplateRenderer', 'CardTemplateRenderer']
  }
];

/** 侧边栏分组顺序 */
export const GROUP_ORDER = ['指南', '布局', '基础', '表单', '数据展示', '反馈', '浮层', '高级功能'];

export function findPage(id: string): PageConfig | undefined {
  return PAGES.find((page) => page.id === id);
}
