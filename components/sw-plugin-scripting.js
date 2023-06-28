import { html, LitElement } from 'lit';

import '@ircam/simple-components/sc-file-tree.js';
import '@ircam/simple-components/sc-editor.js';

class SwPluginScripting extends LitElement {
  static get styles() {

  }

  constructor() {
    super();

    this.plugin = null;
    this._script = null;
  }

  connectedCallback() {
    super.connectedCallback();
    console.log(this.plugin.getTree());
  }

  render() {
    return html`
      <h1>Hello "${this.plugin.id}" plugin</h1>
      <sc-file-tree
        value="${JSON.stringify(this.plugin.getTree())}"
        @input=${e => this._switchScript(e.detail.value)}
      ></sc-file-tree>
      <sc-editor
        width="800"
        height="600"
        value="${this._script ? this._script.source : '// select a script in the side bar'}"
        error="${this._script ? this._script.error : ''}"
        @change=${e => this._script.update(e.detail.value)}
      ></sc-editor>
    `
  }

  async _switchScript(node) {
    if (this._script) {
      await this._script.detach();
    }

    const scriptName = node.relPath;
    this._script = await this.plugin.attach(scriptName);
    this._script.onUpdate(() => this.requestUpdate(), true);
  }
}

if (customElements.get('sw-plugin-scripting') === undefined) {
  customElements.define('sw-plugin-scripting', SwPluginScripting);
}
