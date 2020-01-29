import Script from '../common/script';

const serviceFactory = function(Service) {

  return class ServiceScripting extends Service {
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

    async create(name, value = null) {
      return new Promise((resolve, reject) => {
        const ackChannel = `s:${this.name}:create-ack-${name}`;

        this.client.socket.addListener(ackChannel, () => {
          this.client.socket.removeAllListeners(ackChannel);
          resolve();
        });

        this.client.socket.send(`s:${this.name}:create`, name, value);
      });
    }

    async attach(name) {
      const scriptSchemaName = `s:${this.name}:script:${name}`;
      const scriptState = await this.client.stateManager.attach(scriptSchemaName);
      return new Script(scriptState);
    }

    async delete(name) {
      return new Promise((resolve, reject) => {
        const ackChannel = `s:${this.name}:delete-ack-${name}`;

        this.client.socket.addListener(ackChannel, () => {
          this.client.socket.removeAllListeners(ackChannel);
          resolve();
        });

        this.client.socket.send(`s:${this.name}:delete`, name);
      });
    }
  }
}

// not mandatory
serviceFactory.defaultName = 'service-scripting';

export default serviceFactory;
