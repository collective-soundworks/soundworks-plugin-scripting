# soundworks | plugin scripting

[![npm version](https://badge.fury.io/js/@soundworks%2Fplugin-scripting.svg)](https://badge.fury.io/js/@soundworks%2Fplugin-scripting)

[`soundworks`](https://soundworks.dev) plugin for runtime distributed scripting.

## Table of Contents

<!-- toc -->

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

<a name="Script"></a>

### Script
A Script instance represent a script that can be distributed and modified
at runtime. It is retrieved by a `@soundworks/plugin-scripting` plugin when
it's `attach` method is called

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

<!-- apistop -->

## Security concerns

For obvious security reasons, in production or public settings, make sure to disable or protect access to any online editor.

@todo - document basic HTTP authentication w/ soundworks

## Credits

The code has been initiated in the framework of the WAVE and CoSiMa research projects, funded by the French National Research Agency (ANR).

## License

[BSD-3-Clause](./LICENSE)
