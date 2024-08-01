export default function _default(Plugin: any): {
    new (server: any, id: any, options: any): {
        [x: string]: any;
        options: any;
        _scriptInfosByName: Map<any, any>;
        _internalState: any;
        _filesystem: any;
        /** @private */
        start(): Promise<void>;
        /** @private */
        stop(): Promise<void>;
        /**
         * Instance of the underlying filesystem plugin.
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
         * @return {Promise} Promise that resolves on a new Script instance.
         */
        attach(name: string): Promise<any>;
        /** @private */
        _updateInternalState(): Promise<void>;
        /** @private */
        _createScript(node: any): Promise<void>;
        /** @private */
        _deleteScript(name: any): Promise<void>;
    };
    [x: string]: any;
};
//# sourceMappingURL=PluginScriptingServer.d.ts.map