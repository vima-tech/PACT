#!/usr/bin/env node
// @pact R029,R030,R032,R039
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableJson } from '../lib/core.mjs';
import { buildInstallManifest } from '../lib/install-manifest.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const manifest = await buildInstallManifest(root);
await writeFile(resolve(root, 'install-manifest.json'), stableJson(manifest));
process.stdout.write(stableJson({ ok: true, version: manifest.version, skills: manifest.skills.map(({ name }) => name) }));
