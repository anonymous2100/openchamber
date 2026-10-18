import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { WORKBUDDY_PLUGIN_PACKAGE_JSON, createWorkBuddyPluginSource } from './plugin-source.js';
import { createWorkBuddyRuntime } from './runtime.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe('WorkBuddy plugin runtime', () => {
  it('materializes a complete plugin directory and returns it', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openchamber-workbuddy-runtime-'));
    temporaryDirectories.push(dataDir);
    const runtime = createWorkBuddyRuntime({ fsPromises: fs, path, dataDir });

    const directory = await runtime.materializePlugin();

    expect(directory).toBe(path.join(dataDir, 'workbuddy-plugin', 'workbuddy-cn'));
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    expect(manifest).toMatchObject({ name: 'openchamber-workbuddy-cn', type: 'module', exports: { '.': './index.js' } });
    expect(WORKBUDDY_PLUGIN_PACKAGE_JSON).toContain('"openchamber-workbuddy-cn"');
    const source = await fs.readFile(path.join(directory, 'index.js'), 'utf8');
    expect(source).toContain('const PLUGIN_ID = "openchamber-workbuddy-cn"');
    expect(source).toContain('export default');
    expect(source).toContain('export function createWorkBuddy');
  });

  it('regenerates the plugin whole on every call', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openchamber-workbuddy-runtime-'));
    temporaryDirectories.push(dataDir);
    const runtime = createWorkBuddyRuntime({ fsPromises: fs, path, dataDir });

    const entrypoint = path.join(runtime.pluginDirectory, 'index.js');
    await runtime.materializePlugin();
    await fs.writeFile(entrypoint, 'tampered');
    await runtime.materializePlugin();

    expect(await fs.readFile(entrypoint, 'utf8')).toBe(createWorkBuddyPluginSource());
  });

  it('never lets the plugin write to the stdio protocol channel', async () => {
    // The managed OpenCode runs with `serve --stdio`: stdout is the protocol
    // stream, so a plugin writing there corrupts it. Warnings go to stderr.
    const source = createWorkBuddyPluginSource();
    expect(source).not.toMatch(/console\.log|process\.stdout|process\.console/);
  });
});
