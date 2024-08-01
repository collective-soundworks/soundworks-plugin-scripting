# TODOS

## Plugin FileSystem

- [x] test all operations against root node

## sc-filetree

- [x] Keyboard navigation
- [x] Protect against creating file with same name
- [x] Remove 'rename' and 'delete' from context menu for root node

## Plugin Scripting

- [x] Propagate script build errors to editor
- [x] Use esbuild watch so that a script is rebundled even when one of its dependency is updated
- [x] Remove `createScript`, `updateScript` and `deleteScript` from plugin API, is the responsiblity of the filesystem
- [x] Make a test with `sc-getTime` to handle deps with different platform entry points
  - [x] Will likely imply to transpiled 2 different versions: browser & node
- [x] Propage runtime errors
  - [x] Node: have proper stack traces
  - [x] Browser: have proper stack traces

- [x] Issues with node restart, etc in case of errors
  - [x] soundworks/helpers - do not exit process, just swallow error if stack
        contains `data:text/javascript;base64` (as we can ussme it comes form a script?
  - [-] If it work we can maybe generalize and remove `propagateRuntimeError` by listening for `uncaughtException`
        -> This can be still be usefull in some situations cf. try ... catch for `mod.exit()` in `index.js`

- [x] Issue with plugin-filesystem `exit()` which never resolves...
  -> was a build issue, calling `client.stop()` when socket closed

- [x] `_createScript` should resolve when builds are done
- [x] Tests
  
#### Ideas

Support both:

```js
const mod = await script.import();
// and
const mod = await import(script.asModule());
```