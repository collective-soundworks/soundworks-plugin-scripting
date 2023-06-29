# TODO

- [ ] post install script to install components in app
> delegate to `@soundworks/create` (is components directory exists) ?

```html
<sw-plugin-scripting 
  .plugin="${myPlugin}"
></sw-plugin-scripting>
```

- [ ] script templates (`plugin.createWithTemplate` ?)
- [ ] allow other extentions than .js (.md, .json, etc.)
- [ ] document that it should use named export
- [ ] propagate errors from filesystem
- [ ] test that `onUpdate` is called when the file is modified directly
