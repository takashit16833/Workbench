const { Notice, TFile, stringifyYaml } = require("obsidian");
const { buildShiftPlan, getDatePart, parseDatePart } = require("./schedule-utils");

const HOLIDAY_TYPE = "holiday";
const HOLIDAY_TITLE = "休み";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function frontmatter(plugin, file) {
  return plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
}

function taskTitle(plugin, file) {
  const title = frontmatter(plugin, file).title;
  return typeof title === "string" && title.trim() ? title.trim() : file.basename;
}

function taskArchived(plugin, file) {
  return frontmatter(plugin, file).archived === true;
}

function taskType(plugin, file) {
  const type = frontmatter(plugin, file).type;
  return typeof type === "string" ? type.trim().toLowerCase() : "";
}

function isHolidayTask(plugin, file) {
  return taskType(plugin, file) === HOLIDAY_TYPE;
}

function uniqueProjectValues(plugin, file) {
  const values = plugin
    .frontmatterProjectValues(file)
    .map((value) => plugin.normalizeLinkpath(value))
    .filter(Boolean);
  return [...new Set(values)];
}

function projectLink(plugin, file) {
  return `[[${plugin.projectName(file)}]]`;
}

function todayDate() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function nowTimestamp() {
  return new Date().toISOString();
}

function holidayTaskOnDate(plugin, date) {
  return plugin.markdownFilesUnder("Tasks").find((file) => {
    if (!isHolidayTask(plugin, file)) return false;
    return getDatePart(frontmatter(plugin, file).scheduled) === date;
  });
}

function uniqueHolidayPath(plugin, date) {
  const base = `Tasks/${date} ${HOLIDAY_TITLE}`;
  let suffix = "";
  let index = 1;
  while (plugin.app.vault.getAbstractFileByPath(`${base}${suffix}.md`)) {
    index += 1;
    suffix = ` (${index})`;
  }
  return `${base}${suffix}.md`;
}

async function createHoliday(plugin, date, projects) {
  if (!parseDatePart(date)) throw new Error("日付が不正です。");
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error("Projectを1つ以上選択してください。");
  }

  const projectLinks = projects.map((project) => projectLink(plugin, project));
  const existing = holidayTaskOnDate(plugin, date);
  const timestamp = nowTimestamp();

  if (existing) {
    await plugin.app.fileManager.processFrontMatter(existing, (fm) => {
      const currentProjects = plugin.flattenStrings(fm.projects);
      fm.title = HOLIDAY_TITLE;
      fm.status = "inbox";
      fm.archived = true;
      fm.scheduled = date;
      fm.projects = [...new Set([...currentProjects, ...projectLinks])];
      fm.type = HOLIDAY_TYPE;
      fm.dateModified = timestamp;
      const tags = plugin.flattenStrings(fm.tags);
      fm.tags = [...new Set(["task", ...tags])];
    });
    new Notice(`既存の休日 ${date} にProjectを追加しました。`);
    return existing;
  }

  const path = uniqueHolidayPath(plugin, date);
  const fm = {
    title: HOLIDAY_TITLE,
    status: "inbox",
    archived: true,
    scheduled: date,
    projects: projectLinks,
    type: HOLIDAY_TYPE,
    dateCreated: timestamp,
    dateModified: timestamp,
    tags: ["task"],
  };
  const file = await plugin.app.vault.create(path, `---\n${stringifyYaml(fm)}---\n`);
  new Notice(`休日を作成しました: ${date}`);
  return file;
}

function projectHolidayDates(plugin, project) {
  return new Set(
    plugin
      .filesForProject(project)
      .tasks.filter((file) => isHolidayTask(plugin, file))
      .map((file) => getDatePart(frontmatter(plugin, file).scheduled))
      .filter(Boolean)
  );
}

function shiftableTasksForProject(plugin, project) {
  return plugin
    .filesForProject(project)
    .tasks.filter((file) => !isHolidayTask(plugin, file))
    .filter((file) => !taskArchived(plugin, file))
    .filter((file) => !plugin.isCompletedTask(file))
    .filter((file) => {
      const fm = frontmatter(plugin, file);
      return Boolean(getDatePart(fm.scheduled) && getDatePart(fm.due));
    })
    .sort((a, b) => {
      const af = frontmatter(plugin, a);
      const bf = frontmatter(plugin, b);
      return (
        String(af.scheduled).localeCompare(String(bf.scheduled)) ||
        String(af.due).localeCompare(String(bf.due)) ||
        a.path.localeCompare(b.path)
      );
    });
}

function createShiftPlan(plugin, project, baseline, amount) {
  const tasks = shiftableTasksForProject(plugin, project).map((file) => {
    const fm = frontmatter(plugin, file);
    return {
      path: file.path,
      title: taskTitle(plugin, file),
      scheduled: fm.scheduled,
      due: fm.due,
      multiProject: uniqueProjectValues(plugin, file).length > 1,
    };
  });

  const plan = buildShiftPlan(
    tasks,
    baseline.path,
    amount,
    projectHolidayDates(plugin, project)
  );

  return {
    ...plan,
    projectPath: project.path,
    baselinePath: baseline.path,
  };
}

async function executeShiftPlan(plugin, plan) {
  for (const change of plan.changes) {
    const file = plugin.app.vault.getAbstractFileByPath(change.path);
    if (!(file instanceof TFile)) {
      new Notice(`予定が変わったためShiftを中止しました: ${change.title}`);
      return false;
    }
    const fm = frontmatter(plugin, file);
    if (
      String(fm.scheduled) !== String(change.oldScheduled) ||
      String(fm.due) !== String(change.oldDue)
    ) {
      new Notice(`予定が変わったためShiftを中止しました: ${change.title}`);
      return false;
    }
  }

  const timestamp = nowTimestamp();
  try {
    for (const change of plan.changes) {
      const file = plugin.app.vault.getAbstractFileByPath(change.path);
      if (!(file instanceof TFile)) throw new Error(`${change.title} が見つかりません。`);

      await plugin.app.fileManager.processFrontMatter(file, (fm) => {
        if (!change.baseline) fm.scheduled = change.newScheduled;
        fm.due = change.newDue;
        fm.dateModified = timestamp;
      });
    }
  } catch (error) {
    console.error("Workbench shift schedule failed:", error);
    new Notice(`Shiftに失敗しました: ${errorMessage(error)}`);
    return false;
  }

  new Notice(`${plan.changes.length}件のTaskをShiftしました。`);
  return true;
}

module.exports = {
  HOLIDAY_TITLE,
  createHoliday,
  createShiftPlan,
  errorMessage,
  executeShiftPlan,
  frontmatter,
  shiftableTasksForProject,
  taskTitle,
  todayDate,
};
