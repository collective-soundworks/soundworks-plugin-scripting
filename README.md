# soundworks | plugin scripting

[![npm version](https://badge.fury.io/js/@soundworks%2Fplugin-scripting.svg)](https://badge.fury.io/js/@soundworks%2Fplugin-scripting)

[`soundworks`](https://soundworks.dev) plugin for runtime distributed scripting.

## Table of Contents

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [PluginScriptingClient](#pluginscriptingclient)
- [PluginScriptingServer](#pluginscriptingserver)
- [Development Notes](#development-notes)
- [Credits](#credits)
- [License](#license)

<!-- tocstop -->

## Installation

```sh
npm install @soundworks/plugin-scripting --save
```

## Usage

### Server

```js
// src/server/index.js
import { Server } from '@soundworks/core/server.js';
import ServerPluginScripting from '@soundworks/plugin-scripting/server.js';

const server = new Server(config);
// register the plugin with an optional dirname
server.pluginManager.register('scripting', ServerPluginScripting, {
  dirname: 'my-script',
});
await server.start();
// use the plugin once the server is started
const scripting = await server.pluginManager.get('scripting');
```

Given that there is a file `my-constants.js` in the watched `my-script` directory:

```js
// my-script/my-constants.js
export const answer = 42;
```

### Client

```js
// src/client/**/index.js
import { Client } from '@soundworks/core/client.js';
import ClientPluginScripting from '@soundworks/plugin-scripting/client.js';

const client = new Client(config);
// register the plugin
client.pluginManager.register('scripting', ClientPluginScripting);
await client.start();
// use the plugin once the client is started
const scripting = await client.pluginManager.get('scripting');
const script = await scripting.attach('my-constants');
const mod = await script.import();
console.log(mod.answer);
// > 42
```

### Notes

#### Where do the scripts live

The shared scripts are stored in the file system as raw Javascript files located in the directory defined on the server side configuration of the plugin (cf. `dirname` option).

This is the responsibility of the code consuming the shared scripts to define the API that the scripts should expose.

#### Limitations

The scripts are simple JavaScript modules that are re-bundled using `esbuild` each time their content is modified. As such, they can import installed dependencies (i.e. `node_modules`) or import other scripts. However, using such bundle leads to a restriction in Node.js clients, that can't import native addons directly (in such case you should inject the dependency into the script at runtime). This might change in the future as dynamic `import`/`require` of ES modules is more stable (cf. <https://github.com/nodejs/help/issues/2751>).

#### Creating / updating / deleting scripts

Internally the `scripting` plugin relies on the [`@soundworks/plugin-filesystem`](https://soundworks.dev/plugins/filesystem.html) plugin, which should be use to make any modifications in the script directory:

```js
// register and get the scripting plugin
server.pluginManager.register('scripting', ServerPluginScripting, { dirname: 'my-script' });
await server.start();
const scripting = await server.pluginManager.get('scripting');
// create a new script in the 'my-script' directory using the scripting related filesystem
const code = `export function add(a, b) { return a + b }`;
await scripting.filesystem.writeFile('add.js', code);
```

## API

<!-- api -->
<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [ClientPluginScripting][1]
    *   [Parameters][2]
    *   [Examples][3]
    *   [filesystem][4]
    *   [getList][5]
    *   [getCollection][6]
    *   [setGlobalScriptingContext][7]
    *   [attach][8]
*   [ServerPluginScripting][9]
    *   [Examples][10]
    *   [options][11]
    *   [filesystem][12]
    *   [getList][13]
    *   [getCollection][14]
    *   [setGlobalScriptingContext][15]
    *   [onUpdate][16]
    *   [switch][17]
    *   [attach][18]
*   [SharedScript][19]
    *   [name][20]
    *   [filename][21]
    *   [buildError][22]
    *   [runtimeError][23]
    *   [import][24]
    *   [reportRuntimeError][25]
    *   [detach][26]
    *   [onUpdate][27]
    *   [onDetach][28]

## ClientPluginScripting

**Extends ClientPlugin**

Client-side representation of the soundworks' scripting plugin.

The constructor should never be called manually. The plugin will be
instantiated automatically when registered in the `pluginManager`

### Parameters

*   `client` &#x20;
*   `id` &#x20;
*   `options`   (optional, default `{}`)

### Examples

```javascript
client.pluginManager.register('scripting', ClientPluginScripting, { dirname });
```

### filesystem

Instance of the underlying filesystem plugin

### getList

Returns the list of all available scripts.

Returns **[Array][29]**&#x20;

### getCollection

Return the SharedStateCollection of all the scripts underlying share states.
Provided for build and error monitoring purposes. Can also be used to maintain
a list of existing script, e.g. in a drop-down menu

If you want a full featured / executable Script instance, use the `attach` instead.

Returns **[Promise][30]\<SharedStateCollection>**&#x20;

### setGlobalScriptingContext

Registers a global context object to be used in scripts. Note that the
context is store globally, so several scripting plugins running in parallel
will share the same underlying object. The global `getGlobalScriptingContext`
function will allow to retrieve the given object from within scripts.

#### Parameters

*   `ctx` **[Object][31]** Object to store in global context

### attach

Attach to a script.

#### Parameters

*   `name` **[string][32]** Name of the script

Returns **[Promise][30]<[SharedScript][19]>** Promise that resolves on a new Script instance.

## ServerPluginScripting

**Extends ServerPlugin**

Server-side representation of the soundworks' scripting plugin.

The constructor should never be called manually. The plugin will be
instantiated by soundworks when registered in the `pluginManager`

Available options:

*   `dirname` {String} - directory in which the script files are located

If no option is given, for example before a user selects a project, the plugin
will stay idle until `switch` is called.

### Examples

```javascript
server.pluginManager.register('scripting', ServerPluginScripting, { dirname });
```

### options

Type: [object][31]

#### Properties

*   `dirname` **([string][32] | null)?** Path to the directory in which the script are located
*   `verbose` **[boolean][33]?**&#x20;

### filesystem

Instance of the underlying filesystem plugin.

### getList

Returns the list of all available scripts.

Returns **[Array][29]**&#x20;

### getCollection

Return the SharedStateCollection of all the scripts underlying share states.
Provided for build and error monitoring purposes.
If you want a full featured Script instance, see `attach` instead.

Returns **[Promise][30]\<SharedStateCollection>**&#x20;

### setGlobalScriptingContext

Registers a global context object to be used in scripts. Note that the
context is store globally, so several scripting plugins running in parallel
will share the same underlying object. The global `getGlobalScriptingContext`
function will allow to retrieve the given object from within scripts.

#### Parameters

*   `ctx` **[Object][31]** Object to store in global context

### onUpdate

Register callback to execute when a script is created or deleted.

#### Parameters

*   `callback` **[Function][34]** Callback function to execute
*   `executeListener` **[boolean][33]** If true, execute the given
    callback immediately. (optional, default `false`)

Returns **[Function][34]** Function that unregister the listener when executed.

### switch

Switch the plugin to watch and use another directory

#### Parameters

*   `dirname` **([String][32] | [Object][31])** Path to the new directory. As a convenience
    to match the plugin filesystem API, an object containing the 'dirname' key
    can also be passed

### attach

Attach to a script.

#### Parameters

*   `name` **[string][32]** Name of the script

Returns **[Promise][30]<[SharedScript][19]>** Promise that resolves on a new Script instance.

## SharedScript

A SharedScript can be distributed amongst different clients and modified
at runtime.

The script source is stored directly in the filesystem, see `dirname` option
of the server-side plugin.

A Shared script cannot be instantiated manually, it is retrieved by calling
the `ClientPluginScripting#attach` or `ServerPluginScripting#attach` methods.

### name

Name of the script (i.e. sanitized relative path)

Type: [string][32]

### filename

Filename from which the script is created.

Type: [string][32]

### buildError

Error that may have occurred during the transpilation of the script.
If no error occurred during transpilation, the attribute is set to null.

Type: [string][32]

### runtimeError

Runtime error that may have occurred during the execution of the script.
Runtime errors must be reported by the consumer code (cf. reportRuntimeError).

Type: [string][32]

### import

Dynamically import the bundled module.

Returns **[Promise][30]<[Module][35]>** Promise which fulfills to the JS module.

### reportRuntimeError

Manually report an error catched in try / catch block.

This can be useful in situations where you want your script to expose a specific API:

```js
const { expectedMethod } = await script.import();

if (!expectedMethod) {
  const err = new Error('Invalid script "${script.name}": should export a "expectedMethod" function');
  script.reportRuntimeError(err);
}
```

Or when you want your code to continue after the script error, e.g.:

```js
script.onUpdate(async updates => {
 if (updates.browserBuild) {
   if (mod) {
     // we want to manually catch error that might be thrown in `exit()`
     // because otherwise `mod`` would never be updated
     try {
       mod.exit();
     } catch (err) {
       script.reportRuntimeError(err);
     }
   }

   mod = await script.import();
   mod.enter();
 }
}, true);
```

#### Parameters

*   `err` **[Error][36]**&#x20;

### detach

Detach the script.

### onUpdate

Register a callback to be executed when the script is updated.

#### Parameters

*   `callback` **[Function][34]** Callback function
*   `executeListener` **[boolean][33]** If true, execute the given
    callback immediately. (optional, default `false`)

Returns **[Function][34]** Function that unregister the callback when executed.

### onDetach

Register a callback to be executed when the script is detached, i.e. when
`detach` as been called, or when the script has been deleted

#### Parameters

*   `callback` **[Function][34]** Callback function

[1]: #clientpluginscripting

[2]: #parameters

[3]: #examples

[4]: #filesystem

[5]: #getlist

[6]: #getcollection

[7]: #setglobalscriptingcontext

[8]: #attach

[9]: #serverpluginscripting

[10]: #examples-1

[11]: #options

[12]: #filesystem-1

[13]: #getlist-1

[14]: #getcollection-1

[15]: #setglobalscriptingcontext-1

[16]: #onupdate

[17]: #switch

[18]: #attach-1

[19]: #sharedscript

[20]: #name

[21]: #filename

[22]: #builderror

[23]: #runtimeerror

[24]: #import

[25]: #reportruntimeerror

[26]: #detach

[27]: #onupdate-1

[28]: #ondetach

[29]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array

[30]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise

[31]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[32]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[33]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean

[34]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[35]: https://nodejs.org/api/modules.html

[36]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error

<!-- apistop -->

## Development Notes

## Credits

[https://soundworks.dev/credits.html](https://soundworks.dev/credits.html)

## License

[BSD-3-Clause](./LICENSE)
