import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WORKBUDDY_PLUGIN_PACKAGE_JSON, createWorkBuddyPluginSource } from './plugin-source.js';

const execFileAsync = promisify(execFile);

const temporaryDirectories = [];
const previousEnvironment = new Map();
const originalFetch = globalThis.fetch;

const withEnvironment = (name, value) => {
  if (!previousEnvironment.has(name)) previousEnvironment.set(name, process.env[name]);
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

const restoreEnvironmentAndFetch = () => {
  for (const [name, value] of previousEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    previousEnvironment.delete(name);
  }
  globalThis.fetch = originalFetch;
};

beforeEach(() => {
  withEnvironment('WORKBUDDY_CN_TOKEN', undefined);
  withEnvironment('WORKBUDDY_CN_UID', undefined);
  withEnvironment('WORKBUDDY_BASE_URL', undefined);
  // Hermetic: point the desktop fallback at a missing file so a real WorkBuddy
  // desktop install on this machine cannot leak into the assertions.
  withEnvironment('WORKBUDDY_AUTH_FILE', path.join(os.tmpdir(), 'openchamber-no-such-desktop.info'));
  withEnvironment('WORKBUDDY_DISABLE_MODEL_DISCOVERY', undefined);
  withEnvironment('WORKBUDDY_REASONING_EFFORT', undefined);
  withEnvironment('XDG_CONFIG_HOME', undefined);
});

afterEach(async () => {
  restoreEnvironmentAndFetch();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

const temporaryDirectory = async (prefix) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
};

const loadPlugin = async () => {
  const directory = await temporaryDirectory('openchamber-workbuddy-plugin-');
  await fs.writeFile(path.join(directory, 'package.json'), WORKBUDDY_PLUGIN_PACKAGE_JSON);
  const entrypoint = path.join(directory, 'index.js');
  await fs.writeFile(entrypoint, createWorkBuddyPluginSource());
  return import(`file://${entrypoint.replaceAll('\\', '/')}`);
};

const sseResponse = (lines) =>
  new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const line of lines) controller.enqueue(encoder.encode(line));
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );

const jsonChunk = (delta, extra = {}) => `data: ${JSON.stringify({ id: 'c1', model: 'hy3', choices: [{ delta, finish_reason: null }], ...extra })}\n\n`;

const chatLines = [
  jsonChunk({ content: 'Hello' }),
  // The gateway stamps every delta with an empty tool_calls array: it must not
  // close the open text block (the one-token-per-line regression).
  jsonChunk({ content: ' world', tool_calls: [] }),
  `data: ${JSON.stringify({ id: 'c1', choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2 } })}\n\n`,
  'data: [DONE]\n\n',
];

const callOptions = (overrides = {}) => ({
  prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  ...overrides,
});

const collectStream = async (stream) => {
  const parts = [];
  for await (const part of stream) parts.push(part);
  return parts;
};

describe('generated WorkBuddy plugin source', () => {
  it('is syntactically valid JavaScript', async () => {
    const file = path.join(await temporaryDirectory('openchamber-workbuddy-check-'), 'index.js');
    await fs.writeFile(file, createWorkBuddyPluginSource());
    // Generated JS is outside type-check and lint; node --check is the gate.
    await expect(execFileAsync(process.execPath, ['--check', file])).resolves.toBeTruthy();
  });

  it('exposes the plugin contract and a single create* factory', async () => {
    const plugin = await loadPlugin();
    expect(plugin.default).toMatchObject({ id: 'openchamber-workbuddy-cn' });
    expect(plugin.default.setup).toBeInstanceOf(Function);
    expect(plugin.createWorkBuddy).toBeInstanceOf(Function);
    const createExports = Object.keys(plugin).filter((name) => name.startsWith('create'));
    expect(createExports).toEqual(['createWorkBuddy']);
    const factory = plugin.createWorkBuddy();
    expect(factory.languageModel).toBeInstanceOf(Function);
  });
});

describe('WorkBuddy plugin credentials', () => {
  it('signs chat requests from the shared own-store file', async () => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T1', refreshToken: 'R1', expiresAtMs: Date.now() + 3600_000, uid: 'u1', domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return sseResponse(chatLines);
    };
    const plugin = await loadPlugin();
    const model = plugin.createWorkBuddy().languageModel('hy3');
    const parts = (await collectStream((await model.doStream(callOptions())).stream)).filter(
      (part) => part.type !== 'response-metadata',
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://www.workbuddy.cn/v2/chat/completions');
    expect(requests[0].init.headers.Authorization).toBe('Bearer T1');
    const body = JSON.parse(requests[0].init.body);
    expect(body.stream).toBe(true);
    expect(body.messages[0].role).toBe('system');
    expect(parts.map((part) => part.type)).toEqual(['stream-start', 'text-start', 'text-delta', 'text-delta', 'text-end', 'finish']);
    const text = parts.filter((part) => part.type === 'text-delta').map((part) => part.delta).join('');
    expect(text).toBe('Hello world');
    const finish = parts.at(-1);
    expect(finish.finishReason.unified).toBe('stop');
    expect(finish.usage.inputTokens.total).toBe(3);
  });

  it('prefers the CN token variable over the store', async () => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T-store', refreshToken: '', expiresAtMs: 0, uid: '', domain: '' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    withEnvironment('WORKBUDDY_CN_TOKEN', 'T-env');
    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return sseResponse(chatLines);
    };
    const plugin = await loadPlugin();
    await collectStream((await plugin.createWorkBuddy().languageModel('hy3').doStream(callOptions())).stream);
    expect(requests[0].init.headers.Authorization).toBe('Bearer T-env');
    expect(requests[0].init.headers['X-No-User-Id']).toBe('1');
  });

  it('reads a plaintext desktop auth file scoped to the CN domain', async () => {
    const desktop = path.join(await temporaryDirectory('openchamber-workbuddy-desktop-'), 'workbuddy-desktop.info');
    await fs.writeFile(
      desktop,
      JSON.stringify({ account: { uid: 'u-desktop' }, auth: { accessToken: 'T-desktop', refreshToken: 'R-desktop', expiresAt: Date.now() + 3600_000, domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_AUTH_FILE', desktop);
    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return sseResponse(chatLines);
    };
    const plugin = await loadPlugin();
    await collectStream((await plugin.createWorkBuddy().languageModel('hy3').doStream(callOptions())).stream);
    expect(requests[0].init.headers.Authorization).toBe('Bearer T-desktop');
    expect(requests[0].init.headers['X-User-Id']).toBe('u-desktop');
  });

  it('never sends an international desktop token to the CN endpoint', async () => {
    const desktop = path.join(await temporaryDirectory('openchamber-workbuddy-desktop-'), 'workbuddy-desktop-ai.info');
    await fs.writeFile(
      desktop,
      JSON.stringify({ account: { uid: 'u-intl' }, auth: { accessToken: 'T-intl', refreshToken: '', expiresAt: Date.now() + 3600_000, domain: 'www.workbuddy.ai' } }),
    );
    withEnvironment('WORKBUDDY_AUTH_FILE', desktop);
    globalThis.fetch = async () => {
      throw new Error('must not be called without a credential');
    };
    const plugin = await loadPlugin();
    await expect(plugin.createWorkBuddy().languageModel('hy3').doStream(callOptions())).rejects.toThrow(/not signed in/i);
  });

  it('renews a rejected store credential, replays once and rewrites the store', async () => {
    const directory = await temporaryDirectory('openchamber-workbuddy-store-');
    const store = path.join(directory, 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T1', refreshToken: 'R1', expiresAtMs: Date.now() + 3600_000, uid: 'u1', domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/v2/plugin/auth/token/refresh')) {
        return Response.json({ code: 0, data: { accessToken: 'T2', refreshToken: 'R2', expiresIn: 3600, domain: 'www.workbuddy.cn' } });
      }
      if (requests.filter((request) => request.url.endsWith('/v2/chat/completions')).length === 1) {
        return Response.json({ code: 401, msg: 'token expired' }, { status: 401 });
      }
      return sseResponse(chatLines);
    };
    const plugin = await loadPlugin();
    const parts = await collectStream((await plugin.createWorkBuddy().languageModel('hy3').doStream(callOptions())).stream);

    const chatRequests = requests.filter((request) => request.url.endsWith('/v2/chat/completions'));
    expect(chatRequests).toHaveLength(2);
    expect(chatRequests[0].init.headers.Authorization).toBe('Bearer T1');
    expect(chatRequests[1].init.headers.Authorization).toBe('Bearer T2');
    expect(parts.at(-1).finishReason.unified).toBe('stop');
    const rewritten = JSON.parse(await fs.readFile(store, 'utf8'));
    expect(rewritten.credential).toMatchObject({ accessToken: 'T2', refreshToken: 'R2' });
  });

  it('keeps serving a still-valid credential when the refresh fails', async () => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T1', refreshToken: 'R1', expiresAtMs: Date.now() + 60_000, uid: 'u1', domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/v2/plugin/auth/token/refresh')) {
        return Response.json({ code: 30012, msg: 'refresh rejected' }, { status: 200 });
      }
      return sseResponse(chatLines);
    };
    const plugin = await loadPlugin();
    const parts = await collectStream((await plugin.createWorkBuddy().languageModel('hy3').doStream(callOptions())).stream);
    expect(parts.at(-1).finishReason.unified).toBe('stop');
    expect(requests.some((request) => request.url.endsWith('/v2/chat/completions'))).toBe(true);
  });
});

describe('WorkBuddy plugin request shaping', () => {
  const captureBody = async (options) => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T1', refreshToken: 'R1', expiresAtMs: Date.now() + 3600_000, uid: 'u1', domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    let body;
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith('/v2/chat/completions')) {
        body = JSON.parse(init.body);
        return sseResponse(chatLines);
      }
      throw new Error('unexpected fetch: ' + String(url));
    };
    const plugin = await loadPlugin();
    await collectStream((await plugin.createWorkBuddy().languageModel(options.modelID ?? 'hy3').doStream({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      ...options,
    })).stream);
    return body;
  };

  it('sends a supported effort variant and drops an unsupported one', async () => {
    expect((await captureBody({ reasoningEffort: 'high' })).reasoning_effort).toBe('high');
    expect((await captureBody({ reasoningEffort: 'max' })).reasoning_effort).toBeUndefined();
  });

  it('caps the flash loop models at 16384 output tokens', async () => {
    expect((await captureBody({ modelID: 'deepseek-v4.1-flash', maxOutputTokens: 128000 })).max_tokens).toBe(16384);
    expect((await captureBody({ modelID: 'hy3', maxOutputTokens: 1000 })).max_tokens).toBe(1000);
  });

  it('stringifies tool results and replays assistant tool calls', async () => {
    const body = await captureBody({
      prompt: [
        { role: 'user', content: [{ type: 'text', text: 'run it' }] },
        { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'read', input: '{"path":"a"}' }] },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call-1', output: { type: 'json', value: { ok: true } } }] },
      ],
    });
    expect(body.messages).toHaveLength(4);
    expect(body.messages[2].tool_calls).toEqual([{ id: 'call-1', type: 'function', function: { name: 'read', arguments: '{"path":"a"}' } }]);
    // Replayed reasoning must not reach the wire, and content stays a string.
    expect(body.messages[2].content).toBe('');
    expect(body.messages[3]).toEqual({ role: 'tool', tool_call_id: 'call-1', content: '{"ok":true}' });
  });
});

describe('WorkBuddy plugin streaming shapes', () => {
  const streamParts = async (lines) => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T1', refreshToken: 'R1', expiresAtMs: Date.now() + 3600_000, uid: 'u1', domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    globalThis.fetch = async () => sseResponse(lines);
    const plugin = await loadPlugin();
    return collectStream((await plugin.createWorkBuddy().languageModel('hy3').doStream(callOptions())).stream);
  };

  it('keeps reasoning and text in their own blocks', async () => {
    const parts = (await streamParts([
      jsonChunk({ reasoning_content: 'thinking' }),
      jsonChunk({ content: 'answer' }),
      jsonChunk({ reasoning_content: 'more' }),
      jsonChunk({ content: 'final' }),
      'data: [DONE]\n\n',
    ])).filter((part) => part.type !== 'response-metadata');
    const types = parts.map((part) => part.type);
    expect(types).toEqual([
      'stream-start',
      'reasoning-start', 'reasoning-delta', 'reasoning-end',
      'text-start', 'text-delta', 'text-end',
      'reasoning-start', 'reasoning-delta', 'reasoning-end',
      'text-start', 'text-delta', 'text-end',
      'finish',
    ]);
  });

  it('emits tool calls once their arguments parse', async () => {
    const parts = (await streamParts([
      jsonChunk({ tool_calls: [{ index: 0, id: 'call-9', type: 'function', function: { name: 'bash', arguments: '{"command"' } }] }),
      jsonChunk({ tool_calls: [{ index: 0, function: { arguments: ':"ls"}' } }] }),
      `data: ${JSON.stringify({ id: 'c1', choices: [{ delta: {}, finish_reason: 'tool_calls' }] })}\n\n`,
      'data: [DONE]\n\n',
    ])).filter((part) => part.type !== 'response-metadata');
    const types = parts.map((part) => part.type);
    expect(types).toEqual([
      'stream-start',
      'tool-input-start', 'tool-input-delta', 'tool-input-delta', 'tool-input-end', 'tool-call',
      'finish',
    ]);
    const call = parts.find((part) => part.type === 'tool-call');
    expect(call).toMatchObject({ toolCallId: 'call-9', toolName: 'bash', input: '{"command":"ls"}' });
    expect(parts.at(-1).finishReason.unified).toBe('tool-calls');
  });

  it('carries malformed SSE lines without dying', async () => {
    const parts = await streamParts(['data: not-json\n\n', ...chatLines]);
    expect(parts.at(-1).finishReason.unified).toBe('stop');
    expect(parts.filter((part) => part.type === 'text-delta').map((part) => part.delta).join('')).toBe('Hello world');
  });
});

describe('WorkBuddy plugin registration', () => {
  const createFakeContext = () => {
    const registered = { integrationUpdates: [], methods: [], languageHooks: [], reloads: 0, added: [] };
    let providerCallback;
    const runProviderEditor = () => providerCallback({ get: () => undefined, add: (input) => registered.added.push(input) });
    const context = {
      integration: {
        transform: async (callback) => {
          callback({
            update: (id, update) => registered.integrationUpdates.push({ id, update }),
            method: { update: (input) => registered.methods.push(input) },
          });
        },
        connection: {
          active: async () => undefined,
          resolve: async () => undefined,
        },
      },
      provider: {
        transform: async (callback) => {
          providerCallback = callback;
          runProviderEditor();
        },
        reload: async () => {
          registered.reloads += 1;
          runProviderEditor();
        },
      },
      aisdk: {
        hook: async (name, callback) => {
          if (name === 'language') registered.languageHooks.push(callback);
        },
      },
      event: {
        subscribe: async function* () {
          await new Promise(() => {});
        },
      },
    };
    return { context, registered };
  };

  it('registers the integration methods and the provider with catalogue models', async () => {
    const directory = await temporaryDirectory('openchamber-workbuddy-store-');
    const store = path.join(directory, 'workbuddy-cn-auth.json');
    await fs.writeFile(
      store,
      JSON.stringify({ version: 1, credential: { accessToken: 'T1', refreshToken: 'R1', expiresAtMs: Date.now() + 3600_000, uid: 'u1', domain: 'www.workbuddy.cn' } }),
    );
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/console/enterprises/personal/models')) {
        return Response.json({
          code: 0,
          data: {
            models: [
              { id: 'live-1', name: 'Live One', credits: 'x1.00', maxInputTokens: 100000, maxOutputTokens: 10000, supportsReasoning: true, supportsImages: true, reasoning: { supportedEfforts: ['low', 'high'] } },
              { id: 'live-2', name: 'Live Two', credits: 'x0.00', maxInputTokens: 200000, maxOutputTokens: 20000, supportsReasoning: false, supportsImages: false },
              { id: 'live-3', name: 'Live Three', credits: 'x0.30', maxInputTokens: 300000, maxOutputTokens: 30000, supportsReasoning: true, supportsImages: true, reasoning: { supportedEfforts: ['low', 'high'] } },
            ],
          },
        });
      }
      throw new Error('unexpected fetch: ' + String(url));
    };
    const plugin = await loadPlugin();
    const { context, registered } = createFakeContext();
    await plugin.default.setup(context);

    expect(registered.integrationUpdates).toContainEqual(expect.objectContaining({ id: 'workbuddy-cn' }));
    const methods = registered.methods.map((entry) => entry.method);
    expect(methods).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'key' }),
      expect.objectContaining({ type: 'oauth' }),
    ]));
    // The live catalogue wins for ids; the hidden bundled model survives.
    const ids = registered.added.at(-1).models.map((model) => model.id);
    expect(ids).toContain('live-1');
    expect(ids).toContain('live-2');
    expect(ids).toContain('hy4-preview-f');
    const live1 = registered.added.at(-1).models.find((model) => model.id === 'live-1');
    expect(live1.limit).toEqual({ context: 100000, input: 100000, output: 10000 });
    expect(live1.variants.map((variant) => variant.id)).toEqual(['low', 'high']);
    // The provider exists even before any login: the card shows, the picker stays empty.
    expect(registered.added.at(-1).info).toMatchObject({ id: 'workbuddy-cn', integrationID: 'workbuddy-cn' });
  });

  it('registers no models while unauthenticated and never touches the network', async () => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'absent.json');
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    let networkCalls = 0;
    globalThis.fetch = async () => {
      networkCalls += 1;
      throw new Error('network must stay untouched');
    };
    const plugin = await loadPlugin();
    const { context, registered } = createFakeContext();
    await plugin.default.setup(context);
    expect(networkCalls).toBe(0);
    expect(registered.added.at(-1).models).toEqual([]);
  });

  it('the language hook fails with sign-in guidance when unauthenticated', async () => {
    const store = path.join(await temporaryDirectory('openchamber-workbuddy-store-'), 'absent.json');
    withEnvironment('WORKBUDDY_STORE_PATH', store);
    const plugin = await loadPlugin();
    const { context, registered } = createFakeContext();
    await plugin.default.setup(context);
    const hook = registered.languageHooks.at(-1);
    await expect(hook({ model: { providerID: 'workbuddy-cn', modelID: 'hy3', id: 'hy3' } })).rejects.toThrow(/not signed in/i);
  });
});
