export default pluginFactory;
declare function pluginFactory(Plugin: any): {
    new (client: any, id: any, options?: {}): {
        [x: string]: any;
        /** @private */
        "__#2@#internalState": any;
        /** @private */
        "__#2@#filesystem": any;
        options: {};
        /** @private */
        start(): Promise<void>;
        /** @private */
        stop(): Promise<void>;
        /**
         * Instance of the underlying filesystem plugin
         */
        readonly filesystem: any;
        /**
         * Returns the list of all available scripts.
         * @returns {Array}
         */
        getList(): any[];
        /**
         * Return the SharedStateCollection of all the scripts underlying share states.
         * Provided for build and error monitoring purposes.
         * If you want a full featured Script instance, use the `attach` instead.
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
         * @return {Promise} Promise that resolves on a new Script instance.
         */
        attach(name: string): Promise<any>;
    };
    [x: string]: any;
};
//# sourceMappingURL=PluginScriptingClient.d.ts.map