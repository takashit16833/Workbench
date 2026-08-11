const WorkbenchCore = require("./core");
const { registerScheduleCommands } = require("./schedule");

module.exports = class WorkbenchCommands extends WorkbenchCore {
  onload() {
    super.onload();
    registerScheduleCommands(this);
  }
};
