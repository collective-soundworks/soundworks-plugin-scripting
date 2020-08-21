# `@soundworks/plugin-scripting`

> [`soundworks`](https://github.com/collective-soundworks/soundworks) plugin for runtime scripting. The plugin allow to define entry point in the application that enable the end user to modify the behavior of the distributed application at runtime, following an end-user programming strategy.

## Table of Contents

<!-- toc -->

- [Installation](#installation)
- [Example](#example)
- [Usage](#usage)
  * [Server](#server)
    + [Registering the plugin](#registering-the-plugin)
    + [Requiring the plugin](#requiring-the-plugin)
  * [Client](#client)
    + [Registering the plugin](#registering-the-plugin-1)
    + [Requiring the plugin](#requiring-the-plugin-1)
- [Scripts Management](#scripts-management)
  * [Creating a script](#creating-a-script)
  * [Deleting a script](#deleting-a-script)
  * [Attaching to a script](#attaching-to-a-script)
  * [Observing and Getting list of available scripts](#observing-and-getting-list-of-available-scripts)
- [Script Consumption](#script-consumption)
  * [Executing a script](#executing-a-script)
  * [Getting and updating the value of a script](#getting-and-updating-the-value-of-a-script)
  * [Subscribing to script updates](#subscribing-to-script-updates)
  * [Detach from a script](#detach-from-a-script)
- [Notes](#notes)
  * [File edition](#file-edition)
  * [Advanced usage](#advanced-usage)
  * [Security concerns](#security-concerns)
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

### Server

#### Registering the plugin

```js
// index.js
import { Server } from '@soundworks/core/server';
import pluginScriptingFactory from '@soundworks/plugin-scripting/server';

const server = new Server();
server.pluginManager.register('scripting', pluginScriptingFactory, {
  // default to `.data/scripts`
  directory: 'scripts',
}, []);
```

#### Requiring the plugin

```js
// MyExperience.js
import { AbstractExperience } from '@soundworks/core/server';

class MyExperience extends AbstractExperience {
  constructor(server, clientType) {
    super(server, clientType);
    // require plugin in the experience
    this.scripting = this.require('scripting');
  }
}
```

### Client

#### Registering the plugin

```js
// index.js
import { Client } from '@soundworks/core/client';
import pluginScriptingFactory from '@soundworks/plugin-scripting/client';

const client = new Client();
client.pluginManager.register('scripting', pluginScriptingFactory, {}, []);
```

#### Requiring the plugin

```js
// MyExperience.js
import { Experience } from '@soundworks/core/client';

class MyExperience extends Experience {
  constructor(client) {
    super(client);
    // require plugin in the experience
    this.scripting = this.require('scripting');
  }
}
```

## Scripts Management

All the plugin scripting API presented below is similar server-side and client-side.

### Creating a script

```js
const scriptName = 'my-script';
// optional default value, defaults to:
// `function ${camelCase(scriptName)}() {}`
const defaultValue = `// ${scriptName}
function(audioContext) {
  // write your code here...
}
`;

await this.scripting.create(scriptName, defaultValue);
```

### Deleting a script

```js
await this.scripting.delete(scriptName);
```

### Attaching to a script

```js
const script = await this.scripting.attach(scriptName);
```

### Observing and Getting list of available scripts

```js
// observe creation and deletion of scripts on the network
this.scripting.observe(() => {
  const list = this.scripting.getList();
  console.log(list);
});

// getting the current list of scripts
const list = this.scripting.getList();
```

## Script Consumption

The scripts are internally transpiled using babel to enable usage of modern JS features in old browsers (we currently aim to support iOS >= 9.3).

### Executing a script

```js
const script = await this.scripting.attach('some-script');
// arguments passed to the script are at discretion of the developer this
// will define which part the application the end-user as access to.
script.execute(...args);
```

### Getting and updating the value of a script

```js
const script = await this.scripting.attach('some-script');
// As this method principally aims to provide a way of creating
// an editor, the code retrieved if the original code, not the transpiled one
const code = script.getValue();

// Similarly the value of the script can be set from the content of an editor
script.setValue(code);
```

### Subscribing to script updates

```js
// re-execute the script when its value has been updated
script.subscribe(() => {
  script.execute(...args);
});

// later...
script.setValue(code);
```

### Detach from a script

```js
// the given callback is also called when the script is deleted
script.onDetach(() => {
  // do some cleaning...
});

await script.detach();
```

## Notes

### File edition

To provide the most possible entry points to scripting, the script files stored in the server are automatically watched by the server. This allows to update the application at runtime directly from your favorite editor.

### Advanced usage

The API provided by the plugin is by default very simple. However it makes possible to simply create more advanced behaviors and lifecycle. For example, the application can define a contract where the script acts as a factory function that returns an object consumed by the application, allowing the script to maintain its own local state and variables.

In such case, using a clean and commented default value (cf. [Creating a script](#creating-a-script)) can be important to help the end-user to understand and follow the API contract with the application.

```js
// my-script.js
function createAudioEngine(audioContext, audioBuffers) {
  let intervalId;
  // create some audio graph
  const bus = audioContext.createGain();
  bus.connect(audioContext.destination);

  function playBuffer() {
    const src = audioContext.createBufferSource();
    src.buffer = audioBuffers[Math.floor(Math.random() * audioBuffers.length)];
    src.start(audioContext.currentTime);
  }

  return {
    start() {
      intervalId = setInterval(playBuffer, 1);
    },
    stop() {
      clearInterval(intervalId);
      bus.disconnect();
    },
  };
}
```

Such script could be consumed as following in the application code:

```js
// application code
const script = await this.scripting.attach('my-script');
const engine = script.execute(audioContext);

script.onDetach(() => engine.stop());
engine.start();

// later...
await script.detach();
```

### Security concerns

For obvious security reasons, in production or public settings, make sure to disable or protect access to any online editor.

@todo - document basic HTTP authentication w/ soundworks

## Credits

The code has been initiated in the framework of the WAVE and CoSiMa research projects, funded by the French National Research Agency (ANR).

## License

BSD-3-Clause
