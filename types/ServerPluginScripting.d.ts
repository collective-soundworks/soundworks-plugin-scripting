/** @private */
export const kScriptInfosByName: unique symbol;
/** @private */
export const kInternalState: unique symbol;
/**
 * Server-side representation of the soundworks' scripting plugin.
 *
 * The constructor should never be called manually. The plugin will be
 * instantiated by soundworks when registered in the `pluginManager`
 *
 * Available options:
 * - `dirname` {String} - directory in which the script files are located
 *
 * If no option is given, for example before a user selects a project, the plugin
 * will stay idle until `switch` is called.
 *
 * [documentation](https://soundworks.dev/plugins/scripting.html)
 *
 * @example
 * server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
 *
 * @extends {ServerPlugin}
 *
 */
export default class ServerPluginScripting {
    /** @hideconstructor */
    constructor(server: any, id: any, options: any);
    /**
     * @type {object}
     * @property {string|null} [dirname=null] - Path to the directory in which the script are located
     * @property {boolean} [verbose=false]
     */
    options: object;
    /** @private */
    private start;
    /** @private */
    private stop;
    /**
     * Instance of the underlying filesystem plugin.
     */
    get filesystem(): any;
    /**
     * Returns the list of all available scripts.
     * @returns {Array}
     */
    getList(): any[];
    /**
     * Return the SharedStateCollection of all the scripts underlying share states.
     * Provided for build and error monitoring purposes.
     * If you want a full featured Script instance, see `attach` instead.
     * @return {Promise<SharedStateCollection>}
     */
    getCollection(): Promise<SharedStateCollection>;
    /**
     * Registers a global context object to be used in scripts. Note that the
     * context is store globally, so several scripting plugins running in parallel
     * will share the same underlying object. The global `getGlobalScriptingContext`
     * function will allow to retrieve the given object from within scripts.
     * @param {Object} ctx - Object to store in global context
     */
    setGlobalScriptingContext(ctx: any): void;
    /**
     * Register callback to execute when a script is created or deleted.
     * @param {Function} callback - Callback function to execute
     * @param {boolean} [executeListener=false] - If true, execute the given
     *  callback immediately.
     * @return {Function} Function that unregister the listener when executed.
     */
    onUpdate(callback: Function, executeListener?: boolean): Function;
    /**
     * Switch the plugin to watch and use another directory
     * @param {String|Object} dirname - Path to the new directory. As a convenience
     *  to match the plugin filesystem API, an object containing the 'dirname' key
     *  can also be passed
     */
    switch(dirname: string | any): Promise<void>;
    /**
     * Attach to a script.
     * @param {string} name - Name of the script
     * @return {Promise<SharedScript>} Promise that resolves on a new Script instance.
     */
    attach(name: string): Promise<SharedScript>;
    /** @private */
    private [kScriptInfosByName];
    /** @private */
    private [kInternalState];
    #private;
}
import SharedScript from './SharedScript.js';
//# sourceMappingURL=ServerPluginScripting.d.ts.map