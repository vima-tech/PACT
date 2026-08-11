<template>
  <div class="modes">
    <div class="modes-bar">
      <v-button
        v-for="item in MODES"
        :key="item.value"
        size="sm"
        :type="mode === item.value ? 'primary' : 'default'"
        @click="mode = item.value"
      >
        {{ item.label }}
      </v-button>
      <span class="modes-hint">{{ current.hint }}</span>
    </div>

    <div class="modes-stage">
      <TemplateRenderer :template="template" preview />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { TemplateRenderer, VButton } from '@vima-tech/ui-admin'

const MODES = [
  {
    value: 'flow',
    label: '流式 flow',
    hint: '默认模式。节点按树结构自然堆叠，没有几何信息——旧模板走的就是这条。'
  },
  {
    value: 'grid',
    label: '栅格 grid',
    hint: '24 格 × 行高。能表达「从第 7 列起占 6 格」，窄屏按断点塌行。'
  },
  {
    value: 'absolute',
    label: '自由 absolute',
    hint: '像素画布。x/y/w/h 都是 px，定位最精准，代价是不响应式。'
  }
]

const mode = ref('grid')
const current = computed(() => MODES.find((item) => item.value === mode.value))

/**
 * 同一批节点同时带上两套几何，切换 layoutMode 就能看出差异。
 * flow 模式会把 layout 整个忽略掉，所以三种模式共用一份 children 即可。
 */
const children = [
  {
    id: 'title',
    type: 'text',
    props: { text: '① 标题：栅格里占 24 格' },
    layout: {
      grid: { x: 0, y: 0, w: 24, h: 1 },
      absolute: { x: 16, y: 16, w: 640, h: 32 }
    }
  },
  {
    id: 'left',
    type: 'card',
    props: { title: '② 左半区 12 格' },
    layout: {
      grid: { x: 0, y: 1, w: 12, h: 3, minW: 6 },
      absolute: { x: 16, y: 60, w: 310, h: 140 }
    }
  },
  {
    id: 'right',
    type: 'card',
    props: { title: '③ 右半区 12 格' },
    layout: {
      grid: { x: 12, y: 1, w: 12, h: 3, minW: 6 },
      absolute: { x: 346, y: 60, w: 310, h: 140 }
    }
  },
  {
    id: 'foot',
    type: 'text',
    props: { text: '④ 页脚：栅格里从第 13 列起，只占右半边' },
    layout: {
      // x=12 正是 VCol 表达不了、必须用 CSS Grid 才有的「列起点」
      grid: { x: 12, y: 4, w: 12, h: 1 },
      absolute: { x: 346, y: 212, w: 310, h: 32 }
    }
  }
]

const template = computed(() => ({
  id: 'modes',
  name: '摆放模式对照',
  type: 'page',
  version: '1.0.0',
  layoutMode: mode.value,
  canvas: { cols: 24, rowHeight: 40, gap: 12, width: 672, height: 260 },
  root: { id: 'root', type: 'container', layoutMode: mode.value, children }
}))
</script>

<style scoped>
.modes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modes-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.modes-hint {
  color: var(--vui-text-weak);
  font-size: 12px;
}

.modes-stage {
  padding: 12px;
  overflow: auto;
  border: 1px dashed var(--vui-border);
  border-radius: 10px;
  background: var(--vui-surface-hover);
}
</style>
