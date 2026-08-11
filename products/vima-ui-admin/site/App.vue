<!--
  文档站外壳：顶栏 + 侧边导航 + 内容区。

  路由用 hash 手写，没有引 vue-router：全站只有指南页与组件页两种形态，
  一个 computed 就够了，为此拉一个路由库不划算（本包对外也只声明 vue 一个 peer 依赖）。
  外壳的配色全部取库自己的 --vui-* 令牌——文档站本身就是这套令牌的第一个使用者。
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { VIcon, components } from '@vima-tech/ui-admin';

import { GROUP_ORDER, GUIDE, PAGES, findPage } from './pages';
import ComponentPage from './views/ComponentPage.vue';
import Home from './views/Home.vue';
import Install from './views/Install.vue';
import Showcase from './views/Showcase.vue';
import Theme from './views/Theme.vue';

const route = ref(location.hash.slice(1) || '/');
const keyword = ref('');
const menuOpen = ref(false);

function onHashChange() {
  route.value = location.hash.slice(1) || '/';
  menuOpen.value = false;
}
onMounted(() => window.addEventListener('hashchange', onHashChange));
onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange));

/** 导航条目按 GROUP_ORDER 分组，数量由 pages.ts 自动决定。 */
const items = computed(() => [
  ...GUIDE.map((g) => ({ ...g, path: g.id === 'home' ? '/' : `/${g.id}` })),
  ...PAGES.map((p) => ({ id: p.id, title: p.title, group: p.group, path: `/c/${p.id}` }))
]);

const groups = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  const hit = items.value.filter(
    (item) => !word || item.title.toLowerCase().includes(word) || item.id.includes(word)
  );
  return GROUP_ORDER.map((group) => ({
    group,
    items: hit.filter((item) => item.group === group)
  })).filter((entry) => entry.items.length);
});

const view = computed(() => {
  if (route.value.startsWith('/c/')) {
    const page = findPage(route.value.slice(3));
    return page ? { is: ComponentPage, key: page.id, props: { page } } : { is: Home, key: 'home', props: {} };
  }
  if (route.value === '/install') return { is: Install, key: 'install', props: {} };
  if (route.value === '/theme') return { is: Theme, key: 'theme', props: {} };
  if (route.value === '/showcase') return { is: Showcase, key: 'showcase', props: {} };
  return { is: Home, key: 'home', props: {} };
});

const main = ref<HTMLElement>();
// 换页后内容区要回到顶部，否则从长页面跳到短页面会停在半空
watch(route, () => main.value?.scrollTo({ top: 0 }));
</script>

<template>
  <div class="site" :class="{ 'is-menu-open': menuOpen }">
    <header class="site-head">
      <button type="button" class="site-burger" aria-label="导航" @click="menuOpen = !menuOpen"><v-icon type="menu" /></button>
      <a class="site-brand" href="#/">
        <span class="site-mark">V</span>
        <span>
          <b>Vima UI Admin</b>
          <i>政企后台组件库</i>
        </span>
      </a>
      <div class="site-meta">
        <span class="site-chip">v0.1.0</span>
        <span class="site-chip">{{ components.length }} 组件</span>
        <span class="site-chip">Vue 3 · 零运行时依赖</span>
      </div>
    </header>

    <div class="site-body">
      <aside class="site-side">
        <div class="site-search">
          <input v-model="keyword" type="search" placeholder="搜索组件…" aria-label="搜索组件" />
        </div>
        <nav>
          <div v-for="entry in groups" :key="entry.group" class="nav-group">
            <div class="nav-group-title">{{ entry.group }}</div>
            <a
              v-for="item in entry.items"
              :key="item.id"
              class="nav-item"
              :class="{ 'is-active': route === item.path }"
              :href="`#${item.path}`"
            >{{ item.title }}</a>
          </div>
          <p v-if="!groups.length" class="nav-empty">没有匹配的组件</p>
        </nav>
      </aside>

      <main ref="main" class="site-main">
        <component :is="view.is" :key="view.key" v-bind="view.props" />
        <footer class="site-foot">
          @vima-tech/ui-admin · 文档由组件源码与 site/pages.ts 生成 · 2026-08-10
        </footer>
      </main>
    </div>
  </div>
</template>

<style scoped>
.site {
  display: flex;
  height: 100vh;
  flex-direction: column;
  background: #eef3f8;
}

.site-head {
  display: flex;
  gap: 16px;
  align-items: center;
  height: 58px;
  flex: none;
  padding: 0 20px;
  border-bottom: 1px solid var(--vui-border);
  background: var(--vui-surface);
}

.site-brand {
  display: flex;
  gap: 10px;
  align-items: center;
  color: inherit;
  text-decoration: none;
}

.site-mark {
  display: grid;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--vui-primary), var(--vui-primary-strong));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  place-items: center;
}

.site-brand b {
  display: block;
  color: var(--vui-text-title);
  font-size: 15px;
}

.site-brand i {
  display: block;
  color: var(--vui-text-weak);
  font-size: 11.5px;
  font-style: normal;
}

.site-meta {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.site-chip {
  padding: 3px 10px;
  border: 1px solid var(--vui-border);
  border-radius: 999px;
  color: var(--vui-text-sub);
  font-size: 12px;
}

.site-burger {
  display: none;
  border: 0;
  background: none;
  color: var(--vui-text-sub);
  font-size: 18px;
  cursor: pointer;
}

.site-body {
  display: flex;
  min-height: 0;
  flex: 1;
}

.site-side {
  width: 232px;
  flex: none;
  padding: 14px 10px 40px;
  overflow: auto;
  border-right: 1px solid var(--vui-border);
  background: var(--vui-surface);
}

.site-search input {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vui-control-border);
  border-radius: 9px;
  background: var(--vui-surface);
  color: var(--vui-text-body);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.site-search input:focus {
  border-color: var(--vui-primary);
  box-shadow: 0 0 0 3px var(--vui-focus);
}

.nav-group {
  margin-top: 16px;
}

.nav-group-title {
  padding: 0 10px 6px;
  color: var(--vui-text-faint);
  font-size: 11.5px;
  letter-spacing: 0.06em;
}

.nav-item {
  display: block;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--vui-text-sub);
  font-size: 13.5px;
  text-decoration: none;
}

.nav-item:hover {
  background: var(--vui-surface-hover);
  color: var(--vui-primary);
}

.nav-item.is-active {
  background: var(--vui-surface-hover);
  color: var(--vui-primary);
  font-weight: 600;
}

.nav-empty {
  padding: 16px 10px;
  color: var(--vui-text-faint);
  font-size: 13px;
}

.site-main {
  min-width: 0;
  flex: 1;
  padding: 26px 32px 48px;
  overflow: auto;
}

.site-foot {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid var(--vui-border);
  color: var(--vui-text-faint);
  font-size: 12px;
}

@media (max-width: 900px) {
  .site-burger {
    display: block;
  }

  .site-meta {
    display: none;
  }

  .site-side {
    position: fixed;
    z-index: 60;
    top: 58px;
    bottom: 0;
    left: 0;
    display: none;
    box-shadow: var(--vui-shadow-popover);
  }

  .site.is-menu-open .site-side {
    display: block;
  }

  .site-main {
    padding: 18px 16px 40px;
  }
}
</style>
