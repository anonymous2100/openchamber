import { WORKBUDDY_PLUGIN_DIRECTORY_NAME, WORKBUDDY_PLUGIN_PACKAGE_JSON, createWorkBuddyPluginSource } from './plugin-source.js';

const PLUGIN_ID = 'openchamber-workbuddy-cn';
const PLUGIN_ENTRYPOINT = 'index.js';

/**
 * Materializes the WorkBuddy CN provider plugin for the managed OpenCode.
 *
 * The plugin is written whole, on every call, into
 * `<dataDir>/workbuddy-plugin/workbuddy-cn/` and named in the managed config
 * (`opencode.managed.json`), which OpenCode watches — so a regenerated plugin
 * hot-reloads in the running process. Writing whole (not diffing) keeps the
 * directory always consistent with the template this build shipped; OpenCode
 * reacts to the write by reloading the plugin it already has configured.
 *
 * Enterprise mode never reaches this module: `createManagedConfigRuntime`
 * skips it there, because adding a model provider is exactly the crossing
 * enterprise mode holds at OpenCode's own config.
 */
export const createWorkBuddyRuntime = ({ fsPromises, path, dataDir }) => {
  const pluginRoot = path.join(dataDir, 'workbuddy-plugin');
  const pluginDirectory = path.join(pluginRoot, WORKBUDDY_PLUGIN_DIRECTORY_NAME);
  const pluginManifestPath = path.join(pluginDirectory, 'package.json');
  const pluginPath = path.join(pluginDirectory, PLUGIN_ENTRYPOINT);

  /**
   * Write the plugin and return its directory, ready to be listed in the
   * managed config's `plugins` array.
   */
  const materializePlugin = async () => {
    await fsPromises.mkdir(pluginDirectory, { recursive: true });
    // Temp + rename on both files: OpenCode reloads the entrypoint on change,
    // and a partial read would surface as a broken plugin until the next write.
    await writeAtomic(pluginManifestPath, WORKBUDDY_PLUGIN_PACKAGE_JSON);
    await writeAtomic(pluginPath, createWorkBuddyPluginSource());
    return pluginDirectory;
  };

  const writeAtomic = async (file, text) => {
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
    try {
      await fsPromises.writeFile(temporary, text, { encoding: 'utf8', mode: 0o600 });
      await fsPromises.rename(temporary, file);
    } catch (error) {
      await fsPromises.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  };

  return { pluginId: PLUGIN_ID, pluginDirectory, materializePlugin };
};
