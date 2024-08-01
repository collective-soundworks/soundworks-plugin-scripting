/** @private */
export const kGetNodeBuild: unique symbol;
/** @private */
export const kGetBrowserBuild: unique symbol;
/** @private */
export const kGetNodeBuildURL: unique symbol;
/** @private */
export const kGetBrowserBuildURL: unique symbol;
export default SharedScript;
/**
 * A SharedScript can be distributed amongst different clients and modified
 * at runtime. The script source is stored directly in the filestem, see
 * `dirname` option of the server-side plugin.
 *
 * A Shared script cannot be instatiated manually, it is retrieved by calling
 * the client's or  server `PluginScripting.attach` method.
 */
declare class SharedScript {
    constructor(scriptState: any);
    /**
     * Name of the script (i.e. sanitized relative path)
     * @type {string}
     */
    get name(): string;
    /**
     * Filename from which the script is created.
     * @type {string}
    */
    get filename(): string;
    /**
     * Error that may have occured during the transpilation of the script.
     * If no error occured during transpilation, the attribute is set to null.
     * @type {string}
     */
    get buildError(): string;
    /**
     * Runtime error that may have occured during the execution of the script.
     * Runtime errors must be reported by the consumer code (cf. reportRuntimeError).
     * @type {string}
     */
    get runtimeError(): string;
    /**
     * Dynamically import the bundled module.
     * {@link https://caniuse.com/?search=import()}
     * @returns {Promise} Promise which fulfills to the JS module.
     */
    import(): Promise<any>;
    /**
     * Manually report an error catched in try / catch block. While there are global
     * 'error', 'uncaughtExceptionhandler' that catch errors throws by scripts, this
     * can be usefull in situations where you want your code to continue after the error:
     * ```
     * script.onUpdate(async updates => {
     *   if (updates.browserBuild) {
     *     if (mod) {
     *       // we want to manually catch error that might be thrown in `exit()`
     *       // because otherwise `mod`` would never be updated
     *       try {
     *         mod.exit();
     *       } catch (err) {
     *         script.reportRuntimeError(err);
     *       }
     *     }
     *
     *     mod = await script.import();
     *     mod.enter();
     *   }
     * }, true);
     * ```
     * @param {Error} err
     */
    reportRuntimeError(err: Error): Promise<void>;
    /**
     * Detach the script.
     */
    detach(): Promise<void>;
    /**
     * Register a callback to be executed when the script is updated.
     * @param {Function} callback - Callback function
     * @param {boolean} [executeListener=false] - If true, execute the given
     *  callback immediately.
     * @return {Function} Function that unregister the callback when executed.
     */
    onUpdate(callback: Function, executeListener?: boolean): Function;
    /**
     * Register a callback to be executed when the script is detached, i.e. when
     * `detach` as been called, or when the script has been deleted
     * @param {Function} callback - Callback function
     */
    onDetach(callback: Function): void;
    get [kGetNodeBuild](): any;
    get [kGetBrowserBuild](): any;
    get [kGetNodeBuildURL](): any;
    get [kGetBrowserBuildURL](): any;
    #private;
}
//# sourceMappingURL=SharedScript.d.ts.map