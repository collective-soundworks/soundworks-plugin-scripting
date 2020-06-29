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

    this.script = null;

    this.assignScriptsState = await this.client.stateManager.attach('assign-scripts');

    this.assignScriptsState.subscribe(async updates => {
      await this.updateScripts(updates);
    });

    this.renderApp();

    this.updateScripts(this.assignScriptsState.getValues());
  }

  async updateScripts(assignedScripts) {
    for (let [key, value] of Object.entries(assignedScripts)) {
      switch (key) {
        case 'script-name':
          const scriptName = value;

          if (this.script) {
            await this.script.detach();
          }

          if (scriptName) {
            this.script = await this.scripting.attach(scriptName);
            this.renderApp();

            this.script.onDetach(() => this.script = null);
            // re-execute on update
            this.script.subscribe(() => {
              this.returnValue = this.script.execute(this.$container.querySelector('.result'), this.client);
              this.renderApp();
            });

            this.returnValue = this.script.execute(this.$container.querySelector('.result'), this.client);
            this.renderApp();
          }
          break;
      }
    }
  }

  renderApp() {
    render(html`
      <div class="screen" style="padding: 20px;">
        <h1 class="title">Client ${this.client.id}</h1>
        <p>${this.script ? `> executing script "${this.script.name}"` : ''}</p>
        <p style="margin:0 0 4px">> result:</p>

        <pre>
          <code class="result" style="color: white; text-align: left"></code>
        </pre>
        ${this.returnValue ?
          html`
            <pre><code>
returnValue: ${JSON.stringify(this.returnValue)}
            </code></pre>
          ` : ''
        }
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
