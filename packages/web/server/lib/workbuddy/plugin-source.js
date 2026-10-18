/**
 * The WorkBuddy CN provider plugin for OpenCode 2.x, generated as source text.
 *
 * OpenChamber materializes this into `<dataDir>/workbuddy-plugin/workbuddy-cn/`
 * (`package.json` + `index.js`) and names the directory in the watched
 * `opencode.managed.json`, so the running OpenCode loads it without a restart.
 * The generated file must stay single-file and dependency-free: OpenCode loads
 * the entrypoint with a bare dynamic import and nothing resolves from the
 * generated directory.
 *
 * What the plugin does, all inside the running OpenCode process:
 * - registers the `workbuddy-cn` integration with a paste-token method and a
 *   browser-login method (the same `/v2/plugin/auth/*` protocol the WorkBuddy
 *   CLI uses), so OpenChamber's existing Providers page offers sign-in;
 * - resolves credentials in order: OpenCode's stored connection, the shared
 *   own-store file (`~/.config/opencode/workbuddy-cn-auth.json`, the same
 *   schema and location the standalone reference adapters use, so an existing
 *   login migrates over unchanged), the `WORKBUDDY_CN_TOKEN` variable, and the
 *   WorkBuddy desktop app's auth file when that build stores plaintext tokens;
 * - discovers the live model catalogue (`/console/enterprises/personal/models`,
 *   then `/v3/config`) once an hour and merges it over the bundled CN table;
 * - registers the models on the `workbuddy-cn` provider, so they appear in
 *   OpenChamber's model picker like any first-party provider;
 * - serves chat through WorkBuddy's OpenAI-compatible streaming endpoint,
 *   re-attaching refreshed credentials and replaying once on a rejection.
 *
 * The desktop auth file is a fallback, not the primary path: current desktop
 * builds encrypt `accessToken`/`refreshToken` as `$wbEncrypted` envelopes, so
 * only older plaintext files are usable and the browser login is the reliable
 * route.
 *
 * Nothing here writes an OpenChamber-owned credential store or a settings key:
 * OpenCode 2.x owns provider credentials, and the plugin keeps its own-store
 * file solely for migration and CLI interop.
 */

export const WORKBUDDY_PLUGIN_DIRECTORY_NAME = 'workbuddy-cn';

export const WORKBUDDY_PLUGIN_PACKAGE_JSON = `${JSON.stringify(
  {
    name: 'openchamber-workbuddy-cn',
    version: '0.0.0',
    private: true,
    type: 'module',
    exports: { '.': './index.js' },
  },
  null,
  2,
)}\n`;

/** Bundled CN model table, transcribed from the live console endpoint (2026-09). */
const BUNDLED_CN_MODELS = [
  { id: 'auto', name: 'Auto', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 168000, maxTokens: 32000 },
  { id: 'hy3', name: 'Hy3', reasoning: true, efforts: ['low', 'high'], input: ['text', 'image'], contextWindow: 192000, maxTokens: 64000, credits: 'x0.00' },
  { id: 'hy3-x', name: 'Hy3-X', reasoning: true, efforts: ['low', 'high'], input: ['text', 'image'], contextWindow: 192000, maxTokens: 64000, credits: 'x0.05' },
  { id: 'hy4-preview', name: 'Hy4 preview', reasoning: true, efforts: ['high'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 64000, credits: 'x0.29' },
  // Gateway-accepted but listed by no discovery endpoint; preserved through live refreshes.
  { id: 'hy4-preview-f', name: 'Hy4 preview (free)', reasoning: true, efforts: ['high'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 64000, credits: 'x0.00', hidden: true },
  { id: 'default', name: 'Default', reasoning: false, efforts: [], input: ['text'], contextWindow: 200000, maxTokens: 24000, credits: 'x2.20' },
  { id: 'glm-5v-turbo', name: 'GLM-5V-Turbo', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 200000, maxTokens: 64000, credits: 'x0.71' },
  { id: 'glm-5.3', name: 'GLM-5.3', reasoning: true, efforts: ['low', 'high', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 64000, credits: 'x0.52' },
  { id: 'glm-5.3-flash', name: 'GLM-5.3-Flash', reasoning: true, efforts: ['low', 'high', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 32000, credits: 'x0.11' },
  { id: 'glm-5.2', name: 'GLM-5.2', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 64000, credits: 'x0.79' },
  { id: 'glm-5.1', name: 'GLM-5.1', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 200000, maxTokens: 48000, credits: 'x0.79' },
  { id: 'glm-5.0', name: 'GLM-5.0', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 200000, maxTokens: 48000, credits: 'x0.80' },
  { id: 'glm-4.7', name: 'GLM-4.7', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 200000, maxTokens: 32000, credits: 'x0.23' },
  { id: 'glm-4.6', name: 'GLM-4.6', reasoning: false, efforts: [], input: ['text'], contextWindow: 200000, maxTokens: 32000, credits: 'x0.18' },
  { id: 'glm-4.6v', name: 'GLM-4.6V', reasoning: false, efforts: [], input: ['text', 'image'], contextWindow: 64000, maxTokens: 16000, credits: 'x0.77' },
  { id: 'minimax-m3', name: 'MiniMax-M3', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 512000, maxTokens: 64000, credits: 'x0.25' },
  { id: 'minimax-m2.5', name: 'MiniMax-M2.5', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text'], contextWindow: 200000, maxTokens: 64000, credits: 'x0.18' },
  { id: 'kimi-k3-1', name: 'Kimi-K3', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 32000, credits: 'x1.62' },
  { id: 'kimi-k2.8-preview', name: 'Kimi-K2.8-Preview', reasoning: true, efforts: ['low', 'high', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 64000, credits: 'x0.54' },
  { id: 'kimi-k2.7', name: 'Kimi-K2.7', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 256000, maxTokens: 32000, credits: 'x0.57' },
  { id: 'kimi-k2.6', name: 'Kimi-K2.6', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 256000, maxTokens: 32000, credits: 'x0.45' },
  { id: 'kimi-k2.5', name: 'Kimi-K2.5', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 164000, maxTokens: 32000, credits: 'x0.45' },
  { id: 'kimi-k2-thinking', name: 'Kimi-K2-Thinking', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text'], contextWindow: 256000, maxTokens: 16000, credits: 'x0.29' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 50000, credits: 'x0.17' },
  { id: 'deepseek-v4.1-flash', name: 'DeepSeek-V4.1-Flash', reasoning: true, efforts: ['low', 'high', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 128000, credits: 'x0.03' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text', 'image'], contextWindow: 1000000, maxTokens: 128000, credits: 'x0.51' },
  { id: 'deepseek-v3-2-volc', name: 'DeepSeek-V3.2', reasoning: false, efforts: [], input: ['text'], contextWindow: 128000, maxTokens: 64000, credits: 'x0.06' },
  { id: 'hunyuan-2.0-thinking', name: 'Hunyuan-2.0-Thinking', reasoning: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'], input: ['text'], contextWindow: 200000, maxTokens: 24000, credits: 'x0.04' },
  { id: 'hunyuan-chat', name: 'Hunyuan-Turbos', reasoning: false, efforts: [], input: ['text'], contextWindow: 200000, maxTokens: 8192 },
];

const pluginSource = String.raw`// Generated by OpenChamber — do not edit this file directly.
// Source template: packages/web/server/lib/workbuddy/plugin-source.js in the
// OpenChamber repository; changes belong there and are regenerated on start.
// The WorkBuddy CN provider plugin for OpenCode 2.x. Single file, no deps.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PLUGIN_ID = "openchamber-workbuddy-cn";
const PROVIDER_ID = "workbuddy-cn";
const INTEGRATION_ID = "workbuddy-cn";
const PROVIDER_NAME = "WorkBuddy AI (CN)";
const LOGIN_BASE = "https://www.workbuddy.cn";
const USER_AGENT = "CLI/2.63.2 CodeBuddy/2.63.2";
const METHOD_OAUTH = "browser";
const STATE_PATH = "/v2/plugin/auth/state";
const TOKEN_PATH = "/v2/plugin/auth/token";
const REFRESH_PATH = "/v2/plugin/auth/token/refresh";
const CHAT_PATH = "/v2/chat/completions";
const CATALOGUE_PATHS = ["/console/enterprises/personal/models", "/v3/config"];
const CATALOGUE_TTL_MS = 60 * 60 * 1000;
const CATALOGUE_ERROR_TTL_MS = 60 * 1000;
const CATALOGUE_TIMEOUT_MS = 8000;
const CATALOGUE_MIN_PLAUSIBLE = 3;
const REFRESH_SKEW_MS = 5 * 60 * 1000;
const LOGIN_POLL_DEADLINE_MS = 15 * 60 * 1000;
const LOGIN_POLL_INTERVAL_MS = 2000;
const LOGIN_PENDING_CODE = 11217;
const CHAT_TIMEOUT_MS = 300000;
const FLASH_MAX_TOKENS = 16384;
const FLASH_LOOP_IDS = new Set(["deepseek-v4.1-flash", "deepseek-v4-flash"]);
const DEFAULT_EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const DESKTOP_AUTH_FILES = ["workbuddy-desktop.info", "workbuddy-desktop-ai.info"];

const BUNDLED_MODELS = ${JSON.stringify(BUNDLED_CN_MODELS)};

// ---------------------------------------------------------------------------
// logging: only real problems reach stderr; a normal session stays clean
// ---------------------------------------------------------------------------

function warn(message) {
  console.error("[workbuddy-cn] warn: " + message);
}

// ---------------------------------------------------------------------------
// environment + small helpers
// ---------------------------------------------------------------------------

function env(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function envBool(name) {
  const value = env(name);
  return value === "1" || value === "true" || value === "yes";
}

function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function positiveInt(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function baseHeaders(base) {
  return {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    Origin: base,
    Referer: base + "/",
    "User-Agent": USER_AGENT,
  };
}

function chatHeaders(credential, base) {
  const domain = credential.domain || base.replace(/^https?:\/\//, "");
  return {
    Accept: "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    Origin: base,
    Referer: base + "/",
    "User-Agent": USER_AGENT,
    Authorization: "Bearer " + credential.accessToken,
    ...(credential.uid ? { "X-User-Id": credential.uid } : { "X-No-User-Id": "1" }),
    ...(credential.enterpriseId
      ? { "X-Enterprise-Id": credential.enterpriseId }
      : { "X-No-Enterprise-Id": "1" }),
    ...(domain ? { "X-Domain": domain } : { "X-No-Department-Info": "1" }),
    "X-Product": "SaaS",
  };
}

function baseUrlFor(credential) {
  const override = env("WORKBUDDY_BASE_URL");
  if (override) return override.replace(/\/+$/, "");
  if (credential.domain) return "https://" + credential.domain;
  return LOGIN_BASE;
}

// ---------------------------------------------------------------------------
// own credential store — same file, schema and location as the standalone
// WorkBuddy adapters, so an existing login migrates over unchanged
// ---------------------------------------------------------------------------

function storePath() {
  const override = env("WORKBUDDY_STORE_PATH");
  if (override) return override;
  const base = env("XDG_CONFIG_HOME") || path.join(homedir(), ".config");
  return path.join(base, "opencode", "workbuddy-cn-auth.json");
}

function parseOwnStore(text) {
  const document = asRecord(safeJson(text));
  if (!document || document.version !== 1) return undefined;
  const stored = asRecord(document.credential);
  if (!stored) return undefined;
  const accessToken = typeof stored.accessToken === "string" ? stored.accessToken : "";
  if (!accessToken) return undefined;
  const enterpriseId = optionalString(stored.enterpriseId);
  return {
    accessToken,
    refreshToken: typeof stored.refreshToken === "string" ? stored.refreshToken : "",
    expiresAtMs: typeof stored.expiresAtMs === "number" ? stored.expiresAtMs : 0,
    uid: optionalString(stored.uid) ?? "",
    domain: optionalString(stored.domain) ?? "",
    nickname: optionalString(stored.nickname),
    ...(enterpriseId ? { enterpriseId } : {}),
  };
}

function readOwnStore() {
  const file = storePath();
  try {
    if (!existsSync(file)) return undefined;
    const credential = parseOwnStore(readFileSync(file, "utf8"));
    if (credential) return credential;
    warn("credential store exists but is not readable: " + file);
    return undefined;
  } catch (error) {
    warn("could not read credential store " + file + " (" + errorMessage(error) + ")");
    return undefined;
  }
}

function saveOwnStore(credential) {
  const file = storePath();
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    const temporary = file + ".tmp-" + process.pid + "-" + Date.now();
    writeFileSync(temporary, JSON.stringify({ version: 1, credential }, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    renameSync(temporary, file);
  } catch (error) {
    warn("could not persist credential (" + errorMessage(error) + ")");
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function optionalString(value) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

// ---------------------------------------------------------------------------
// desktop auth file — a fallback for desktop builds that keep plaintext tokens
// (current builds encrypt them as $wbEncrypted envelopes and are skipped)
// ---------------------------------------------------------------------------

function expiryToMs(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1e12 ? value : value * 1000;
}

function parseWorkBuddyAuth(text) {
  const document = asRecord(safeJson(text));
  if (!document) return undefined;
  const nested = asRecord(document.auth);
  const auth = nested ?? document;
  const identity = nested ? (asRecord(document.account) ?? document) : document;
  const accessToken = typeof auth.accessToken === "string" ? auth.accessToken : "";
  if (!accessToken) return undefined;
  const enterpriseId = optionalString(identity.enterpriseId) ?? optionalString(auth.enterpriseId);
  return {
    accessToken,
    refreshToken: typeof auth.refreshToken === "string" ? auth.refreshToken : "",
    expiresAtMs:
      typeof auth.expiresAt === "number"
        ? expiryToMs(auth.expiresAt)
        : typeof auth.expiresIn === "number" && auth.expiresIn > 0
          ? Date.now() + auth.expiresIn * 1000
          : 0,
    uid: optionalString(identity.uid) ?? optionalString(identity.uin) ?? uidFromJwt(accessToken) ?? "",
    domain: optionalString(auth.domain) ?? "",
    nickname: optionalString(identity.nickname) ?? optionalString(identity.preferred_username),
    ...(enterpriseId ? { enterpriseId } : {}),
  };
}

function desktopCandidates() {
  const override = env("WORKBUDDY_AUTH_FILE");
  if (override) return [override];
  const home = homedir();
  const relatives = ["CodeBuddyExtension", "Data", "Public", "auth"];
  const files = [];
  if (process.platform === "darwin") {
    for (const name of DESKTOP_AUTH_FILES)
      files.push(path.join(home, "Library", "Application Support", ...relatives, name));
  } else if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const roaming = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    for (const root of [local, roaming])
      for (const name of DESKTOP_AUTH_FILES) files.push(path.join(root, ...relatives, name));
  } else {
    const config = env("XDG_CONFIG_HOME") || path.join(home, ".config");
    for (const name of DESKTOP_AUTH_FILES) files.push(path.join(config, ...relatives, name));
  }
  return files;
}

function isCnDomain(domain) {
  if (!domain) return false;
  const host = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  return host === "workbuddy.cn" || host.endsWith(".workbuddy.cn");
}

function readDesktopCredential() {
  for (const file of desktopCandidates()) {
    try {
      if (!existsSync(file)) continue;
      const credential = parseWorkBuddyAuth(readFileSync(file, "utf8"));
      // A token whose domain is not CN must never sign CN requests.
      if (credential && (!credential.domain || isCnDomain(credential.domain))) return credential;
    } catch {
      // unreadable candidate — fall through
    }
  }
  return undefined;
}

function uidFromJwt(token) {
  const part = token.split(".")[1];
  if (!part) return undefined;
  try {
    const padded = part.replaceAll("-", "+").replaceAll("_", "/");
    const payload = asRecord(JSON.parse(Buffer.from(padded, "base64").toString("utf8")));
    return optionalString(payload?.uid) ?? optionalString(payload?.sub);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// credential resolution — OpenCode connection, then env, then own store,
// then the desktop file; the freshest of the last two wins
// ---------------------------------------------------------------------------

function isFresh(credential) {
  if (!credential.expiresAtMs) return true;
  return Date.now() + REFRESH_SKEW_MS < credential.expiresAtMs;
}

// An in-place renewal keyed by the token that triggered it, so a refresh
// survives only as long as its source credential is still being presented.
let renewalCache = null;

function adoptRenewal(sourceToken, next) {
  renewalCache = { sourceToken, next };
  return next;
}

function rememberedRenewal(credential) {
  return renewalCache && renewalCache.sourceToken === credential.accessToken
    ? renewalCache.next
    : undefined;
}

async function refreshCredential(credential) {
  if (!credential.refreshToken) throw new Error("no refresh token available");
  const base = baseUrlFor(credential);
  const response = await fetch(base + REFRESH_PATH, {
    method: "POST",
    headers: {
      ...baseHeaders(base),
      "X-Refresh-Token": credential.refreshToken,
      "X-Auth-Refresh-Source": "workbuddy",
      ...(credential.enterpriseId ? { "X-Enterprise-Id": credential.enterpriseId } : {}),
    },
    body: "{}",
    signal: AbortSignal.timeout(30000),
  });
  const envelope = asRecord(await response.json().catch(() => undefined)) ?? {};
  const data = asRecord(envelope.data) ?? {};
  const accessToken = typeof data.accessToken === "string" ? data.accessToken : "";
  if (!response.ok || envelope.code !== 0 || !accessToken) {
    throw new Error(
      typeof envelope.msg === "string" && envelope.msg ? envelope.msg : "refresh HTTP " + response.status,
    );
  }
  return {
    ...credential,
    accessToken,
    refreshToken:
      typeof data.refreshToken === "string" && data.refreshToken ? data.refreshToken : credential.refreshToken,
    expiresAtMs:
      typeof data.expiresIn === "number" && data.expiresIn > 0
        ? Date.now() + data.expiresIn * 1000
        : credential.expiresAtMs,
    domain: optionalString(data.domain) ?? credential.domain,
  };
}

function credentialFromConnectionValue(value) {
  const record = asRecord(value);
  if (!record) return undefined;
  if (record.type === "oauth") {
    const accessToken = typeof record.access === "string" ? record.access : "";
    if (!accessToken) return undefined;
    const metadata = asRecord(record.metadata) ?? {};
    const baseUrl = optionalString(metadata.baseUrl);
    return {
      accessToken,
      refreshToken: typeof record.refresh === "string" ? record.refresh : "",
      expiresAtMs: typeof record.expires === "number" ? record.expires : 0,
      uid: optionalString(metadata.userID) ?? uidFromJwt(accessToken) ?? "",
      domain: baseUrl ? baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "",
      nickname: optionalString(metadata.nickname),
      ...(optionalString(metadata.enterpriseId) ? { enterpriseId: metadata.enterpriseId } : {}),
    };
  }
  if (record.type === "key") {
    const raw = typeof record.key === "string" ? record.key : "";
    if (!raw) return undefined;
    const [token, uid, base] = raw.split("|");
    if (!token) return undefined;
    return {
      accessToken: token,
      refreshToken: "",
      expiresAtMs: 0,
      uid: uid || uidFromJwt(token) || "",
      domain: base ? base.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "",
    };
  }
  return undefined;
}

async function resolveStoredCredential() {
  const envToken = env("WORKBUDDY_CN_TOKEN");
  if (envToken) {
    return {
      accessToken: envToken,
      refreshToken: "",
      expiresAtMs: 0,
      uid: env("WORKBUDDY_CN_UID") ?? uidFromJwt(envToken) ?? "",
      domain: "",
    };
  }
  const own = readOwnStore();
  const desktop = readDesktopCredential();
  let credential;
  if (own && desktop) credential = own.expiresAtMs >= desktop.expiresAtMs ? own : desktop;
  else credential = own ?? desktop;
  if (credential) return { ...credential, origin: own && credential === own ? "store" : "desktop" };
  return undefined;
}

/**
 * The credential a chat request runs on, refreshed in place when it is close
 * to expiry. Renewals of store-originated credentials are written back to the
 * own store; OpenCode-owned connections are renewed through the integration
 * refresh hook instead, so the store file is never written from here.
 */
async function resolveCredential(connectionLoader) {
  let credential;
  let origin = "connection";
  const connection = connectionLoader ? await connectionLoader().catch(() => undefined) : undefined;
  if (connection) {
    credential = credentialFromConnectionValue(connection.value);
  }
  if (!credential) {
    const stored = await resolveStoredCredential();
    if (stored) {
      credential = stored;
      origin = stored.origin ?? "store";
    }
  }
  if (!credential) return undefined;
  const remembered = rememberedRenewal(credential);
  if (remembered) return remembered;
  if (isFresh(credential)) return credential;
  if (!credential.refreshToken) return credential.expiresAtMs > Date.now() ? credential : undefined;
  try {
    const next = await refreshCredential(credential);
    if (origin === "store") saveOwnStore(next);
    return adoptRenewal(credential.accessToken, next);
  } catch (error) {
    warn("credential refresh failed (" + errorMessage(error) + ")");
    // A token that is not hard-expired yet is still worth spending: a transient
    // refresh outage must not block an otherwise usable credential.
    return credential.expiresAtMs > Date.now() ? credential : undefined;
  }
}

// ---------------------------------------------------------------------------
// browser login — the same protocol the WorkBuddy CLI uses; OpenChamber's
// Providers page drives it through OpenCode's integration OAuth flow
// ---------------------------------------------------------------------------

async function startLogin() {
  const nonce = randomUUID().replaceAll("-", "");
  const response = await fetch(LOGIN_BASE + STATE_PATH + "?platform=CLI&nonce=" + nonce, {
    method: "POST",
    headers: {
      ...baseHeaders(LOGIN_BASE),
      "X-Product": "SaaS",
      "X-No-Authorization": "true",
      "X-No-User-Id": "1",
      "X-No-Enterprise-Id": "1",
      "X-No-Department-Info": "1",
    },
    body: JSON.stringify({ nonce }),
    signal: AbortSignal.timeout(30000),
  });
  const envelope = asRecord(await response.json().catch(() => undefined)) ?? {};
  const data = asRecord(envelope.data) ?? {};
  const state = typeof data.state === "string" ? data.state : "";
  const authUrl = typeof data.authUrl === "string" ? data.authUrl : "";
  if (!response.ok || envelope.code !== 0 || !state || !authUrl) {
    throw new Error(
      typeof envelope.msg === "string" && envelope.msg ? envelope.msg : "WorkBuddy login start failed",
    );
  }
  return { state, authUrl };
}

async function pollLogin(state) {
  const deadline = Date.now() + LOGIN_POLL_DEADLINE_MS;
  const headers = {
    ...baseHeaders(LOGIN_BASE),
    "X-Product": "SaaS",
    "X-No-Authorization": "true",
    "X-No-User-Id": "1",
    "X-No-Enterprise-Id": "1",
    "X-No-Department-Info": "1",
  };
  while (Date.now() < deadline) {
    const response = await fetch(LOGIN_BASE + TOKEN_PATH + "?state=" + encodeURIComponent(state), {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    const envelope = asRecord(await response.json().catch(() => undefined)) ?? {};
    if (envelope.code === LOGIN_PENDING_CODE) {
      await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_INTERVAL_MS));
      continue;
    }
    const data = asRecord(envelope.data) ?? {};
    const accessToken = typeof data.accessToken === "string" ? data.accessToken : "";
    if (!response.ok || envelope.code !== 0 || !accessToken) {
      throw new Error(
        typeof envelope.msg === "string" && envelope.msg ? envelope.msg : "WorkBuddy login failed",
      );
    }
    const uid = optionalString(data.uid) ?? uidFromJwt(accessToken) ?? "";
    const enterpriseId = optionalString(data.enterpriseId) ?? optionalString(data.enterprise_id);
    return {
      accessToken,
      refreshToken: optionalString(data.refreshToken) ?? "",
      expiresAtMs:
        typeof data.expiresIn === "number" && data.expiresIn > 0 ? Date.now() + data.expiresIn * 1000 : 0,
      uid,
      domain: optionalString(data.domain) ?? "www.workbuddy.cn",
      nickname: optionalString(data.nickname),
      ...(enterpriseId ? { enterpriseId } : {}),
    };
  }
  throw new Error("WorkBuddy login timed out");
}

// ---------------------------------------------------------------------------
// model table — live catalogue over the bundled table; a discovery failure
// never invalidates a credential and never throws into the provider path
// ---------------------------------------------------------------------------

function normalizeCredits(credits) {
  if (typeof credits !== "string") return undefined;
  const trimmed = credits.trim().replace(/\s+credits$/i, "");
  return trimmed === "" ? undefined : trimmed;
}

function parseEfforts(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => DEFAULT_EFFORTS.includes(item));
}

function parseProductModel(row) {
  const record = asRecord(row);
  if (!record) return undefined;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) return undefined;
  const contextWindow = positiveInt(record.maxInputTokens) ?? 0;
  const maxTokens = positiveInt(record.maxOutputTokens) ?? 0;
  if (contextWindow <= 0 || maxTokens <= 0) return undefined;
  const reasoning = record.supportsReasoning === true;
  const advertised = reasoning ? parseEfforts(record.reasoning?.supportedEfforts) : [];
  const credits = normalizeCredits(record.credits);
  return {
    id,
    name: typeof record.name === "string" && record.name !== "" ? record.name : id,
    reasoning,
    // An absent ladder means unknown, not "all levels": the bundled table's
    // ladder is the more accurate guess and is restored by applyCatalogue.
    efforts: reasoning && advertised.length === 0 ? [...DEFAULT_EFFORTS] : advertised,
    input:
      record.supportsImages === true && record.disabledMultimodal !== true
        ? ["text", "image"]
        : ["text"],
    contextWindow,
    maxTokens,
    ...(credits ? { credits } : {}),
  };
}

function modelAdvertisesEfforts(row) {
  return parseEfforts(row?.reasoning?.supportedEfforts).length > 0;
}

let liveRows = null;
let liveFetchedAtMs = 0;
let liveFailedAtMs = 0;

function modelTable() {
  return liveRows ?? BUNDLED_MODELS;
}

function getModelDefinition(modelID) {
  return modelTable().find((model) => model.id === modelID);
}

/**
 * Adopt a live catalogue. Ids, numbers and credits are authoritative; where
 * upstream stayed quiet about the effort ladder the bundled table's ladder is
 * kept. Hidden bundled models survive a live list that omits them.
 */
function applyCatalogue(rows) {
  const bundledById = new Map(BUNDLED_MODELS.map((model) => [model.id, model]));
  const table = rows
    .map((row) => {
      const previous = bundledById.get(row.model.id);
      if (!previous || row.effortsAdvertised || previous.efforts.length === 0) return row.model;
      return { ...row.model, efforts: previous.efforts };
    })
    .filter((model) => model.contextWindow > 0 && model.maxTokens > 0);
  const liveIds = new Set(table.map((model) => model.id));
  for (const bundled of bundledById.values()) {
    if (bundled.hidden && !liveIds.has(bundled.id)) table.push(bundled);
  }
  if (rows.length < CATALOGUE_MIN_PLAUSIBLE) {
    // Transport noise, not a product decision: keep what is already installed.
    return liveRows ?? BUNDLED_MODELS;
  }
  liveRows = table;
  liveFetchedAtMs = Date.now();
  return table;
}

function parseCataloguePayload(payload) {
  const document = asRecord(payload);
  const data = asRecord(document?.data) ?? document ?? {};
  const models = Array.isArray(data.models) ? data.models : [];
  const rows = [];
  for (const entry of models) {
    const parsed = parseProductModel(entry);
    if (!parsed) continue;
    rows.push({ model: parsed, effortsAdvertised: modelAdvertisesEfforts(entry) });
  }
  return rows;
}

async function refreshCatalogue(credential) {
  if (envBool("WORKBUDDY_DISABLE_MODEL_DISCOVERY")) return modelTable();
  const fresh = liveFetchedAtMs > 0 && Date.now() - liveFetchedAtMs < CATALOGUE_TTL_MS;
  const coolingDown = liveFailedAtMs > 0 && Date.now() - liveFailedAtMs < CATALOGUE_ERROR_TTL_MS;
  if (fresh || coolingDown) return modelTable();
  const base = baseUrlFor(credential);
  const failures = [];
  for (const cataloguePath of CATALOGUE_PATHS) {
    try {
      const response = await fetch(base + cataloguePath, {
        method: "GET",
        headers: chatHeaders(credential, base),
        signal: AbortSignal.timeout(CATALOGUE_TIMEOUT_MS),
      });
      const payload = asRecord(await response.json().catch(() => undefined));
      if (!response.ok) {
        failures.push(cataloguePath + ": HTTP " + response.status);
        continue;
      }
      if (typeof payload?.code === "number" && payload.code !== 0) {
        failures.push(cataloguePath + ": code=" + payload.code);
        continue;
      }
      const rows = parseCataloguePayload(payload);
      if (rows.length === 0) {
        failures.push(cataloguePath + ": no usable models");
        continue;
      }
      return applyCatalogue(rows);
    } catch (error) {
      failures.push(cataloguePath + ": " + errorMessage(error));
    }
  }
  liveFailedAtMs = Date.now();
  warn("model discovery skipped (" + failures.join("; ") + ") — serving the bundled table");
  return modelTable();
}

// ---------------------------------------------------------------------------
// wire format — OpenAI-compatible messages over a forced-streaming endpoint
// ---------------------------------------------------------------------------

function imagePartUrl(part) {
  if (part.data instanceof URL) return part.data.toString();
  if (typeof part.data === "string") {
    if (/^(https?:|data:)/i.test(part.data)) return part.data;
    return "data:" + part.mediaType + ";base64," + part.data;
  }
  return "data:" + part.mediaType + ";base64," + Buffer.from(part.data).toString("base64");
}

function toolResultText(output) {
  switch (output?.type) {
    case "text":
    case "error-text":
      return output.value;
    case "json":
    case "error-json":
      return JSON.stringify(output.value);
    case "execution-denied":
      return output.reason ? "Execution denied: " + output.reason : "Execution denied";
    case "content":
      return output.value
        .map((part) => {
          if (part.type === "text") return part.text;
          if (part.type === "file-url" || part.type === "image-url") return part.url;
          if (part.type === "file-id" || part.type === "image-file-id")
            return typeof part.fileId === "string" ? part.fileId : JSON.stringify(part.fileId);
          return "mediaType" in part ? "[" + part.mediaType + "]" : "[" + part.type + "]";
        })
        .join("\n");
    default:
      return "";
  }
}

function normalizeContent(content) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? content : [];
}

function transformPrompt(prompt) {
  const messages = [];
  for (const message of prompt) {
    if (message.role === "system") {
      messages.push({ role: "system", content: message.content });
      continue;
    }
    if (message.role === "user") {
      const parts = [];
      let hasImage = false;
      for (const part of normalizeContent(message.content)) {
        if (part.type === "text") {
          parts.push({ type: "text", text: String(part.text ?? "") });
          continue;
        }
        if (part.type === "file" && String(part.mediaType ?? "").startsWith("image/")) {
          hasImage = true;
          parts.push({ type: "image_url", image_url: { url: imagePartUrl(part) } });
        }
      }
      if (!hasImage) {
        messages.push({ role: "user", content: parts.map((part) => (part.type === "text" ? part.text : "")).join("") });
      } else {
        messages.push({ role: "user", content: parts });
      }
      continue;
    }
    if (message.role === "assistant") {
      let content = "";
      const toolCalls = [];
      for (const part of normalizeContent(message.content)) {
        // Replayed reasoning is dropped: the endpoint rejects assistant turns
        // carrying reasoning fields.
        if (part.type === "text") content += String(part.text ?? "");
        if (part.type === "tool-call") {
          toolCalls.push({
            id: part.toolCallId,
            type: "function",
            function: {
              name: part.toolName,
              arguments: typeof part.input === "string" ? part.input : JSON.stringify(part.input),
            },
          });
        }
      }
      // Content stays a string (possibly empty), never null: a null content on
      // an assistant tool-call turn breaks the upstream's tool_call_id matching.
      const entry = { role: "assistant", content };
      if (toolCalls.length > 0) entry.tool_calls = toolCalls;
      messages.push(entry);
      continue;
    }
    if (message.role === "tool") {
      for (const part of normalizeContent(message.content)) {
        if (part.type !== "tool-result") continue;
        messages.push({
          role: "tool",
          tool_call_id: part.toolCallId,
          content: toolResultText(part.output),
        });
      }
    }
  }
  if (messages.length > 0 && messages[0].role !== "system") {
    messages.unshift({ role: "system", content: "You are a helpful assistant." });
  }
  return messages;
}

function transformTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return { tools: [], ignored: 0 };
  const result = [];
  let ignored = 0;
  for (const tool of tools) {
    if (tool.type !== "function") {
      ignored += 1;
      continue;
    }
    result.push({
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
    });
  }
  return { tools: result, ignored };
}

function resolveReasoningEffort(options, model) {
  const supported = model?.efforts ?? [];
  if (supported.length === 0) return undefined;
  const envEffort = (env("WORKBUDDY_REASONING_EFFORT") ?? "").toLowerCase();
  const picked = (envEffort || String(options?.reasoningEffort ?? options?.reasoning_effort ?? ""))
    .trim()
    .toLowerCase();
  if (!picked) return undefined;
  return supported.includes(picked) ? picked : undefined;
}

function buildRequestBody(modelID, options) {
  const model = getModelDefinition(modelID);
  const messages = transformPrompt(options.prompt);
  const { tools, ignored } = transformTools(options.tools);
  const warnings = [];
  if (ignored > 0) warnings.push({ type: "unsupported", feature: "provider-defined tools" });
  if (options.stopSequences?.length) warnings.push({ type: "unsupported", feature: "stop sequences" });
  if (options.responseFormat?.type === "json")
    warnings.push({ type: "unsupported", feature: "JSON response format" });

  let maxTokens = model?.maxTokens ?? 32000;
  if (typeof options.maxOutputTokens === "number" && options.maxOutputTokens < maxTokens) {
    maxTokens = options.maxOutputTokens;
  }
  if (FLASH_LOOP_IDS.has(modelID)) maxTokens = Math.min(maxTokens, FLASH_MAX_TOKENS);

  const body = {
    model: modelID,
    messages,
    // The gateway answers 400 on stream:false; every request streams and a
    // non-streaming caller is served from the aggregated SSE below.
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: maxTokens,
  };
  if (typeof options.temperature === "number") body.temperature = options.temperature;
  if (typeof options.topP === "number") body.top_p = options.topP;
  if (tools.length > 0) body.tools = tools;
  const effort = resolveReasoningEffort(options, model);
  if (effort) body.reasoning_effort = effort;
  return { body, warnings };
}

function mapFinishReason(raw, hasToolCalls) {
  if (hasToolCalls || raw === "tool_calls" || raw === "function_call")
    return { unified: "tool-calls", raw };
  if (raw === "length") return { unified: "length", raw };
  if (raw === "content_filter") return { unified: "content-filter", raw };
  if (!raw || raw === "stop") return { unified: "stop", raw };
  return { unified: "other", raw };
}

function usageFrom(raw) {
  const promptTokens = raw?.prompt_tokens;
  const cachedTokens = raw?.prompt_tokens_details?.cached_tokens;
  return {
    inputTokens: {
      total: promptTokens,
      noCache:
        promptTokens !== undefined && cachedTokens !== undefined
          ? promptTokens - cachedTokens
          : undefined,
      cacheRead: cachedTokens,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: raw?.completion_tokens,
      text: undefined,
      reasoning: raw?.completion_tokens_details?.reasoning_tokens,
    },
    raw,
  };
}

class StreamEmitter {
  constructor(controller) {
    this.controller = controller;
    this.textID = undefined;
    this.reasoningID = undefined;
    this.textIndex = 0;
  }

  text(delta) {
    if (!delta) return;
    this.endReasoning();
    if (!this.textID) {
      this.textID = "txt-" + this.textIndex++;
      this.controller.enqueue({ type: "text-start", id: this.textID });
    }
    this.controller.enqueue({ type: "text-delta", id: this.textID, delta });
  }

  endText() {
    if (!this.textID) return;
    this.controller.enqueue({ type: "text-end", id: this.textID });
    this.textID = undefined;
  }

  reasoning(delta) {
    if (!delta) return;
    if (!this.reasoningID) {
      this.endText();
      this.reasoningID = "reasoning-0";
      this.controller.enqueue({ type: "reasoning-start", id: this.reasoningID });
    }
    this.controller.enqueue({ type: "reasoning-delta", id: this.reasoningID, delta });
  }

  endReasoning() {
    if (!this.reasoningID) return;
    this.controller.enqueue({ type: "reasoning-end", id: this.reasoningID });
    this.reasoningID = undefined;
  }

  closeOpenBlocks() {
    this.endReasoning();
    this.endText();
  }
}

function chatError(status, url, body, signedIn) {
  let message = "WorkBuddy API error " + status;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.error?.message || parsed?.msg || parsed?.message;
    if (detail) message = "WorkBuddy API error " + status + ": " + detail;
  } catch {
    // non-JSON error body
  }
  if ((status === 401 || status === 403) && !signedIn) {
    message += " — the credential was rejected. Sign in again from Settings > Providers > " + PROVIDER_NAME + ".";
  }
  const error = new Error(message);
  error.name = "WorkBuddyAPIError";
  error.statusCode = status;
  error.url = url;
  error.isRetryable = status === 429 || status >= 500;
  return error;
}

class WorkBuddyLanguageModel {
  specificationVersion = "v3";
  supportedUrls = { "image/*": [/^data:/, /^https?:/] };

  get provider() {
    return PROVIDER_ID;
  }

  constructor(modelId, runtime) {
    this.modelId = modelId;
    this.runtime = runtime;
  }

  async doGenerate(options) {
    const result = await this.doStream(options);
    const content = [];
    const textByID = new Map();
    const reasoningByID = new Map();
    let finishReason = { unified: "stop", raw: undefined };
    let usage = usageFrom(undefined);
    const warnings = [];
    for await (const part of result.stream) {
      if (part.type === "stream-start") warnings.push(...part.warnings);
      if (part.type === "text-start") {
        const block = { type: "text", text: "" };
        textByID.set(part.id, block);
        content.push(block);
      }
      if (part.type === "text-delta") {
        const block = textByID.get(part.id);
        if (block) block.text += part.delta;
      }
      if (part.type === "reasoning-start") {
        const block = { type: "reasoning", text: "" };
        reasoningByID.set(part.id, block);
        content.push(block);
      }
      if (part.type === "reasoning-delta") {
        const block = reasoningByID.get(part.id);
        if (block) block.text += part.delta;
      }
      if (part.type === "tool-call") {
        content.push({
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          input: part.input,
        });
      }
      if (part.type === "finish") {
        finishReason = part.finishReason;
        usage = part.usage;
      }
      if (part.type === "error") {
        throw part.error instanceof Error ? part.error : new Error(String(part.error));
      }
    }
    return { content, finishReason, usage, warnings, request: result.request, response: result.response };
  }

  async doStream(options) {
    const abortController = new AbortController();
    const signal = options.abortSignal;
    const abort = () => abortController.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const detachAbort = () => signal?.removeEventListener("abort", abort);

    const credential = await this.runtime.resolveCredential();
    if (!credential) {
      detachAbort();
      throw new Error(
        "WorkBuddy (CN) is not signed in. Sign in from Settings > Providers > " +
          PROVIDER_NAME +
          " (Browser Login), or set WORKBUDDY_CN_TOKEN.",
      );
    }
    const { body, warnings } = buildRequestBody(this.modelId, options);
    let opened;
    try {
      opened = await this.openRequest(credential, body, abortController);
    } catch (error) {
      detachAbort();
      throw error;
    }
    if (!opened.response.ok) {
      detachAbort();
      const status = opened.response.status;
      const text = await opened.response.text().catch(() => "");
      // One renewal on a rejection a fresh token can cure, then replay once.
      if (status === 401 || status === 403) {
        const renewed = await this.runtime.resolveCredential({ forceRefreshOf: credential }).catch(() => undefined);
        if (renewed) {
          try {
            const retry = await this.openRequest(renewed, body, abortController);
            if (retry.response.ok) return this.streamOf(retry.response, body, warnings, detachAbort);
            detachAbort();
            throw chatError(
              retry.response.status,
              retry.url,
              await retry.response.text().catch(() => ""),
              false,
            );
          } catch (retryError) {
            detachAbort();
            throw retryError;
          }
        }
      }
      throw chatError(status, opened.url, text, false);
    }
    return this.streamOf(opened.response, body, warnings, detachAbort);
  }

  async openRequest(credential, body, abortController) {
    const base = baseUrlFor(credential);
    const url = base + CHAT_PATH;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...chatHeaders(credential, base),
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });
    return { response, url };
  }

  streamOf(response, body, warnings, detachAbort) {
    return {
      stream: this.responseToStream(response, warnings, detachAbort),
      request: { body },
      response: { headers: Object.fromEntries(response.headers.entries()) },
    };
  }

  responseToStream(response, warnings, detachAbort) {
    const modelID = this.modelId;
    return new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: "stream-start", warnings });
        const reader = response.body?.getReader();
        if (!reader) {
          detachAbort();
          controller.enqueue({ type: "error", error: new Error("WorkBuddy response body is empty") });
          controller.close();
          return;
        }
        const decoder = new TextDecoder();
        const emitter = new StreamEmitter(controller);
        const toolCalls = [];
        let buffer = "";
        let rawFinishReason;
        let rawUsage;
        let sawToolCall = false;
        let done = false;

        const startToolCall = (state) => {
          if (!state.id) state.id = randomUUID();
          if (!state.started) {
            state.started = true;
            controller.enqueue({ type: "tool-input-start", id: state.id, toolName: state.name });
            for (const pending of state.pendingDeltas) {
              controller.enqueue({ type: "tool-input-delta", id: state.id, delta: pending });
            }
            state.pendingDeltas = [];
          }
          return state.id;
        };

        const finishToolCall = (state) => {
          if (state.finished || !state.name) return;
          state.finished = true;
          const id = startToolCall(state);
          controller.enqueue({ type: "tool-input-end", id });
          controller.enqueue({ type: "tool-call", toolCallId: id, toolName: state.name, input: state.arguments });
          sawToolCall = true;
        };

        const handleChunk = (chunk) => {
          if (chunk.id || chunk.model || chunk.created) {
            controller.enqueue({
              type: "response-metadata",
              id: chunk.id,
              modelId: chunk.model || modelID,
              timestamp: chunk.created ? new Date(chunk.created * 1000) : undefined,
            });
          }
          if (chunk.usage) rawUsage = chunk.usage;
          const choice = chunk.choices?.[0];
          if (!choice) return;
          // finish_reason can ride a chunk whose delta is a stub.
          if (choice.finish_reason) rawFinishReason = choice.finish_reason;
          const delta = choice.delta;
          if (!delta) return;
          if (delta.reasoning_content) emitter.reasoning(delta.reasoning_content);
          if (delta.content) emitter.text(delta.content);
          // The gateway stamps EVERY delta with an empty tool_calls array, and
          // [] is truthy: reacting to it alone closes the open text block on
          // every token. Only a chunk with real tool-call signal counts.
          const tcDeltas = delta.tool_calls?.filter((tc) => tc.id || tc.function?.name || tc.function?.arguments);
          if (tcDeltas?.length) {
            emitter.endReasoning();
            emitter.endText();
            for (const tc of tcDeltas) {
              const index = tc.index ?? 0;
              let state = toolCalls[index];
              if (!state) {
                state = { id: undefined, upstreamID: false, name: "", arguments: "", started: false, finished: false, pendingDeltas: [] };
                toolCalls[index] = state;
              }
              if (tc.id) {
                state.id = tc.id;
                state.upstreamID = true;
              }
              if (tc.function?.name) state.name = tc.function.name;
              if (!state.started && state.name && state.upstreamID) startToolCall(state);
              const argumentDelta = tc.function?.arguments || "";
              if (argumentDelta) {
                state.arguments += argumentDelta;
                if (state.started && state.id) {
                  controller.enqueue({ type: "tool-input-delta", id: state.id, delta: argumentDelta });
                } else {
                  state.pendingDeltas.push(argumentDelta);
                }
              }
              if (state.started && isParsableJson(state.arguments)) finishToolCall(state);
            }
          }
        };

        try {
          while (!done) {
            const read = await reader.read();
            if (read.done) break;
            buffer += decoder.decode(read.value, { stream: true });
            for (;;) {
              const newline = buffer.indexOf("\n");
              if (newline === -1) break;
              const line = buffer.slice(0, newline).trim();
              buffer = buffer.slice(newline + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "") continue;
              if (payload === "[DONE]") {
                done = true;
                break;
              }
              // A malformed line is dropped, not fatal: proxies truncate.
              try {
                handleChunk(JSON.parse(payload));
              } catch (error) {
                if (!(error instanceof SyntaxError)) throw error;
              }
            }
            if (done) break;
          }
          emitter.closeOpenBlocks();
          for (const state of toolCalls) finishToolCall(state);
          controller.enqueue({
            type: "finish",
            finishReason: mapFinishReason(rawFinishReason, sawToolCall),
            usage: usageFrom(rawUsage),
            providerMetadata: { workbuddy: {} },
          });
          controller.close();
        } catch (error) {
          controller.enqueue({
            type: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "error", raw: undefined },
            usage: usageFrom(rawUsage),
            providerMetadata: { workbuddy: {} },
          });
          controller.close();
        } finally {
          detachAbort();
          await reader.cancel().catch(() => {});
        }
      },
    });
  }
}

function isParsableJson(input) {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// plugin setup — integration, provider catalog, language handler, reloads
// ---------------------------------------------------------------------------

function displayName(model) {
  const parts = [];
  if (model.credits) parts.push(model.credits);
  parts.push(model.contextWindow >= 1000000 ? "1M" : Math.round(model.contextWindow / 1000) + "K");
  return model.name + " (" + parts.join(", ") + ")";
}

function toModelInfo(model) {
  return {
    id: model.id,
    modelID: model.id,
    providerID: PROVIDER_ID,
    name: displayName(model),
    capabilities: { tools: true, input: [...model.input], output: ["text"] },
    variants: model.efforts.map((effort) => ({
      id: effort,
      headers: {},
      body: { reasoningEffort: effort },
    })),
    time: { released: 0 },
    cost: [],
    status: "active",
    enabled: true,
    limit: { context: model.contextWindow, input: model.contextWindow, output: model.maxTokens },
  };
}

async function setup(ctx) {
  const state = { models: null };
  let loadChain = Promise.resolve();
  let disposed = false;

  const serialized = (task) => {
    const run = loadChain.then(task, task);
    loadChain = run.catch(() => {});
    return run;
  };

  const activeConnection = async () => {
    const connection = await ctx.integration.connection.active(INTEGRATION_ID).catch(() => undefined);
    if (!connection) return undefined;
    const value = await ctx.integration.connection.resolve(connection).catch(() => undefined);
    return value ? { value } : undefined;
  };

  const resolve = (options = {}) => {
    if (options.forceRefreshOf) {
      // A request-path rejection: refresh this credential once regardless of
      // the freshness window, then keep serving the renewal.
      return refreshCredential(options.forceRefreshOf)
        .then((next) => {
          if (options.forceRefreshOf.origin === "store") saveOwnStore(next);
          return adoptRenewal(options.forceRefreshOf.accessToken, next);
        })
        .catch((error) => {
          warn("renewal failed (" + errorMessage(error) + ")");
          return undefined;
        });
    }
    return resolveCredential(activeConnection);
  };

  const load = () =>
    serialized(async () => {
      const credential = await resolveCredential(activeConnection).catch(() => undefined);
      if (!credential) {
        state.models = null;
        return;
      }
      state.models = await refreshCatalogue(credential).catch(() => modelTable());
    });

  const reloadProvider = async () => {
    await load();
    await ctx.provider.reload().catch((error) => warn("provider reload failed: " + errorMessage(error)));
  };

  await ctx.integration.transform((editor) => {
    editor.update(INTEGRATION_ID, (integration) => {
      integration.name = PROVIDER_NAME;
    });
    editor.method.update({
      integrationID: INTEGRATION_ID,
      method: {
        type: "key",
        label: PROVIDER_NAME + " Access Token (token|uid|base optional)",
      },
    });
    editor.method.update({
      integrationID: INTEGRATION_ID,
      method: {
        id: METHOD_OAUTH,
        type: "oauth",
        label: "Browser Login (" + PROVIDER_NAME + ")",
      },
      authorize: async () => {
        const login = await startLogin();
        return {
          mode: "auto",
          url: login.authUrl,
          instructions: "Complete the " + PROVIDER_NAME + " login in the browser, then return to OpenChamber.",
          callback: (async () => {
            const credential = await pollLogin(login.state);
            // Written for CLI interop and migration, never read back before
            // the OpenCode-owned connection: resolution prefers the connection.
            saveOwnStore(credential);
            await reloadProvider();
            return {
              type: "oauth",
              methodID: METHOD_OAUTH,
              refresh: credential.refreshToken,
              access: credential.accessToken,
              expires: credential.expiresAtMs,
              metadata: {
                userID: credential.uid,
                nickname: credential.nickname ?? "",
                baseUrl: credential.domain ? "https://" + credential.domain : LOGIN_BASE,
                ...(credential.enterpriseId ? { enterpriseId: credential.enterpriseId } : {}),
              },
            };
          })(),
        };
      },
      refresh: async (credential) => {
        const domain = asRecord(credential.metadata)?.baseUrl;
        const renewed = await refreshCredential({
          accessToken: credential.access,
          refreshToken: credential.refresh,
          expiresAtMs: typeof credential.expires === "number" ? credential.expires : 0,
          uid: optionalString(asRecord(credential.metadata)?.userID) ?? "",
          domain: typeof domain === "string" ? domain.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "",
        });
        return {
          type: "oauth",
          methodID: METHOD_OAUTH,
          refresh: renewed.refreshToken,
          access: renewed.accessToken,
          expires: renewed.expiresAtMs,
          metadata: credential.metadata,
        };
      },
    });
  });

  await ctx.provider.transform((providers) => {
    const models = (state.models ?? []).map(toModelInfo);
    const existing = providers.get(PROVIDER_ID);
    const info = existing
      ? existing.provider
      : {
          id: PROVIDER_ID,
          name: PROVIDER_NAME,
          integrationID: INTEGRATION_ID,
          activation: "auto",
          package: import.meta.url,
        };
    providers.add({ info, models });
  });

  await ctx.aisdk.hook("language", async (event) => {
    if (event.model.providerID !== PROVIDER_ID) return;
    const credential = await resolve({}).catch((error) => {
      warn("credential resolution failed (" + errorMessage(error) + ")");
      return undefined;
    });
    if (!credential) {
      throw new Error(
        "WorkBuddy (CN) is not signed in. Sign in from Settings > Providers > " +
          PROVIDER_NAME +
          " (Browser Login), or set WORKBUDDY_CN_TOKEN.",
      );
    }
    event.language = new WorkBuddyLanguageModel(String(event.model.modelID ?? event.model.id), {
      resolveCredential: resolve,
    });
  });

  // A login, a removal or a switch on this integration changes what the
  // provider can offer; any credential event is cheap to reload for.
  void (async () => {
    try {
      for await (const event of ctx.event.subscribe()) {
        if (disposed) break;
        const type = event?.type ?? "";
        if (type === "credential.updated" || type === "credential.switched") {
          await reloadProvider().catch(() => {});
        }
      }
    } catch {
      // the event stream ended — reloads now only happen on login callbacks
    }
  })();

  await reloadProvider();

  return async () => {
    disposed = true;
  };
}

// The AI-SDK factory opencode resolves from this module's first "create*" export
// when the provider's package points here. It has no plugin context, so it
// resolves credentials from the store chain only; the plugin's language hook
// (which knows the OpenCode connection) builds its own instances instead.
export function createWorkBuddy() {
  return {
    languageModel(modelId) {
      return new WorkBuddyLanguageModel(modelId, {
        resolveCredential: (hint) => {
          if (hint && hint.forceRefreshOf) {
            const source = hint.forceRefreshOf;
            return refreshCredential(source)
              .then((next) => {
                if (source.origin === "store") saveOwnStore(next);
                return adoptRenewal(source.accessToken, next);
              })
              .catch(() => undefined);
          }
          return resolveStoredCredential();
        },
      });
    },
  };
}

export default {
  id: PLUGIN_ID,
  setup,
};
`;

/**
 * The full plugin source. Interpolation is intentional and limited to the
 * bundled model table; everything else is literal.
 */
export const createWorkBuddyPluginSource = () => pluginSource;
