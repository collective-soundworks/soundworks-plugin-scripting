# `@soundworks/plugin-scripting`

[`soundworks`](https://github.com/collective-soundworks/soundworks) plugin for runtime scripting. The plugin allows to define entry point in the application that enable the end user to modify the behavior of the distributed application at runtime, following an end-user programming strategy.

## Table of Contents

<!-- toc -->

## Installation

```sh
npm install @soundworks/plugin-scripting --save
```

## Example

A working example can be found in the [https://github.com/collective-soundworks/soundworks-examples](https://github.com/collective-soundworks/soundworks-examples) repository.

## Usage

## API

<!-- api -->

### Classes

<dl>
<dt><a href="#Script">Script</a></dt>
<dd></dd>
<dt><a href="#PluginScriptingServer">PluginScriptingServer</a></dt>
<dd><p>This is a description of the MyClass class.</p>
</dd>
</dl>

<a name="Script"></a>

### Script
**Kind**: global class  
**Note:**: error handling is still a beat weak, this should be improved  
<a name="PluginScriptingServer"></a>

### PluginScriptingServer
This is a description of the MyClass class.

**Kind**: global class  

* [PluginScriptingServer](#PluginScriptingServer)
    * [.setContext(ctx)](#PluginScriptingServer+setContext)
    * [.getList()](#PluginScriptingServer+getList) ⇒ <code>Array</code>
    * [.update()](#PluginScriptingServer+update)
    * [.delete()](#PluginScriptingServer+delete)

<a name="PluginScriptingServer+setContext"></a>

#### pluginScriptingServer.setContext(ctx)
Registers a global context object to be used in scripts.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>Object</code> | Object to register as global context. |

<a name="PluginScriptingServer+getList"></a>

#### pluginScriptingServer.getList() ⇒ <code>Array</code>
Returns the list of all available scripts.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  
<a name="PluginScriptingServer+update"></a>

#### pluginScriptingServer.update()
Resolve when eveything is updated, i.e. script state, nameLists, etc.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  
<a name="PluginScriptingServer+delete"></a>

#### pluginScriptingServer.delete()
Resolve when eveything is updated, i.e. script state, nameLists, etc.

**Kind**: instance method of [<code>PluginScriptingServer</code>](#PluginScriptingServer)  

<!-- apistop -->

## Security concerns

For obvious security reasons, in production or public settings, make sure to disable or protect access to any online editor.

@todo - document basic HTTP authentication w/ soundworks

## Credits

The code has been initiated in the framework of the WAVE and CoSiMa research projects, funded by the French National Research Agency (ANR).

## License

[BSD-3-Clause](./LICENSE)
