/**
 * Client-side representation of the soundworks' scripting plugin.
 *
 * The constructor should never be called manually. The plugin will be
 * instantiated automatically when registered in the `pluginManager`
 *
 * @extends {ClientPlugin}
 * @example
 * client.pluginManager.register('scripting', ClientPluginScripting, { dirname });
 */
export default class ClientPluginScripting {
    /** @private */
    private constructor();
    options: {};
    /** @private */
    private start;
    /** @private */
    private stop;
    /**
     * Instance of the underlying filesystem plugin
     */
    get filesystem(): any;
    /**
     * Returns the list of all available scripts.
     * @returns {Array}
     */
    getList(): any[];
    /**
     * Return the SharedStateCollection of all the scripts underlying share states.
     * Provided for build and error monitoring purposes. Can also be used to maintain
     * a list of existing script, e.g. in a drop-down menu
     *
     * If you want a full featured / executable Script instance, use the `attach` instead.
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
     * Attach to a script.
     * @param {string} name - Name of the script
     * @return {Promise<SharedScript>} Promise that resolves on a new Script instance.
     */
    attach(name: string): Promise<SharedScript>;
    #private;
}
import SharedScript from './SharedScript.js';
//# sourceMappingURL=ClientPluginScripting.d.ts.map