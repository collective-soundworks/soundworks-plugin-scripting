import Script from '../common/Script';

const pluginFactory = function(Plugin) {
  return class PluginScripting extends Plugin {
    constructor(client, id, options) {
      super(client, id);

      const defaults = {
        // default config options
      };

      this.options = this.configure(defaults, options);
    }

    async start() {
      this.state = await this.client.stateManager.attach(`s:plugin:${this.id}`);

      this.started();
      this.ready()
    }

    getList() {
      return this.state.get('list');
    }

    observe(callback) {
      return this.state.subscribe(callback);
    }

    async attach(name) {
      const scriptSchemaName = `s:plugin:${this.id}:script:${name}`;
      const scriptState = await this.client.stateManager.attach(scriptSchemaName);
      return new Script(scriptState);
    }

    async create(name, value = null) {
      return new Promise((resolve, reject) => {
        const ackChannel = `s:plugin:${this.id}:create-ack:${name}`;

        this.client.socket.addListener(ackChannel, () => {
          this.client.socket.removeAllListeners(ackChannel);
          resolve();
        });

        this.client.socket.send(`s:plugin:${this.id}:create`, name, value);
      });
    }

    async delete(name) {
      return new Promise((resolve, reject) => {
        const ackChannel = `s:${this.id}:delete-ack:${name}`;

        this.client.socket.addListener(ackChannel, () => {
          this.client.socket.removeAllListeners(ackChannel);
          resolve();
        });

        this.client.socket.send(`s:plugin:${this.id}:delete`, name);
      });
    }
  }
}

export default pluginFactory;
