import { Experience } from '@soundworks/core/server';

class PlayerExperience extends Experience {
  constructor(server, clientTypes, options = {}) {
    super(server, clientTypes);

    this.scripting = this.require('scripting');
  }

  async start() {
    super.start();
  }

  enter(client) {
    super.enter(client);
  }

  exit(client) {
    super.exit(client);
  }
}

export default PlayerExperience;
