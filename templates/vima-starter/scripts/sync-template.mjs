#!/usr/bin/env node
/**
 * cli/template 是 create-vima-starter 发布时随包带走的脚手架模板
 * （见 cli/package.json 的 files 字段），因此它必须真实存在于 cli 包里，不能软链。
 *
 * 但它的内容不该手工维护：模板与仓库根的 frontend/ backend/ 是同一份东西，
 * 两边各改各的必然漂移——本脚本第一次跑的时候，backend 就已经少了
 * src/main/resources/application-database.yml，而前端也停在改造之前的版本。
 * 漂移的代价全部由使用者承担：`create-vima-starter` 生成出来的项目
 * 和仓库里跑得好好的那一份不是同一个东西，且没有任何报错提示。
 *
 * 所以这里定一个单向规则：**根目录是唯一真源，cli/template 由它生成。**
 *
 *   node scripts/sync-template.mjs           重新生成模板
 *   node scripts/sync-template.mjs --check   只比对，不一致就退出码 1（给 CI / prepack 用）
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'cli', 'template');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * 同步清单。exclude 里的目录名在任意层级都会被跳过。
 *
 * 刻意不同步的东西：
 *  · cli/template/README.md —— 那是给「生成出来的项目」看的说明，与仓库自身的 README 不同；
 *  · frontend/dist、backend/target —— 构建产物。模板里曾经带着 432KB 的陈旧 dist/，
 *    既撑大 npm 包，又让新项目一上来就有一份对不上源码的构建结果。
 */
const SYNC = [
  { from: 'frontend', to: 'frontend', exclude: ['node_modules', 'dist', '.vite'] },
  { from: 'backend', to: 'backend', exclude: ['target'] },
  { from: '.gitignore', to: '.gitignore' }
];

/** 递归列出相对路径，跳过 exclude 里的目录 */
function walk(dir, exclude, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (exclude.includes(name)) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, exclude, base);
    return [relative(base, full)];
  });
}

const differences = [];

for (const entry of SYNC) {
  const src = join(ROOT, entry.from);
  const dest = join(TEMPLATE, entry.to);
  const exclude = entry.exclude || [];

  if (statSync(src).isFile()) {
    const same = existsSync(dest) && readFileSync(src).equals(readFileSync(dest));
    if (!same) {
      differences.push(entry.to);
      if (!CHECK_ONLY) cpSync(src, dest);
    }
    continue;
  }

  const srcFiles = walk(src, exclude);
  const destFiles = existsSync(dest) ? walk(dest, exclude) : [];

  for (const rel of srcFiles) {
    const a = join(src, rel);
    const b = join(dest, rel);
    const same = existsSync(b) && readFileSync(a).equals(readFileSync(b));
    if (!same) differences.push(join(entry.to, rel));
  }
  // 模板里多出来的文件同样算漂移——根目录删掉的东西不该继续发布出去
  for (const rel of destFiles) {
    if (!srcFiles.includes(rel)) differences.push(`${join(entry.to, rel)} (模板多余)`);
  }

  if (!CHECK_ONLY) {
    rmSync(dest, { force: true, recursive: true });
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, {
      recursive: true,
      filter: (from) => !exclude.includes(relative(src, from).split(/[\\/]/)[0]) &&
        !relative(src, from).split(/[\\/]/).some((seg) => exclude.includes(seg))
    });
  }
}

if (CHECK_ONLY) {
  if (differences.length) {
    console.error(`cli/template 与仓库根不同步（${differences.length} 项）：`);
    differences.slice(0, 40).forEach((d) => console.error('  ' + d));
    if (differences.length > 40) console.error(`  …还有 ${differences.length - 40} 项`);
    console.error('\n跑 `npm run sync:template` 重新生成。');
    process.exit(1);
  }
  console.log('cli/template 与仓库根一致。');
} else {
  console.log(
    differences.length
      ? `cli/template 已重新生成，更新了 ${differences.length} 项。`
      : 'cli/template 本来就是最新的，无改动。'
  );
}
