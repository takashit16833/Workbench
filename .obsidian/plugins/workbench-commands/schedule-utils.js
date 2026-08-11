function getDatePart(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function parseDatePart(value) {
  const datePart = getDatePart(value);
  if (!datePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDatePart(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addCalendarDays(datePart, days) {
  const date = parseDatePart(datePart);
  if (!date) throw new Error(`Invalid date: ${datePart}`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDatePart(date);
}

function shiftWorkdayDatePart(datePart, amount, excludedDates = new Set()) {
  if (!Number.isInteger(amount)) {
    throw new Error("Shift amount must be an integer.");
  }
  if (!parseDatePart(datePart)) {
    throw new Error(`Invalid date: ${datePart}`);
  }
  if (amount === 0) return datePart;

  const direction = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  let current = datePart;

  while (remaining > 0) {
    current = addCalendarDays(current, direction);
    if (!excludedDates.has(current)) {
      remaining -= 1;
    }
  }

  return current;
}

function replaceDatePart(value, datePart) {
  const currentDatePart = getDatePart(value);
  if (!currentDatePart) throw new Error(`Invalid date value: ${value}`);
  return `${datePart}${value.slice(currentDatePart.length)}`;
}

function shiftWorkdayValue(value, amount, excludedDates = new Set()) {
  const datePart = getDatePart(value);
  if (!datePart) throw new Error(`Invalid date value: ${value}`);
  const shifted = shiftWorkdayDatePart(datePart, amount, excludedDates);
  return replaceDatePart(value, shifted);
}

function buildShiftPlan(tasks, baselinePath, amount, excludedDates = new Set()) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error("Shift amount must be a non-zero integer.");
  }

  const baseline = tasks.find((task) => task.path === baselinePath);
  if (!baseline) throw new Error("Baseline task not found.");
  if (!baseline.scheduled || !baseline.due) {
    throw new Error("Baseline task must have scheduled and due dates.");
  }

  const boundary = getDatePart(baseline.due);
  const baselineScheduled = getDatePart(baseline.scheduled);
  if (!boundary || !baselineScheduled) {
    throw new Error("Baseline task has an invalid date.");
  }

  const shiftedBaselineDue = shiftWorkdayValue(baseline.due, amount, excludedDates);
  const shiftedBaselineDuePart = getDatePart(shiftedBaselineDue);
  if (!shiftedBaselineDuePart || shiftedBaselineDuePart < baselineScheduled) {
    throw new Error("Shift would move the baseline due date before its scheduled date.");
  }

  const changes = [
    {
      path: baseline.path,
      title: baseline.title,
      multiProject: Boolean(baseline.multiProject),
      oldScheduled: baseline.scheduled,
      newScheduled: baseline.scheduled,
      oldDue: baseline.due,
      newDue: shiftedBaselineDue,
      baseline: true,
    },
  ];

  const following = tasks
    .filter((task) => task.path !== baseline.path)
    .filter((task) => {
      const scheduled = getDatePart(task.scheduled);
      return scheduled && scheduled >= boundary;
    })
    .sort((a, b) => {
      const aScheduled = getDatePart(a.scheduled) || "";
      const bScheduled = getDatePart(b.scheduled) || "";
      return aScheduled.localeCompare(bScheduled) || a.path.localeCompare(b.path);
    });

  for (const task of following) {
    changes.push({
      path: task.path,
      title: task.title,
      multiProject: Boolean(task.multiProject),
      oldScheduled: task.scheduled,
      newScheduled: shiftWorkdayValue(task.scheduled, amount, excludedDates),
      oldDue: task.due,
      newDue: shiftWorkdayValue(task.due, amount, excludedDates),
      baseline: false,
    });
  }

  return {
    amount,
    boundary,
    excludedDates: [...excludedDates].sort(),
    changes,
  };
}

module.exports = {
  addCalendarDays,
  buildShiftPlan,
  getDatePart,
  parseDatePart,
  replaceDatePart,
  shiftWorkdayDatePart,
  shiftWorkdayValue,
};
