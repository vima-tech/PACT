<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { getIconNames } from '@vima-tech/ui-admin';

type IconGroup = {
  id: string;
  label: string;
  description: string;
  icons: string[];
};

const allIcons = getIconNames();
const knownIcons = new Set(allIcons);
const query = ref('');
const activeGroup = ref('all');
const copiedName = ref('');
const copyFailed = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const groupDefinitions: IconGroup[] = [
  {
    id: 'navigation',
    label: '导航方向',
    description: '方向、页面跳转与视图切换',
    icons: [
      'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up',
      'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up',
      'external-link', 'fullscreen', 'fullscreen-exit', 'home',
      'log-in', 'log-out', 'menu', 'more-vertical'
    ]
  },
  {
    id: 'actions',
    label: '操作命令',
    description: '编辑、复制、保存与数据处理',
    icons: [
      'check', 'close', 'copy', 'divider', 'download', 'drag-handle',
      'edit', 'eye', 'eye-off', 'filter', 'minus', 'minus-circle', 'plus', 'redo',
      'refresh', 'save', 'search', 'sort', 'trash', 'undo', 'upload',
      'zoom-in', 'zoom-out'
    ]
  },
  {
    id: 'status',
    label: '状态反馈',
    description: '通知、结果、安全与关注状态',
    icons: [
      'alert', 'bell', 'check-circle', 'circle', 'heart', 'help-circle',
      'info', 'shield', 'shield-check', 'star', 'target'
    ]
  },
  {
    id: 'content',
    label: '内容界面',
    description: '文件、表单、布局与常用控件',
    icons: [
      'app', 'button', 'calendar', 'clock', 'columns', 'file', 'file-text',
      'folder', 'form', 'image', 'layout', 'link', 'list', 'mail',
      'paperclip', 'pause', 'play', 'printer', 'table', 'text'
    ]
  },
  {
    id: 'data',
    label: '数据与系统',
    description: '数据资源、基础设施与设备',
    icons: ['chart-bar', 'cloud', 'database', 'monitor', 'package', 'server', 'settings']
  },
  {
    id: 'people',
    label: '人员组织',
    description: '账户、组织、权限与联系方式',
    icons: [
      'building', 'flask', 'lock', 'phone', 'unlock', 'user', 'user-plus', 'users'
    ]
  }
];

const categorizedNames = new Set(groupDefinitions.flatMap((group) => group.icons));
const uncategorized = allIcons.filter((name) => !categorizedNames.has(name));
const groups = uncategorized.length
  ? [...groupDefinitions, { id: 'other', label: '其他', description: '扩展注册的图标', icons: uncategorized }]
  : groupDefinitions;

const groupTabs = computed(() => [
  { id: 'all', label: '全部', count: allIcons.length },
  ...groups.map((group) => ({
    id: group.id,
    label: group.label,
    count: group.icons.filter((name) => knownIcons.has(name)).length
  }))
]);

const visibleGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return groups
    .filter((group) => activeGroup.value === 'all' || group.id === activeGroup.value)
    .map((group) => ({
      ...group,
      icons: group.icons.filter((name) => knownIcons.has(name) && name.includes(keyword))
    }))
    .filter((group) => group.icons.length);
});

const visibleCount = computed(() => visibleGroups.value.reduce((total, group) => total + group.icons.length, 0));

function fallbackCopy(value: string) {
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('copy failed');
}

async function copyIcon(name: string) {
  const snippet = `<v-icon type="${name}" />`;
  copyFailed.value = false;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(snippet);
    else fallbackCopy(snippet);
    copiedName.value = name;
  } catch {
    copiedName.value = '';
    copyFailed.value = true;
  }
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copiedName.value = '';
    copyFailed.value = false;
  }, 1800);
}

onBeforeUnmount(() => clearTimeout(copyTimer));
</script>

<template>
  <div class="icon-browser">
    <div class="icon-tools">
      <label class="icon-search">
        <span class="icon-search-label">搜索图标</span>
        <span class="icon-search-control">
          <v-icon type="search" />
          <input v-model="query" type="search" placeholder="输入名称，如 user、arrow" />
          <button v-if="query" type="button" aria-label="清空搜索" @click="query = ''">
            <v-icon type="close" />
          </button>
        </span>
      </label>

      <div class="icon-summary" aria-live="polite">
        <strong>{{ visibleCount }}</strong>
        <span>/ {{ allIcons.length }} 个图标</span>
      </div>
    </div>

    <div class="icon-tabs" aria-label="图标分类">
      <button
        v-for="tab in groupTabs"
        :key="tab.id"
        type="button"
        :class="{ 'is-active': activeGroup === tab.id }"
        :aria-pressed="activeGroup === tab.id"
        @click="activeGroup = tab.id"
      >
        {{ tab.label }}
        <span>{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="visibleGroups.length" class="icon-groups">
      <section v-for="group in visibleGroups" :key="group.id" class="icon-group">
        <header class="icon-group-head">
          <div>
            <h4>{{ group.label }}</h4>
            <p>{{ group.description }}</p>
          </div>
          <span>{{ group.icons.length }}</span>
        </header>

        <div class="icon-grid">
          <button
            v-for="name in group.icons"
            :key="name"
            type="button"
            class="icon-cell"
            :class="{ 'is-copied': copiedName === name }"
            :aria-label="`复制 ${name} 图标代码`"
            @click="copyIcon(name)"
          >
            <span class="icon-preview"><v-icon :type="name" /></span>
            <span class="icon-name">{{ name }}</span>
            <v-icon class="icon-copy" :type="copiedName === name ? 'check' : 'copy'" />
          </button>
        </div>
      </section>
    </div>

    <div v-else class="icon-empty">
      <v-icon type="search" />
      <strong>没有匹配的图标</strong>
      <span>换个关键词，或切换到“全部”分类。</span>
      <button type="button" @click="query = ''; activeGroup = 'all'">重置筛选</button>
    </div>

    <p v-if="copyFailed" class="icon-copy-error" role="alert">复制失败，请在安全上下文中重试。</p>
    <p v-else-if="copiedName" class="icon-copy-status" role="status">
      <v-icon type="check-circle" /> 已复制 {{ copiedName }} 的组件代码
    </p>
  </div>
</template>

<style scoped>
.icon-browser {
  color: var(--vui-text-body);
}

.icon-tools {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  border: 1px solid var(--vui-border);
  border-radius: 12px;
  background: #f8fbfe;
}

.icon-search {
  display: grid;
  gap: 7px;
  width: min(420px, 100%);
}

.icon-search-label {
  color: var(--vui-text-sub);
  font-size: 12px;
  font-weight: 700;
}

.icon-search-control {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 28px;
  align-items: center;
  min-height: 42px;
  padding: 0 7px 0 12px;
  border: 1px solid var(--vui-control-border);
  border-radius: 9px;
  background: var(--vui-surface);
  color: var(--vui-text-weak);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.icon-search-control:focus-within {
  border-color: var(--vui-primary);
  box-shadow: 0 0 0 3px var(--vui-focus);
}

.icon-search-control input {
  min-width: 0;
  height: 40px;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--vui-text-body);
  font: inherit;
  font-size: 14px;
}

.icon-search-control input::placeholder {
  color: var(--vui-text-faint);
}

.icon-search-control button {
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--vui-text-weak);
  cursor: pointer;
}

.icon-search-control button:hover {
  background: var(--vui-surface-hover);
  color: var(--vui-primary);
}

.icon-summary {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding-bottom: 8px;
  color: var(--vui-text-weak);
  font-size: 13px;
  white-space: nowrap;
}

.icon-summary strong {
  color: var(--vui-text-title);
  font-size: 24px;
  line-height: 1;
}

.icon-tabs {
  display: flex;
  gap: 7px;
  padding: 16px 0 4px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.icon-tabs button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--vui-text-sub);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.icon-tabs button:hover {
  background: var(--vui-surface-hover);
  color: var(--vui-text-title);
}

.icon-tabs button.is-active {
  border-color: #bfd4e8;
  background: #eaf3fb;
  color: #225f96;
  font-weight: 700;
}

.icon-tabs button span {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(101, 128, 151, 0.1);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.icon-groups {
  margin-top: 10px;
  border-top: 1px solid var(--vui-border);
}

.icon-group {
  padding: 24px 0 26px;
  border-bottom: 1px solid var(--vui-border);
}

.icon-group-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.icon-group-head h4 {
  margin: 0;
  color: var(--vui-text-title);
  font-size: 14px;
  font-weight: 750;
}

.icon-group-head p {
  margin: 4px 0 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}

.icon-group-head > span {
  color: var(--vui-text-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 8px;
}

.icon-cell {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 16px;
  gap: 10px;
  align-items: center;
  min-height: 60px;
  padding: 9px 12px 9px 9px;
  border: 1px solid var(--vui-border);
  border-radius: 10px;
  background: var(--vui-surface);
  color: var(--vui-text-sub);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.08s ease;
}

.icon-cell:hover {
  border-color: #a9c7e2;
  background: #f5faff;
  color: var(--vui-text-title);
}

.icon-cell:active {
  transform: translateY(1px);
}

.icon-cell:focus-visible {
  outline: 3px solid var(--vui-focus);
  outline-offset: 1px;
}

.icon-cell.is-copied {
  border-color: #8ebbdc;
  background: #eef7fd;
  color: #225f96;
}

.icon-preview {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
  background: #edf3f8;
  color: #426887;
}

.icon-preview :deep(.vui-icon) {
  width: 21px;
  height: 21px;
  stroke-width: 1.8;
}

.icon-name {
  overflow: hidden;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-copy {
  width: 14px;
  height: 14px;
  color: var(--vui-text-faint);
  opacity: 0;
  transition: opacity 0.16s ease, color 0.16s ease;
}

.icon-cell:hover .icon-copy,
.icon-cell:focus-visible .icon-copy,
.icon-cell.is-copied .icon-copy {
  opacity: 1;
}

.icon-cell.is-copied .icon-copy {
  color: #2f845d;
}

.icon-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  align-content: center;
  gap: 8px;
  margin-top: 18px;
  border: 1px dashed var(--vui-border);
  border-radius: 12px;
  color: var(--vui-text-weak);
  text-align: center;
}

.icon-empty > .vui-icon {
  width: 30px;
  height: 30px;
  margin-bottom: 4px;
}

.icon-empty strong {
  color: var(--vui-text-title);
  font-size: 14px;
}

.icon-empty span {
  font-size: 12px;
}

.icon-empty button {
  margin-top: 8px;
  padding: 7px 12px;
  border: 1px solid var(--vui-control-border);
  border-radius: 8px;
  background: var(--vui-surface);
  color: var(--vui-text-sub);
  cursor: pointer;
}

.icon-copy-status,
.icon-copy-error {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  border: 1px solid #bed7c9;
  border-radius: 9px;
  background: #f2faf5;
  color: #2f6f50;
  box-shadow: 0 10px 28px rgba(43, 77, 105, 0.14);
  font-size: 13px;
}

.icon-copy-error {
  border-color: #edc3c0;
  background: #fff7f6;
  color: #a24642;
}

@media (max-width: 720px) {
  .icon-tools {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .icon-search {
    width: 100%;
  }

  .icon-summary {
    padding: 0;
  }

  .icon-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .icon-copy-status,
  .icon-copy-error {
    right: 12px;
    bottom: 12px;
    left: 12px;
  }
}

@media (max-width: 440px) {
  .icon-grid {
    grid-template-columns: 1fr;
  }
}
</style>
