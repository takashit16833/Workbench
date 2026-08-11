const { openCreateHoliday, openShiftSchedule } = require("./schedule-ui");

function registerScheduleCommands(plugin) {
  plugin.addCommand({
    id: "create-holiday",
    name: "Create Holiday",
    callback: () => openCreateHoliday(plugin),
  });

  plugin.addCommand({
    id: "shift-schedule",
    name: "Shift Schedule",
    callback: () => openShiftSchedule(plugin),
  });
}

module.exports = { registerScheduleCommands };
