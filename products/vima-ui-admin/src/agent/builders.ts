import { validateTemplate } from '../template/validate';
import type { ComponentProps, ComponentType, Template, TemplateNode, UIDiagnostic } from '../template/types';
import type {
  ActionSpec,
  ArtifactBuildResult,
  ArtifactFile,
  ArtifactIntegrationRequirement,
  AppSpec,
  CrudPageSpec,
  DashboardPageSpec,
  DetailPageSpec,
  FieldSpec,
  FormPageSpec,
  PageBuildResult,
  PageSpec
} from './types';
import { validateAppSpec, validatePageSpec } from './validate';
import { serializeForScript } from './serialize';

type PageOf<T extends PageSpec['type']> = Extract<PageSpec, { type: T }>;
type CheckedPage<T extends PageSpec['type']> =
  | { valid: true; value: PageOf<T> }
  | { valid: false; diagnostics: UIDiagnostic[] };

function checkPage<T extends PageSpec['type']>(input: unknown, type: T): CheckedPage<T> {
  const validation = validatePageSpec(input);
  if (!validation.valid) return { valid: false, diagnostics: validation.diagnostics };
  if (validation.value!.type !== type) {
    return {
      valid: false,
      diagnostics: [{ code: 'PAGE_TYPE_MISMATCH', severity: 'error', path: 'type', message: `需要 ${type} 页面。` }]
    };
  }
  return { valid: true, value: validation.value as PageOf<T> };
}

function stablePart(value: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'item';
}

function inputType(field: FieldSpec): { type: ComponentType; props: ComponentProps } {
  const common = {
    placeholder: field.input?.placeholder,
    disabled: field.input?.disabled,
    readonly: field.input?.readonly
  };
  const props = Object.fromEntries(Object.entries(common).filter(([, value]) => value !== undefined));
  if (field.input?.component) return { type: field.input.component as ComponentType, props };
  if (field.format === 'file') return { type: 'upload', props };
  if (field.cardinality === 'list') return { type: 'tag-input', props };
  if (field.format === 'enum') return { type: 'select', props: { ...props, options: field.options ?? [] } };
  if (field.dataType === 'boolean') return { type: 'switch', props };
  if (field.dataType === 'number') return { type: 'input-number', props };
  if (field.dataType === 'date') {
    return { type: 'datepicker', props: { ...props, range: field.cardinality === 'tuple' || field.format === 'date-range' } };
  }
  if (field.format === 'textarea' || field.dataType === 'object') return { type: 'textarea', props };
  return { type: 'input', props: { ...props, type: field.format && field.format !== 'text' ? field.format : 'text' } };
}

function fieldNode(pageId: string, field: FieldSpec): TemplateNode {
  const id = `${stablePart(pageId)}--field-${stablePart(field.key)}`;
  const input = inputType(field);
  return {
    id,
    type: 'form-item',
    props: { label: field.label, field: field.key, required: field.required === true },
    children: [{ id: `${id}--input`, type: input.type, props: input.props }]
  };
}

function result(template: Template, diagnostics: UIDiagnostic[] = []): PageBuildResult {
  if (diagnostics.length) return { ok: false, diagnostics };
  const validation = validateTemplate(template);
  return validation.valid
    ? { ok: true, template, diagnostics: [] }
    : { ok: false, diagnostics: validation.diagnostics };
}

function formRules(spec: FormPageSpec): NonNullable<Template['formConfig']>['rules'] | undefined {
  const rules = Object.fromEntries(spec.fields.flatMap((field) => {
    if (!field.validation?.length) return [];
    return [[field.key, field.validation.map(({ kind, value, message }) => ({
      [kind]: kind === 'required' ? true : value,
      message
    }))]];
  }));
  return Object.keys(rules).length ? rules : undefined;
}

function baseTemplate(spec: PageSpec, root: TemplateNode): Template {
  const rules = spec.type === 'form' ? formRules(spec) : undefined;
  return {
    id: stablePart(spec.id),
    name: spec.title,
    type: spec.type === 'form' ? 'form' : 'page',
    version: '1.0.0',
    root,
    ...(rules ? { formConfig: { rules } } : {})
  };
}

export function buildFormPage(spec: FormPageSpec): PageBuildResult;
export function buildFormPage(spec: unknown): PageBuildResult;
export function buildFormPage(input: unknown): PageBuildResult {
  const checked = checkPage(input, 'form');
  if (!checked.valid) return { ok: false, diagnostics: checked.diagnostics };
  const spec = checked.value;
  const rootId = `${stablePart(spec.id)}--form`;
  const children = spec.fields.map((field) => fieldNode(spec.id, field));
  children.push({
    id: `${rootId}--actions`,
    type: 'form-item',
    children: [{
      id: `${rootId}--submit`,
      type: 'button',
      props: { type: 'primary', nativeType: 'submit', content: spec.submitLabel || '保存' },
      events: { click: { type: 'click', action: 'submit' } }
    }]
  });
  return result(baseTemplate(spec, { id: rootId, type: 'form', children }));
}

function actionNode(pageId: string, action: ActionSpec, index: number): TemplateNode {
  const id = `${stablePart(pageId)}--action-${stablePart(action.key)}-${index}`;
  return {
    id,
    type: 'button',
    props: action.icon
      ? { type: action.kind || 'default' }
      : { type: action.kind || 'default', content: action.label },
    children: action.icon ? [
      { id: `${id}--icon`, type: 'icon', props: { name: action.icon } },
      { id: `${id}--label`, type: 'text', props: { content: action.label } }
    ] : undefined
  };
}

export function buildCrudPage(spec: CrudPageSpec): PageBuildResult;
export function buildCrudPage(spec: unknown): PageBuildResult;
export function buildCrudPage(input: unknown): PageBuildResult {
  const checked = checkPage(input, 'crud');
  if (!checked.valid) return { ok: false, diagnostics: checked.diagnostics };
  const spec = checked.value;
  const id = stablePart(spec.id);
  const columns = spec.fields.map((field) => ({ key: field.key, title: field.label }));
  const root: TemplateNode = {
    id: `${id}--root`,
    type: 'container',
    children: [
      {
        id: `${id}--search-card`,
        type: 'card',
        props: { title: '查询条件' },
        children: [{
          id: `${id}--search-form`,
          type: 'form',
          children: spec.fields.slice(0, 4).map((field) => fieldNode(`${id}-search`, { ...field, required: false }))
        }]
      },
      {
        id: `${id}--list-card`,
        type: 'card',
        props: { title: spec.title },
        children: [
          {
            id: `${id}--actions`,
            type: 'button-group',
            children: (spec.actions ?? []).map((action, index) => actionNode(id, action, index))
          },
          {
            id: `${id}--error`,
            type: 'alert',
            props: {
              type: 'error',
              title: '加载失败',
              description: { __expression: true, expr: 'errorMessage' },
              closable: false,
              showIcon: true
            },
            condition: 'error'
          },
          { id: `${id}--loading`, type: 'loading', props: { loading: true, text: '加载中' }, condition: 'loading' },
          { id: `${id}--empty`, type: 'empty', props: { description: '暂无数据' }, condition: 'empty' },
          {
            id: `${id}--table`,
            type: 'table',
            props: {
              columns,
              dataSource: { __expression: true, expr: 'rows' },
              id: spec.rowKey,
              defaultToolbar: true
            },
            condition: 'hasRows'
          },
          {
            id: `${id}--pagination`,
            type: 'pagination',
            props: {
              current: { __expression: true, expr: 'page' },
              pageSize: { __expression: true, expr: 'pageSize' },
              total: { __expression: true, expr: 'total' }
            }
          }
        ]
      }
    ]
  };
  return result(baseTemplate(spec, root));
}

export function buildDetailPage(spec: DetailPageSpec): PageBuildResult;
export function buildDetailPage(spec: unknown): PageBuildResult;
export function buildDetailPage(input: unknown): PageBuildResult {
  const checked = checkPage(input, 'detail');
  if (!checked.valid) return { ok: false, diagnostics: checked.diagnostics };
  const spec = checked.value;
  const id = stablePart(spec.id);
  const root: TemplateNode = {
    id: `${id}--root`,
    type: 'card',
    props: { title: spec.title },
    children: [{
      id: `${id}--descriptions`,
      type: 'descriptions',
      children: spec.fields.map((field) => ({
        id: `${id}--detail-${stablePart(field.key)}`,
        type: 'descriptions-item',
        props: { label: field.label, content: { __expression: true, expr: `record.${field.key}` } }
      }))
    }]
  };
  return result(baseTemplate(spec, root));
}

export function buildDashboardPage(spec: DashboardPageSpec): PageBuildResult;
export function buildDashboardPage(spec: unknown): PageBuildResult;
export function buildDashboardPage(input: unknown): PageBuildResult {
  const checked = checkPage(input, 'dashboard');
  if (!checked.valid) return { ok: false, diagnostics: checked.diagnostics };
  const spec = checked.value;
  const id = stablePart(spec.id);
  const root: TemplateNode = {
    id: `${id}--root`,
    type: 'row',
    children: spec.metrics.map((metric, index) => ({
      id: `${id}--metric-col-${index}`,
      type: 'col',
      props: { span: Math.max(6, Math.floor(24 / Math.min(spec.metrics.length, 4))) },
      children: [{
        id: `${id}--metric-${stablePart(metric.key)}`,
        type: 'statistic',
        props: {
          title: metric.label,
          value: metric.value ?? { __expression: true, expr: `metrics.${metric.key}` },
          prefix: metric.prefix || '',
          suffix: metric.suffix || ''
        }
      }]
    }))
  };
  return result(baseTemplate(spec, root));
}

export function buildPage(spec: PageSpec): PageBuildResult;
export function buildPage(spec: unknown): PageBuildResult;
export function buildPage(input: unknown): PageBuildResult {
  const validation = validatePageSpec(input);
  if (!validation.valid) return { ok: false, diagnostics: validation.diagnostics };
  const spec = validation.value!;
  if (spec.type === 'form') return buildFormPage(spec);
  if (spec.type === 'crud') return buildCrudPage(spec);
  if (spec.type === 'detail') return buildDetailPage(spec);
  return buildDashboardPage(spec);
}

function pascal(value: string): string {
  return stablePart(value).split(/[-_]+/).filter(Boolean).map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join('');
}

function pageFile(spec: PageSpec, template: Template): string {
  const data = spec.type === 'crud'
    ? `const rows = ref<Record<string, unknown>[]>([])\nconst loading = ref(false)\nconst errorMessage = ref('')\nconst page = ref(1)\nconst pageSize = ref(10)\nconst total = computed(() => rows.value.length)\nconst viewData = computed(() => ({ rows: rows.value, loading: loading.value, error: Boolean(errorMessage.value), errorMessage: errorMessage.value, empty: !loading.value && !errorMessage.value && rows.value.length === 0, hasRows: rows.value.length > 0, page: page.value, pageSize: pageSize.value, total: total.value }))`
    : spec.type === 'detail'
      ? `const record = ref<Record<string, unknown>>({})\nconst viewData = computed(() => ({ record: record.value }))`
      : spec.type === 'dashboard'
        ? `const metrics = ref<Record<string, string | number>>({})\nconst viewData = computed(() => ({ metrics: metrics.value }))`
        : `const model = ref<Record<string, unknown>>({})\nconst viewData = computed(() => ({}))`;
  const modelBinding = spec.type === 'form' ? ' v-model="model"' : '';
  return `<script setup lang="ts">\nimport { computed, ref } from 'vue'\nimport { TemplateRenderer, type Template } from '@vima-tech/ui-admin'\n\nconst template: Template = ${serializeForScript(template, 2)}\n${data}\n</script>\n\n<template>\n  <div class="vui-page">\n    <TemplateRenderer :template="template" :global-data="viewData"${modelBinding} />\n  </div>\n</template>\n`;
}

function appFile(spec: AppSpec): string {
  return `<script setup lang="ts">\nimport { RouterLink, RouterView } from 'vue-router'\nimport { VBody, VHeader, VIcon, VLayout, VSide } from '@vima-tech/ui-admin'\n\nconst shellTitle = ${serializeForScript(spec.shell.title)}\nconst navigation = ${serializeForScript(spec.shell.navigation, 2)}\n</script>\n\n<template>\n  <VLayout class="vui-layout-fill">\n    <VSide>\n      <h1>{{ shellTitle }}</h1>\n      <nav>\n        <RouterLink v-for="item in navigation" :key="item.route" :to="item.route">\n          <VIcon :name="item.icon" />{{ item.label }}\n        </RouterLink>\n      </nav>\n    </VSide>\n    <VBody>\n      <VHeader>{{ shellTitle }}</VHeader>\n      <RouterView />\n    </VBody>\n  </VLayout>\n</template>\n`;
}

function routerFile(spec: AppSpec): string {
  const imports = spec.pages.map((page) => `import ${pascal(page.id)}Page from './pages/${pascal(page.id)}Page.vue'`).join('\n');
  const pageNames = new Map(spec.pages.map((page) => [page.id, `${pascal(page.id)}Page`]));
  const routes = spec.routes.map((route) => `  { path: ${serializeForScript(route.path)}, component: ${pageNames.get(route.pageId)} }`).join(',\n');
  return `import { createRouter, createWebHistory } from 'vue-router'\n${imports}\n\nexport const router = createRouter({\n  history: createWebHistory(),\n  routes: [\n${routes}\n  ]\n})\n`;
}

function mainFile(): string {
  return `import { createApp } from 'vue'\nimport App from './App.vue'\nimport { router } from './router'\nimport VimaUiAdmin from '@vima-tech/ui-admin'\nimport '@vima-tech/ui-admin/style.css'\n\ncreateApp(App).use(router).use(VimaUiAdmin).mount('#app')\n`;
}

function artifact(path: string, type: ArtifactFile['type'], content: string): ArtifactFile {
  return { path, type, operation: 'create', overwrite: 'deny', content };
}

function integrationRequirements(spec: AppSpec): ArtifactIntegrationRequirement[] {
  return spec.pages.flatMap((page) => {
    const requirements: ArtifactIntegrationRequirement[] = [];
    const add = (suffix: string, kind: ArtifactIntegrationRequirement['kind'], description: string) => {
      requirements.push({ id: `${page.id}.${suffix}`, pageId: page.id, kind, description, required: true });
    };
    if (page.type === 'crud') {
      add('data.list', 'data', '连接查询、分页、排序、加载与错误状态的数据 Adapter。');
      page.actions?.forEach((action) => add(`action.${action.key}`, 'action', `连接“${action.label}”动作并处理权限与结果。`));
    } else if (page.type === 'form') {
      add('action.submit', 'action', '连接表单提交 Adapter，并处理成功与字段错误。');
    } else if (page.type === 'detail') {
      add('data.record', 'data', '连接详情数据 Adapter。');
    } else if (page.metrics.some((metric) => metric.value === undefined)) {
      add('data.metrics', 'data', '连接动态指标数据 Adapter。');
    }
    return requirements;
  });
}

export function createArtifactPlan(spec: AppSpec): ArtifactBuildResult;
export function createArtifactPlan(spec: unknown): ArtifactBuildResult;
export function createArtifactPlan(input: unknown): ArtifactBuildResult {
  const specValidation = validateAppSpec(input);
  if (!specValidation.valid) return { ok: false, diagnostics: specValidation.diagnostics };
  const spec = specValidation.value!;
  const diagnostics: UIDiagnostic[] = [];
  const built = spec.pages.map((page) => ({ page, result: buildPage(page) }));
  built.forEach(({ page, result }) => {
    if (!result.ok) diagnostics.push(...result.diagnostics.map((item) => ({ ...item, path: `pages.${page.id}.${item.path}` })));
  });
  if (diagnostics.length) return { ok: false, diagnostics };

  const files = [
    artifact('src/App.vue', 'vue-sfc', appFile(spec)),
    artifact('src/main.ts', 'ts', mainFile()),
    ...built.map(({ page, result }) => artifact(
      `src/pages/${pascal(page.id)}Page.vue`,
      'vue-sfc',
      pageFile(page, (result as { template: Template }).template)
    )),
    artifact('src/router.ts', 'ts', routerFile(spec))
  ].sort((a, b) => a.path.localeCompare(b.path));

  return {
    ok: true,
    spec,
    diagnostics: [],
    plan: {
      version: '1',
      readiness: 'scaffold',
      files,
      dependencies: [
        { name: '@vima-tech/ui-admin', version: '^0.1.0', kind: 'dependency' },
        { name: 'vue', version: '^3.4.0', kind: 'dependency' },
        { name: 'vue-router', version: '^4.0.0', kind: 'dependency' }
      ],
      integrationRequirements: integrationRequirements(spec),
      verificationCommands: ['npm run typecheck', 'npm run build', 'npm test'],
      diagnostics: [],
      nextSteps: [
        'Review files whose overwrite policy is deny before writing them.',
        'Connect generated page state to the application data adapters.',
        'Run typecheck, build, browser smoke tests and accessibility checks.'
      ]
    }
  };
}
