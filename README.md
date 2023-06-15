# soundworks | plugin scripting

[![npm version](https://badge.fury.io/js/@soundworks%2Fplugin-scripting.svg)](https://badge.fury.io/js/@soundworks%2Fplugin-scripting)

[`soundworks`](https://soundworks.dev) plugin for runtime distributed scripting.

## Table of Contents

<!-- toc -->

- [Installation](#installation)
- [Example](#example)
- [Usage](#usage)
- [API](#api)
  * [Classes](#classes)
  * [Script](#script)
  * [PluginScriptingServer](#pluginscriptingserver)
- [Security concerns](#security-concerns)
- [Credits](#credits)
- [License](#license)

<!-- tocstop -->

## Installation

```sh
npm install @soundworks/plugin-scripting --save
```

## Example

A working example can be found in the [https://github.com/collective-soundworks/soundworks-examples](https://github.com/collective-soundworks/soundworks-examples) repository.

## Usage

@todo

## API

<!-- api -->

### Classes

<dl>
<dt><a href="#Script">Script</a></dt>
<dd><p>A Script instance represent a script that can be distributed and modified
at runtime. It is retrieved by a <code>@soundworks/plugin-scripting</code> plugin when
it&#39;s <code>attach</code> method is called.</p>
</dd>
<dt><a href="#PluginScriptingServer">PluginScriptingServer</a></dt>
<dd><p>Server-side representation of the soundworks&#39; scripting plugin.</p>
<p>Available options:</p>
<ul>
<li>dirname {String} - directory in which the script files are located</li>
</ul>
</dd>
</dl>

<a name="Script"></a>

### Script
A Script instance represent a script that can be distributed and modified
at runtime. It is retrieved by a `@soundworks/plugin-scripting` plugin when
it's `attach` method is called.

**Kind**: global class  

* [Script](#Script)
    * [.source](#Script+source) : <code>string</code>
    * [.error](#Script+error) : <code>string</code>
    * [.transpiled](#Script+transpiled) : <code>string</code>
    * [.import()](#Script+import) ⇒ <code>Promise</code>
    * [.detach()](#Script+detach)
    * [.onUpdate(callback, [executeListener])](#Script+onUpdate) ⇒ <code>function</code>
    * [.onDetach(callback)](#Script+onDetach)
    * [.update(value)](#Script+update)
    * [.delete()](#Script+delete)

<a name="Script+source"></a>

#### script.source : <code>string</code>
**Kind**: instance property of [<code>Script</code>](#Script)  
**Read only**: true  
<a name="Script+error"></a>

#### script.error : <code>string</code>
**Kind**: instance property of [<code>Script</code>](#Script)  
**Read only**: true  
<a name="Script+transpiled"></a>

#### script.transpiled : <code>string</code>
**Kind**: instance property of [<code>Script</code>](#Script)  
**Read only**: true  
<a name="Script+import"></a>

#### script.import() ⇒ <code>Promise</code>
Dynamically import the transpiled module.
[https://caniuse.com/?search=import()](https://caniuse.com/?search=import())

**Kind**: instance method of [<code>Script</code>](#Script)  
**Returns**: <code>Promise</code> - Promise which fulfills to an object containing all exports
 the script.  
<a name="Script+detach"></a>

#### script.detach()
Stop listening for updates

**Kind**: instance method of [<code>Script</code>](#Script)  
<a name="Script+onUpdate"></a>

#### script.onUpdate(callback, [executeListener]) ⇒ <code>function</code>
Register a callback to be executed when the script is updated.

**Kind**: instance method of [<code>Script</code>](#Script)  
**Returns**: <code>function</code> - Function that unregister the callback when executed.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| callback | <code>function</code> |  | Callback function |
| [executeListener] | <code>boolean</code> | <code>false</code> | If true, execute the given  callback immediately. |

<a name="Script+onDetach"></a>

#### script.onDetach(callback)
Register a callback to be executed when the script is detached, i.e. when
`detach` as been called, or when the script has been deleted

**Kind**: instance method of [<code>Script</code>](#Script)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback function |

<a name="Script+update"></a>

#### script.update(value)
Alias for `plugin.updateScript(name, value)`, calling this method will update
the source of the script. The update will be propagated to all attached scripts

**Kind**: instance method of [<code>Script</code>](#Script)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | New source code for the script. |

<a name="Script+delete"></a>

#### script.delete()
Alias for `plugin.deleteScript(name)`, calling this method will entirely delete
the script: the file and all associated scripts. If you just want to stop
using the current script without deleting it, call detach instead

**Kind**: instance method of [<code>Script</code>](#Script)  
<a name="PluginScriptingServer"></a>

### PluginScriptingServer
Server-side representation of the soundworks' scripting plugin.

Available options:
- dirname {String} - directory in which the script files are located

**Kind**: global class  

* [PluginScriptingServer](#PluginScriptingServer)
    * [.setGlobalScriptingContext(ctx)](#PluginScriptingServer+setGlobalScriptingContext)
    * [.getScriptNames()](#PluginScriptingServer+getScriptNames) ⇒ <code>Array</code>
    * [.getTree()](#PluginScriptingServer+getTree) ⇒ <code>Object</code>
    * [.onUpdate(callback, [executeListener])](#PluginScriptingServer+onUpdate) ⇒ <code>function</code>
    * [.createScript(name, [value])](#PluginScriptingServer+createScript) ⇒ <code>Promise</code>
    * [.updateScript(name, value)](#PluginScriptingServer+updateScript) ⇒ <code>Promise</code>
    * [.deleteScript(name)](#PluginScriptingServer+deleteScript) ⇒ <code>Promise</code>
    * [.attach(name)](#PluginScriptingServer+attach) ⇒ <code>Promise</code>

<a name="PluginScriptingServer+setGlobalScriptingContext"></a>

#### pluginScriptingServer.setGlobalScriptingContext(ctx)
Registers a global context object to be used in scripts. Note that the
context is store globally, so several scripting plugins running in parallel
will share the same underlying object. The global `getGlobalScriptingContext`
function will allow to retrieve the given object from within scripts.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>Object</code> | Object to store in global context |

<a name="PluginScriptingServer+getScriptNames"></a>

#### pluginScriptingServer.getScriptNames() ⇒ <code>Array</code>
Returns the list of all available scripts.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  
<a name="PluginScriptingServer+getTree"></a>

#### pluginScriptingServer.getTree() ⇒ <code>Object</code>
Convenience method that return the underlying filesystem tree. Can be
usefull to reuse components created for the filesystem (e.g. sc-filesystem)

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  
<a name="PluginScriptingServer+onUpdate"></a>

#### pluginScriptingServer.onUpdate(callback, [executeListener]) ⇒ <code>function</code>
Register callback to execute when a script is created or deleted. The
callback will receive the updated list of script names and the updated
file tree.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  
**Returns**: <code>function</code> - Function that unregister the listener when executed.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| callback | <code>function</code> |  | Callback function to execute |
| [executeListener] | <code>boolean</code> | <code>false</code> | If true, execute the given  callback immediately. |

<a name="PluginScriptingServer+createScript"></a>

#### pluginScriptingServer.createScript(name, [value]) ⇒ <code>Promise</code>
Create a new script. The returned promise resolves when all underlyings
states, files and script instances are up-to-date.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the script, will be used as the actual filename |
| [value] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | Initial value of the script |

<a name="PluginScriptingServer+updateScript"></a>

#### pluginScriptingServer.updateScript(name, value) ⇒ <code>Promise</code>
Update an existing script. The returned promise resolves when all underlyings
states, files and script instances are up-to-date.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the script |
| value | <code>string</code> | New value of the script |

<a name="PluginScriptingServer+deleteScript"></a>

#### pluginScriptingServer.deleteScript(name) ⇒ <code>Promise</code>
Delete a script. The returned promise resolves when all underlyings
states, files and script instances are up-to-date.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the script |

<a name="PluginScriptingServer+attach"></a>

#### pluginScriptingServer.attach(name) ⇒ <code>Promise</code>
Attach to a script.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  
**Returns**: <code>Promise</code> - Promise that resolves on a new Script instance.  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the script |


<!-- apistop -->

## Security concerns

For obvious security reasons, in production or public settings, make sure to disable or protect access to any online editor.

## Credits

[https://soundworks.dev/credits.html](https://soundworks.dev/credits.html)

## License

[BSD-3-Clause](./LICENSE)
