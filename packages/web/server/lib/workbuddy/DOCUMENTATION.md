# WorkBuddy provider plugin

## Ownership

This module owns the WorkBuddy CN (www.workbuddy.cn) model-provider integration
for OpenChamber's managed OpenCode: the generated plugin source
(`plugin-source.js`) and its materialization into the OpenChamber data
directory (`runtime.js`). It owns nothing else — no credential store of its
own, no routes, no UI.

The plugin, once loaded by OpenCode, registers the `workbuddy-cn` integration
(paste-token and browser-login methods), resolves credentials, discovers the
live model catalogue and serves chat. OpenChamber's existing Providers settings
page drives sign-in through OpenCode's integration OAuth flow; the model picker
lists the models through the normal catalog events. No OpenChamber-side code
runs on the chat path.

## Invariants

- The generated plugin is a **single file with no imports beyond `node:*`**:
  OpenCode loads the entrypoint with a bare dynamic import and nothing resolves
  from the generated directory.
- **No network without a credential.** Resolution order: OpenCode's stored
  connection → the shared own-store file
  (`$XDG_CONFIG_HOME/opencode/workbuddy-cn-auth.json`) → `WORKBUDDY_CN_TOKEN`
  → the desktop auth file (plaintext builds only). Without one, setup
  registers an empty provider and the language hook fails with sign-in
  guidance; no discovery request is fired.
- **The own-store file schema and location match the standalone WorkBuddy
  adapters** (`{ version: 1, credential: … }`). An existing login from those
  adapters works here unchanged, and a login made here works there.
- **A credential whose domain is not `*.workbuddy.cn` never signs CN
  requests.** Current desktop builds encrypt tokens as `$wbEncrypted`
  envelopes; the parser skips them, so an encrypted desktop file can never be
  sent by mistake.
- Enterprise mode never materializes the plugin (`createManagedConfigRuntime`
  checks `isEnterpriseMode()`): under it, a model provider may only come from
  OpenCode's own config.
- The plugin never logs or returns a token value; only warnings reach stderr.
- Discovery is an optimization, never a dependency: every failure falls back to
  the bundled CN table and never invalidates a credential or throws into the
  provider path.

## Decisions

### Why a generated plugin and not a static directory in the repo

The plugin must exist as a self-contained directory under the OpenChamber data
dir for OpenCode to load (`package.json` + `index.js`, bare import). A template
in `plugin-source.js` keeps that generated artifact in the import graph — lint,
`node --check` in tests, knip — where a source tree copied as text files would
be invisible to all three. Precedent: `../agent-tool/runtime.js` generates its
plugin the same way.

### Why the credential lives in the opencode config dir, not OpenChamber's data dir

OpenCode 2.x owns provider credentials; the plugin reads them from OpenCode's
own store when signed in through the app. The own-store file exists for
migration and CLI interop with the standalone adapters, and both live under
`~/.config/opencode/` — one login serves the CLI, opencode TUI and
OpenChamber. An OpenChamber-private store would fork the account.

### Why the browser login is the primary path, not the desktop auth file

The desktop's auth file carries `$wbEncrypted` envelopes on current builds, so
plaintext reading works only on older installs. The `/v2/plugin/auth/state` +
token-poll protocol (verified live 2026-10) yields a plaintext JWT and a
refresh token; the desktop file stays wired as a fallback for older builds.

### Why the plugin registers an empty provider before login

The Providers page shows the sign-in card from the integration registry either
way; registering the provider keeps the card, the picker and the catalog
consistent (`/api/provider` is the only view of plugin providers). No models
are registered until a credential exists, so nothing unselectable appears in
the picker.

### Why models are not pinned as the default

A first-party provider appearing after login must not take over sessions the
user already pointed somewhere else. Variant bodies (`reasoningEffort`) ride
the model definitions; the default model stays the user's choice.
