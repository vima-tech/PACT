<!-- 首页：讲清楚这套库是什么、从哪来、边界在哪，其余交给左侧导航 -->
<script setup lang="ts">
import { PAGES } from '../pages';
import api from '../api.generated.json';

const componentCount = Object.keys(api).length;
const propCount = Object.values(api as Record<string, { props: unknown[] }>).reduce(
  (n, c) => n + c.props.length,
  0
);
const groups = [...new Set(PAGES.map((p) => p.group))];
</script>

<template>
  <article class="home">
    <section class="hero">
      <h1>Vima UI Admin</h1>
      <p class="lead">
        政企后台 Vue 3 组件库。{{ componentCount }} 个组件、{{ propCount }} 个属性、30 个设计令牌，
        除 <code>vue</code> 外零依赖。
      </p>
      <div class="hero-acts">
        <a class="btn primary" href="#/install">开始使用</a>
        <a class="btn" href="#/c/button">看组件</a>
        <a class="btn" href="#/showcase">一页总览</a>
      </div>
    </section>

    <section class="cards">
      <div class="card">
        <h3>不是新写的</h3>
        <p>
          组件提取自 juvenile-guard 管理端的 ui-v3，那套代码已经在 53 个真实页面上跑过一轮
          布局体检与视觉对齐。本库做的是把它从宿主工程里摘干净，不是重做一遍。
        </p>
      </div>
      <div class="card">
        <h3>换肤只改一处</h3>
        <p>
          组件样式只写 <code>var(--vui-*)</code>，颜色、圆角、控件高度全在
          <a href="#/theme">令牌层</a>。宿主重定义同名变量即可换品牌色，不用改库里任何文件。
        </p>
      </div>
      <div class="card">
        <h3>文档不会说谎</h3>
        <p>
          API 表由脚本从组件源码抽取，示例代码块与页面上跑的是同一个文件。
          属性改了名，重跑一次文档就跟着变，不存在「文档写着有、实现早没了」。
        </p>
      </div>
      <div class="card">
        <h3>边界是机检的</h3>
        <p>
          <code>check:boundary</code> 会拦下包外引用、宿主命名残留、样式逃出
          <code>.vui-</code> 子树、以及用了却没有默认值的令牌（那类问题只会静默失效）。
        </p>
      </div>
    </section>

    <section class="groups">
      <h2>组件分类</h2>
      <p>{{ groups.join(' · ') }}</p>
    </section>
  </article>
</template>

<style scoped>
.home {
  max-width: 980px;
}

.hero {
  padding: 40px 0 30px;
}

.hero h1 {
  margin: 0;
  color: var(--vui-text-title);
  font-size: 38px;
  letter-spacing: -0.5px;
}

.lead {
  max-width: 640px;
  margin: 14px 0 0;
  color: var(--vui-text-sub);
  font-size: 15px;
  line-height: 1.9;
}

.hero-acts {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.btn {
  padding: 9px 18px;
  border: 1px solid var(--vui-control-border);
  border-radius: 10px;
  background: var(--vui-surface);
  color: var(--vui-text-sub);
  font-size: 14px;
  text-decoration: none;
}

.btn.primary {
  border-color: var(--vui-primary);
  background: var(--vui-primary);
  color: #fff;
}

.cards {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.card {
  padding: 18px;
  border: 1px solid var(--vui-border);
  border-radius: 14px;
  background: var(--vui-surface);
}

.card h3 {
  margin: 0 0 8px;
  color: var(--vui-text-title);
  font-size: 15px;
}

.card p {
  margin: 0;
  color: var(--vui-text-sub);
  font-size: 13.5px;
  line-height: 1.85;
}

.groups {
  margin-top: 30px;
  color: var(--vui-text-sub);
}

.groups h2 {
  color: var(--vui-text-title);
  font-size: 18px;
}

code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--vui-surface-hover);
  color: var(--vui-primary-strong);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12.5px;
}

a {
  color: var(--vui-primary);
}
</style>
