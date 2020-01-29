import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderAppInitialization from '../views/renderAppInitialization';
import '../views/elements/sw-button';

class PlayerExperience extends Experience {
  constructor(client, config = {}, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.scripting = this.require('scripting');
    // default initialization views
    renderAppInitialization(client, config, $container);
  }

  async start() {
    super.start();

    this.scripts = {};

    this.assignScriptsState = await this.client.stateManager.attach('assign-scripts');

    this.assignScriptsState.subscribe(async updates => {
      await this.updateScripts(updates);
    });

    this.updateScripts(this.assignScriptsState.getValues());

    this.eventListeners = {
      executeScript: (name) => {
        if (this.scripts[name]) {
          this.scripts[name].execute(1, 2, 3);
        }
      }
    }

    this.renderApp();
  }

  async updateScripts(assignedScripts) {
    console.log(assignedScripts);
    for (let [key, value] of Object.entries(assignedScripts)) {
      switch (key) {
        case 'script-a':
        case 'script-b':
          const scriptName = value;

          if (scriptName) {
            if (this.scripts[key]) {
              this.scripts[key].detach();
            }

            this.scripts[key] = await this.scripting.attach(scriptName);
            this.scripts[key].onDetach(() => this.scripts[key] = null);
          }
          break;
      }
    }

    this.renderApp();
  }

  renderApp() {
    const msg = `Hello ${this.client.id}`;

    render(html`
      <div class="screen" style="padding: 20px; text-align: center;">
        <h1 class="title">${msg}</h1>
        <sw-button
          style="display:block"
          text="execute script-a ${this.scripts['script-a'] && this.scripts['script-a'].name}"
          @click="${(e) => this.eventListeners.executeScript('script-a')}"
        ></sw-button>
        <sw-button
          style="display:block"
          text="execute script-b ${this.scripts['script-b'] && this.scripts['script-b'].name}"
          @click="${(e) => this.eventListeners.executeScript('script-b')}"
        ></sw-button>
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
