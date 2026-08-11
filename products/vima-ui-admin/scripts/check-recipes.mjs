import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCrudPage,
  buildDashboardPage,
  buildDetailPage,
  buildFormPage,
  createArtifactPlan
} from '../dist/agent/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recipeRoot = resolve(root, 'docs/agent/recipes');
const index = JSON.parse(readFileSync(resolve(recipeRoot, 'index.json'), 'utf8'));
const builders = { buildCrudPage, buildDashboardPage, buildDetailPage, buildFormPage, createArtifactPlan };
const requiredSections = ['## 适用与边界', '## 数据契约', '## 结构与交互', '## 状态与质量', '## 产物示例与交付等级', '## 响应式与可访问性'];
const diagnostics = [];
const ids = new Set();

for (const [indexPosition, recipe] of index.recipes.entries()) {
  const basePath = `recipes[${indexPosition}]`;
  if (ids.has(recipe.id)) diagnostics.push({ code: 'DUPLICATE_RECIPE_ID', path: `${basePath}.id`, message: `Recipe ${recipe.id} 重复。` });
  ids.add(recipe.id);
  if (recipe.readiness !== 'scaffold' || recipe.requiresIntegration !== true) {
    diagnostics.push({ code: 'INVALID_RECIPE_READINESS', path: basePath, message: '当前 Recipe 必须明确标记 scaffold 且需要集成。' });
  }
  const markdownPath = resolve(recipeRoot, recipe.file || '');
  const examplePath = resolve(recipeRoot, recipe.example || '');
  if (!markdownPath.startsWith(recipeRoot) || !existsSync(markdownPath)) {
    diagnostics.push({ code: 'MISSING_RECIPE_DOCUMENT', path: `${basePath}.file`, message: `找不到 ${recipe.file}。` });
    continue;
  }
  if (!examplePath.startsWith(recipeRoot) || !existsSync(examplePath)) {
    diagnostics.push({ code: 'MISSING_RECIPE_EXAMPLE', path: `${basePath}.example`, message: `找不到 ${recipe.example}。` });
    continue;
  }
  const markdown = readFileSync(markdownPath, 'utf8');
  for (const section of requiredSections) {
    if (!markdown.includes(section)) diagnostics.push({ code: 'MISSING_RECIPE_SECTION', path: recipe.file, message: `缺少 ${section}。` });
  }
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(markdown)) {
    diagnostics.push({ code: 'EMOJI_ICON_FORBIDDEN', path: recipe.file, message: 'Recipe 不得用 Emoji 作为功能图标。' });
  }
  const builder = builders[recipe.builder];
  if (!builder) {
    diagnostics.push({ code: 'UNKNOWN_RECIPE_BUILDER', path: `${basePath}.builder`, message: `Builder ${recipe.builder} 不存在。` });
    continue;
  }
  let input;
  try {
    input = JSON.parse(readFileSync(examplePath, 'utf8'));
  } catch (error) {
    diagnostics.push({ code: 'INVALID_RECIPE_EXAMPLE_JSON', path: recipe.example, message: error.message });
    continue;
  }
  const first = builder(input);
  const second = builder(input);
  if (!first.ok) diagnostics.push(...first.diagnostics.map((item) => ({ ...item, path: `${recipe.example}:${item.path}` })));
  if (first.ok && 'plan' in first && first.plan.readiness !== recipe.readiness) {
    diagnostics.push({ code: 'RECIPE_READINESS_MISMATCH', path: basePath, message: `Recipe 与 ArtifactPlan 交付等级不一致。` });
  }
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    diagnostics.push({ code: 'NON_DETERMINISTIC_RECIPE', path: recipe.example, message: 'Recipe 示例两次构建结果不一致。' });
  }
}

if (diagnostics.length) {
  diagnostics.forEach((item) => console.error(JSON.stringify({ severity: 'error', ...item })));
  process.exit(1);
}
console.log(`Recipe 检查通过：${index.recipes.length} 个系统 Recipe，示例可构建且结果稳定。`);
