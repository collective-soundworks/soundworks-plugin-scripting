# TODOS.ms

- [ ] post install script to install components in app
--> delegate to `@soundworks/create` (is components directory exists) ?

```html
<sw-plugin-scripting 
  .plugin="${myPlugin}"
></sw-plugin-scripting>
```

- [ ] script templates (`plugin.createWithTemplate` ?)
- [ ] allow other extentions than .js (.md, .json, etc.)

- [ ] document that it should use named export

- [ ] simplify file structure
  /src
    PluginScriptingClient.js
    PluginScriptingServer.js
    Script.js
    utils.js
  /components
    sw-plugin-scripting.js

--> check if it works for other plugins as well
