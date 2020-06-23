import { Experience } from '@soundworks/core/server';

class ScriptEditorExperience extends Experience {
  constructor(server, clientTypes, options = {}) {
    super(server, clientTypes);

    this.scripting = this.require('scripting');
  }

  start() {
    super.start();
  }

  enter(client) {
    super.enter(client);
  }

  exit(client) {
    super.exit(client);
  }
}

export default ScriptEditorExperience;
