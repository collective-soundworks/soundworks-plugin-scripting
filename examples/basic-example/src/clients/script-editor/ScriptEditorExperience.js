import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import renderAppInitialization from '../views/renderAppInitialization';
import '../views/elements/sw-editor';
import '../views/elements/sw-combo-box';
import '../views/elements/sw-button';


class PlayerExperience extends Experience {
  constructor(client, config = {}, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.scripting = this.require('scripting');
    // require services
    this.currentScript = undefined;

    // default initialization views
    renderAppInitialization(client, config, $container);
  }

  async start() {
    super.start();

    this.assignScriptsState = await this.client.stateManager.attach('assign-scripts');
    this.assignScriptsState.subscribe(() => this.renderApp());

    // on script list update
    this.scripting.state.subscribe(updates => {
      this.renderApp();
    });

    this.eventListeners = {
      createOrSelectScript: async (e) => {
        const scriptName = e.detail.value;
        const list = this.scripting.state.get('list');

        if (list.indexOf(scriptName) === -1) {
          await this.scripting.create(scriptName);
        }

        if (this.currentScript) {
          await this.currentScript.detach();
        }

        this.currentScript = await this.scripting.attach(scriptName);

        this.currentScript.subscribe(() => {
          this.renderApp();
        });

        this.currentScript.onDetach(() => {
          this.currentScript = undefined;
          this.renderApp();
        });

        this.renderApp();
      },
      saveScript: async (e) => {
        if (this.currentScript) {
          await this.currentScript.setValue(e.target.value);
          this.renderApp();
        }
      },
      deleteScript: async (e) => {
        console.log('delete script');
        const scriptName = this.currentScript.name;
        await this.scripting.delete(scriptName);
      },
      assignScript: (target, value) => {
        this.assignScriptsState.set({ [target]: value });
      }
    };

    this.renderApp();
  }

  renderApp() {
    const list = this.scripting.state.get('list');
    const assignedScript = this.assignScriptsState.getValues();

    render(html`
      <div class="screen" style="padding: 20px;">
        <div>
          <h2 class="title">>assign scripts</h2>
          <!-- could be a loop.. -->
          <label style="display:block; margin: 12px 0 4px;">assign script-a:</label>
          <sw-combo-box
            placeholder="select or create script"
            options="${JSON.stringify(list)}"
            value="${ifDefined(assignedScript['script-a'])}"
            @change="${(e) => this.eventListeners.assignScript('script-a', e.detail.value)}"
          ></sw-combo-box>
          <label style="display:block; margin: 12px 0 4px;">assign script-b:</label>
          <sw-combo-box
            placeholder="select or create script"
            options="${JSON.stringify(list)}"
            value="${ifDefined(assignedScript['script-b'])}"
            @change="${(e) => this.eventListeners.assignScript('script-b', e.detail.value)}"
          ></sw-combo-box>
        </div>

        <div style="margin-top: 20px;">
          <header
            style="margin-bottom: 12px"
          >
            <h2 class="title">>edit scripts</h2>
            <sw-combo-box
              placeholder="select or create script"
              options="${JSON.stringify(list)}"
              value="${ifDefined(this.currentScript && this.currentScript.name)}"
              @change="${this.eventListeners.createOrSelectScript}"
            ></sw-combo-box>
            ${this.currentScript
              ? html`<sw-button
                  @click="${this.eventListeners.deleteScript}"
                  text="delete ${this.currentScript.name}"
                ></sw-button>`
              : ''
            }
          </header>
          <sw-editor id="test"
            width="800"
            height="400"
            value="${ifDefined(this.currentScript && this.currentScript.getValue())}"
            @save="${this.eventListeners.saveScript}"
          ></sw-editor>
        </div>
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
