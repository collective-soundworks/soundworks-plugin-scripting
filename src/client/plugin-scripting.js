import Script from '../common/Script';

const pluginFactory = function(AbstractPlugin) {

  return class PluginScripting extends AbstractPlugin {
    constructor(client, name, options) {
      super(client, name);

      const defaults = {
        // default config options
      };

      this.options = this.configure(defaults, options);
    }

    async start() {
      this.state = await this.client.stateManager.attach(`s:${this.name}`);

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
      const scriptSchemaName = `s:${this.name}:script:${name}`;
      const scriptState = await this.client.stateManager.attach(scriptSchemaName);
      return new Script(scriptState);
    }

    async create(name, value = null) {
      return new Promise((resolve, reject) => {
        const ackChannel = `s:${this.name}:create-ack:${name}`;

        this.client.socket.addListener(ackChannel, () => {
          this.client.socket.removeAllListeners(ackChannel);
          resolve();
        });

        this.client.socket.send(`s:${this.name}:create`, name, value);
      });
    }

    async delete(name) {
      return new Promise((resolve, reject) => {
        const ackChannel = `s:${this.name}:delete-ack:${name}`;

        this.client.socket.addListener(ackChannel, () => {
          this.client.socket.removeAllListeners(ackChannel);
          resolve();
        });

        this.client.socket.send(`s:${this.name}:delete`, name);
      });
    }
  }
}

export default pluginFactory;
