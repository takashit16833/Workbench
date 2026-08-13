const {
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
  stringifyYaml,
} = require("obsidian");

const DATA_FOLDERS = ["Tasks", "Ideas", "Projects"];
const COMPLETED_STATUSES = new Set(["done", "dropped"]);
const HOLIDAY_TYPE = "holiday";
const HOLIDAY_TITLE = "休み";
const DASHBOARD_PATH = "Dashboard.md";
const TASKS_BASE_PATH = "Bases/Tasks.base";
const CALENDAR_BASE_PATH = "TaskNotes/Views/calendar-default.base";
const DASHBOARD_KEYS = new Set(["c", "k"]);

function makeChoiceRow(container, label, onChoose) {
  const row = new Setting(container).setName(label);
  row.settingEl.style.cursor = "pointer";
  row.settingEl.setAttribute("role", "button");
  row.settingEl.tabIndex = 0;
  row.settingEl.addEventListener("click", onChoose);
  row.settingEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onChoose();
  });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

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
  ) return null;
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
  if (!Number.isInteger(amount)) throw new Error("Shift amount must be an integer.");
  if (!parseDatePart(datePart)) throw new Error(`Invalid date: ${datePart}`);
  if (amount === 0) return datePart;

  const direction = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  let current = datePart;

  while (remaining > 0) {
    current = addCalendarDays(current, direction);
    if (!excludedDates.has(current)) remaining -= 1;
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
  return replaceDatePart(value, shiftWorkdayDatePart(datePart, amount, excludedDates));
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
  if (!boundary || !baselineScheduled) throw new Error("Baseline task has an invalid date.");

  const shiftedBaselineDue = shiftWorkdayValue(baseline.due, amount, excludedDates);
  const shiftedBaselineDuePart = getDatePart(shiftedBaselineDue);
  if (!shiftedBaselineDuePart || shiftedBaselineDuePart < baselineScheduled) {
    throw new Error("Shift would move the baseline due date before its scheduled date.");
  }

  const changes = [{
    path: baseline.path,
    title: baseline.title,
    multiProject: Boolean(baseline.multiProject),
    oldScheduled: baseline.scheduled,
    newScheduled: baseline.scheduled,
    oldDue: baseline.due,
    newDue: shiftedBaselineDue,
    baseline: true,
  }];

  const following = tasks
    .filter((task) => task.path !== baseline.path)
    .filter((task) => {
      const scheduled = getDatePart(task.scheduled);
      return scheduled && scheduled >= boundary;
    })
    .sort((a, b) => {
      const as = getDatePart(a.scheduled) || "";
      const bs = getDatePart(b.scheduled) || "";
      return as.localeCompare(bs) || a.path.localeCompare(b.path);
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

  return { amount, boundary, excludedDates: [...excludedDates].sort(), changes };
}

class ClearProjectModal extends Modal {
  constructor(app, plugin, projects) {
    super(app);
    this.plugin = plugin;
    this.projects = projects;
  }

  onOpen() { this.renderProjectPicker(); }
  onClose() { this.contentEl.empty(); }

  renderProjectPicker() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Clear Project" });

    const unassigned = this.plugin.filesWithoutProject();
    if (unassigned.tasks.length > 0 || unassigned.ideas.length > 0) {
      makeChoiceRow(contentEl, "無所属", () => this.renderModePicker(null));
    }

    for (const project of this.projects) {
      makeChoiceRow(contentEl, this.plugin.projectName(project), () => this.renderModePicker(project));
    }
  }

  resolveProject(project) {
    if (!project) return null;
    const current = this.app.vault.getAbstractFileByPath(project.path);
    if (!(current instanceof TFile)) {
      new Notice("Projectが見つかりません。");
      this.close();
      return undefined;
    }
    return current;
  }

  renderModePicker(project) {
    const { contentEl } = this;
    contentEl.empty();
    const current = this.resolveProject(project);
    if (current === undefined) return;
    const projectLabel = current ? this.plugin.projectName(current) : "無所属";
    contentEl.createEl("h2", { text: `Clear Project: ${projectLabel}` });

    makeChoiceRow(contentEl, "完了のみ", () => {
      const tasks = current
        ? this.plugin.completedTasksForProject(current)
        : this.plugin.completedTasksWithoutProject();
      if (tasks.length === 0) {
        new Notice("完了済みTaskがありません。");
        return;
      }
      this.renderConfirmation(current, "completed");
    });

    makeChoiceRow(contentEl, "すべて", () => this.renderConfirmation(current, "all"));
  }

  renderConfirmation(project, mode) {
    const { contentEl } = this;
    contentEl.empty();
    const current = this.resolveProject(project);
    if (current === undefined) return;

    const completedOnly = mode === "completed";
    const label = completedOnly ? "完了のみ" : "すべて";
    const projectLabel = current ? this.plugin.projectName(current) : "無所属";
    const { tasks, ideas } = current
      ? this.plugin.filesForProject(current)
      : this.plugin.filesWithoutProject();
    const targetTasks = completedOnly
      ? tasks.filter((file) => this.plugin.isCompletedTask(file))
      : tasks;

    contentEl.createEl("h2", { text: `Clear Project: ${projectLabel} — ${label}` });
    contentEl.createEl("p", { text: `Tasks: ${targetTasks.length}` });
    if (!completedOnly) {
      contentEl.createEl("p", { text: `Ideas: ${ideas.length}` });
      if (current) contentEl.createEl("p", { text: "Project: 1" });
    }
    contentEl.createEl("p", { text: "Notesは変更しません。" });
    contentEl.createEl("p", { text: "実行するには RESET と入力してください。" });

    let value = "";
    let clearButton;
    new Setting(contentEl).setName("確認").addText((text) => {
      text.setPlaceholder("RESET");
      text.onChange((next) => {
        value = next;
        if (clearButton) clearButton.setDisabled(value !== "RESET");
      });
      setTimeout(() => text.inputEl.focus(), 0);
    });

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Back").onClick(() => this.renderModePicker(current)))
      .addButton((button) => {
        clearButton = button;
        button.setButtonText("Clear").setWarning().setDisabled(true).onClick(async () => {
          if (value !== "RESET") return;
          clearButton.setDisabled(true);
          await this.plugin.executeClearProject(current, mode);
          this.close();
        });
      });
  }
}

class ClearAllModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() { this.renderModePicker(); }
  onClose() { this.contentEl.empty(); }

  renderModePicker() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Clear All" });

    makeChoiceRow(contentEl, "完了のみ", () => {
      const tasks = this.plugin.completedTasks();
      if (tasks.length === 0) {
        new Notice("完了済みTaskがありません。");
        return;
      }
      this.renderConfirmation("completed");
    });

    makeChoiceRow(contentEl, "すべて", () => this.renderConfirmation("all"));
  }

  renderConfirmation(mode) {
    const { contentEl } = this;
    contentEl.empty();
    const completedOnly = mode === "completed";
    const label = completedOnly ? "完了のみ" : "すべて";
    const groups = this.plugin.allClearGroups();
    const targetTasks = completedOnly
      ? groups.Tasks.filter((file) => this.plugin.isCompletedTask(file))
      : groups.Tasks;

    contentEl.createEl("h2", { text: `Clear All — ${label}` });
    contentEl.createEl("p", { text: `Tasks: ${targetTasks.length}` });
    if (!completedOnly) {
      contentEl.createEl("p", { text: `Ideas: ${groups.Ideas.length}` });
      contentEl.createEl("p", { text: `Projects: ${groups.Projects.length}` });
    }
    contentEl.createEl("p", { text: "Notesは変更しません。" });
    contentEl.createEl("p", { text: "実行するには RESET と入力してください。" });

    let value = "";
    let clearButton;
    new Setting(contentEl).setName("確認").addText((text) => {
      text.setPlaceholder("RESET");
      text.onChange((next) => {
        value = next;
        if (clearButton) clearButton.setDisabled(value !== "RESET");
      });
      setTimeout(() => text.inputEl.focus(), 0);
    });

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Back").onClick(() => this.renderModePicker()))
      .addButton((button) => {
        clearButton = button;
        button.setButtonText("Clear").setWarning().setDisabled(true).onClick(async () => {
          if (value !== "RESET") return;
          clearButton.setDisabled(true);
          await this.plugin.executeClearAll(mode);
          this.close();
        });
      });
  }
}

class CreateHolidayModal extends Modal {
  constructor(app, plugin, projects) {
    super(app);
    this.plugin = plugin;
    this.projects = projects;
    this.date = plugin.todayDate();
    this.selectedProjectPaths = new Set();
    this.createButton = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Create Holiday" });

    new Setting(contentEl).setName("日付").addText((text) => {
      text.inputEl.type = "date";
      text.setValue(this.date);
      text.onChange((value) => {
        this.date = value.trim();
        this.updateCreateButton();
      });
    });

    contentEl.createEl("h3", { text: "対象Project" });
    for (const project of this.projects) {
      new Setting(contentEl).setName(this.plugin.projectName(project)).addToggle((toggle) => {
        toggle.onChange((enabled) => {
          if (enabled) this.selectedProjectPaths.add(project.path);
          else this.selectedProjectPaths.delete(project.path);
          this.updateCreateButton();
        });
      });
    }

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => {
        this.createButton = button;
        button.setButtonText("Create").setCta().setDisabled(true).onClick(async () => {
          const selected = this.projects.filter((project) => this.selectedProjectPaths.has(project.path));
          this.createButton.setDisabled(true);
          try {
            await this.plugin.createHoliday(this.date, selected);
            this.close();
          } catch (error) {
            new Notice(`Holidayの作成に失敗しました: ${errorMessage(error)}`);
            this.updateCreateButton();
          }
        });
      });

    this.updateCreateButton();
  }

  onClose() { this.contentEl.empty(); }

  updateCreateButton() {
    if (!this.createButton) return;
    this.createButton.setDisabled(!parseDatePart(this.date) || this.selectedProjectPaths.size === 0);
  }
}

class ShiftProjectModal extends Modal {
  constructor(app, plugin, projects) {
    super(app);
    this.plugin = plugin;
    this.projects = projects;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Shift Schedule" });
    contentEl.createEl("p", { text: "Projectを選択してください。" });

    for (const project of this.projects) {
      makeChoiceRow(contentEl, this.plugin.projectName(project), () => {
        this.close();
        new ShiftBaselineModal(this.app, this.plugin, project).open();
      });
    }
  }

  onClose() { this.contentEl.empty(); }
}

class ShiftBaselineModal extends Modal {
  constructor(app, plugin, project) {
    super(app);
    this.plugin = plugin;
    this.project = project;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Shift Schedule: ${this.plugin.projectName(this.project)}` });
    contentEl.createEl("p", { text: "基準Taskを選択してください。" });

    const tasks = this.plugin.shiftableTasksForProject(this.project);
    for (const file of tasks) {
      const fm = this.plugin.frontmatter(file);
      makeChoiceRow(contentEl, `${this.plugin.taskTitle(file)} (${fm.scheduled} → ${fm.due})`, () => {
        this.close();
        new ShiftAmountModal(this.app, this.plugin, this.project, file).open();
      });
    }
  }

  onClose() { this.contentEl.empty(); }
}

class ShiftAmountModal extends Modal {
  constructor(app, plugin, project, baseline) {
    super(app);
    this.plugin = plugin;
    this.project = project;
    this.baseline = baseline;
    this.amount = 1;
    this.previewButton = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Shift Schedule" });
    contentEl.createEl("p", {
      text: `${this.plugin.projectName(this.project)} / ${this.plugin.taskTitle(this.baseline)}`,
    });

    new Setting(contentEl)
      .setName("移動するworkday数")
      .setDesc("後ろへは正数、前倒しは負数。0は指定できません。")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.step = "1";
        text.setValue("1");
        text.onChange((value) => {
          this.amount = Number(value);
          this.updatePreviewButton();
        });
        setTimeout(() => text.inputEl.focus(), 0);
      });

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Back").onClick(() => {
        this.close();
        new ShiftBaselineModal(this.app, this.plugin, this.project).open();
      }))
      .addButton((button) => {
        this.previewButton = button;
        button.setButtonText("Preview").setCta().onClick(() => {
          if (!Number.isInteger(this.amount) || this.amount === 0) return;
          try {
            const plan = this.plugin.createShiftPlan(this.project, this.baseline, this.amount);
            this.close();
            new ShiftPreviewModal(this.app, this.plugin, this.project, file).open();
          } catch (error) {
            new Notice(`Shiftできません: ${errorMessage(error)}`);
          }
        });
      });

    this.updatePreviewButton();
  }

  onClose() { this.contentEl.empty(); }

  updatePreviewButton() {
    if (!this.previewButton) return;
    this.previewButton.setDisabled(!Number.isInteger(this.amount) || this.amount === 0);
  }
}

class ShiftPreviewModal extends Modal {
  constructor(app, plugin, project, baseline, plan) {
    super(app);
    this.plugin = plugin;
    this.project = project;
    this.baseline = baseline;
    this.plan = plan;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const sign = this.plan.amount > 0 ? "+" : "";
    contentEl.createEl("h2", { text: "Shift Schedule Preview" });
    contentEl.createEl("p", {
      text: `${this.plugin.projectName(this.project)} / ${sign}${this.plan.amount} workday`,
    });

    if (this.plan.excludedDates.length > 0) {
      contentEl.createEl("p", { text: `休日: ${this.plan.excludedDates.join(", ")}` });
    }
    if (this.plan.changes.some((change) => change.multiProject)) {
      contentEl.createEl("p", { text: "⚠ 複数Projectに所属するTaskも変更対象に含まれています。" });
    }

    for (const change of this.plan.changes) {
      const item = contentEl.createEl("div");
      item.style.marginBottom = "0.8em";
      item.createEl("strong", { text: change.title });
      if (change.baseline) {
        item.createEl("div", { text: `due: ${change.oldDue} → ${change.newDue}` });
      } else {
        item.createEl("div", { text: `scheduled: ${change.oldScheduled} → ${change.newScheduled}` });
        item.createEl("div", { text: `due: ${change.oldDue} → ${change.newDue}` });
      }
    }

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("Back").onClick(() => {
        this.close();
        new ShiftAmountModal(this.app, this.plugin, this.project, this.baseline).open();
      }))
      .addButton((button) => button.setButtonText("Shift").setWarning().onClick(async () => {
        button.setDisabled(true);
        const ok = await this.plugin.executeShiftPlan(this.plan);
        if (ok) this.close();
        else button.setDisabled(false);
      }));
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = class WorkbenchCommands extends Plugin {
  onload() {
    this.addCommand({ id: "clear-project", name: "Clear Project", callback: () => this.openClearProject() });
    this.addCommand({ id: "clear-all", name: "Clear All", callback: () => this.openClearAll() });
    this.addCommand({ id: "create-holiday", name: "Create Holiday", callback: () => this.openCreateHoliday() });
    this.addCommand({ id: "shift-schedule", name: "Shift Schedule", callback: () => this.openShiftSchedule() });
    this.registerDomEvent(document, "keydown", (event) => this.handleDashboardKeydown(event));
  }

  activeDashboardReadingView() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== DASHBOARD_PATH || view.getMode() !== "preview") return null;
    return view;
  }

  isEditableTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable=''], .cm-editor"));
  }

  handleDashboardKeydown(event) {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) return;

    const key = event.key.toLowerCase();
    if (!DASHBOARD_KEYS.has(key)) return;

    const view = this.activeDashboardReadingView();
    if (!view || this.isEditableTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();

    if (key === "c") {
      void this.app.workspace.openLinkText(`${CALENDAR_BASE_PATH}#Calendar`, DASHBOARD_PATH, false);
      return;
    }
    if (key === "k") {
      void this.app.workspace.openLinkText(`${TASKS_BASE_PATH}#Kanban`, DASHBOARD_PATH, false);
    }
  }

  markdownFilesUnder(folder) {
    const prefix = `${folder}/`;
    return this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix));
  }

  projects() {
    return this.markdownFilesUnder("Projects").sort((a, b) => a.path.localeCompare(b.path));
  }

  projectName(file) {
    return file.path.replace(/^Projects\//, "").replace(/\.md$/i, "");
  }

  frontmatter(file) {
    return this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  }

  taskStatus(file) {
    const status = this.frontmatter(file).status;
    return typeof status === "string" ? status.trim().toLowerCase() : "";
  }

  isCompletedTask(file) { return COMPLETED_STATUSES.has(this.taskStatus(file)); }
  completedTasks() { return this.markdownFilesUnder("Tasks").filter((file) => this.isCompletedTask(file)); }

  completedTasksForProject(project) {
    return this.filesForProject(project).tasks.filter((file) => this.isCompletedTask(file));
  }

  completedTasksWithoutProject() {
    return this.filesWithoutProject().tasks.filter((file) => this.isCompletedTask(file));
  }

  isProjectsKey(key) {
    return key === "projects" || key.startsWith("projects.") || key.startsWith("projects[");
  }

  normalizeLinkpath(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (!text) return null;
    const wikilink = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]$/);
    const linkpath = wikilink ? wikilink[1] : text;
    return linkpath.replace(/\.md$/i, "");
  }

  matchesProjectLink(linkpath, sourcePath, project) {
    const normalized = this.normalizeLinkpath(linkpath);
    if (!normalized) return false;
    const resolved = this.app.metadataCache.getFirstLinkpathDest(normalized, sourcePath);
    if (resolved) return resolved.path === project.path;
    const projectPath = project.path.replace(/\.md$/i, "");
    return normalized === projectPath || normalized === project.basename;
  }

  frontmatterProjectLinks(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    return (cache?.frontmatterLinks ?? [])
      .filter((link) => this.isProjectsKey(link.key ?? ""))
      .map((link) => link.link)
      .filter(Boolean);
  }

  flattenStrings(value) {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap((item) => this.flattenStrings(item));
    return [];
  }

  frontmatterProjectValues(file) {
    return this.flattenStrings(this.frontmatter(file).projects);
  }

  hasProjectAssignment(file) {
    if (this.frontmatterProjectLinks(file).length > 0) return true;
    return this.frontmatterProjectValues(file).some((value) => this.normalizeLinkpath(value) !== null);
  }

  referencesProject(file, project) {
    const cachedLinks = this.frontmatterProjectLinks(file);
    if (cachedLinks.some((link) => this.matchesProjectLink(link, file.path, project))) return true;
    return this.frontmatterProjectValues(file).some((value) => this.matchesProjectLink(value, file.path, project));
  }

  filesForProject(project) {
    return {
      tasks: this.markdownFilesUnder("Tasks").filter((file) => this.referencesProject(file, project)),
      ideas: this.markdownFilesUnder("Ideas").filter((file) => this.referencesProject(file, project)),
    };
  }

  filesWithoutProject() {
    return {
      tasks: this.markdownFilesUnder("Tasks").filter((file) => !this.hasProjectAssignment(file)),
      ideas: this.markdownFilesUnder("Ideas").filter((file) => !this.hasProjectAssignment(file)),
    };
  }

  allClearGroups() {
    return Object.fromEntries(DATA_FOLDERS.map((folder) => [folder, this.markdownFilesUnder(folder)]));
  }

  openClearProject() {
    const projects = this.projects();
    const unassigned = this.filesWithoutProject();
    const hasUnassigned = unassigned.tasks.length > 0 || unassigned.ideas.length > 0;
    if (projects.length === 0 && !hasUnassigned) {
      new Notice("Clear対象がありません。");
      return;
    }
    new ClearProjectModal(this.app, this, projects).open();
  }

  openClearAll() {
    const groups = this.allClearGroups();
    const count = groups.Tasks.length + groups.Ideas.length + groups.Projects.length;
    if (count === 0) {
      new Notice("Clear対象がありません。");
      return;
    }
    new ClearAllModal(this.app, this).open();
  }

  async trash(files) {
    let moved = 0;
    const failed = [];
    for (const file of files) {
      const current = this.app.vault.getAbstractFileByPath(file.path);
      if (!(current instanceof TFile)) continue;
      try {
        await this.app.fileManager.trashFile(current);
        moved += 1;
      } catch (error) {
        failed.push(file.path);
        console.error("Workbench clear failed:", file.path, error);
      }
    }
    return { moved, failed };
  }

  notifyResult(result) {
    if (result.failed.length > 0) {
      new Notice(`${result.moved}件をTrashへ移動。${result.failed.length}件失敗しました。`);
      return;
    }
    new Notice(`${result.moved}件をTrashへ移動しました。`);
  }

  async executeClearProject(project, mode) {
    let current = null;
    if (project) {
      current = this.app.vault.getAbstractFileByPath(project.path);
      if (!(current instanceof TFile)) {
        new Notice("Projectが見つかりません。");
        return;
      }
    }

    if (!current) {
      const { tasks, ideas } = this.filesWithoutProject();
      const files = mode === "completed"
        ? tasks.filter((file) => this.isCompletedTask(file))
        : [...tasks, ...ideas];
      this.notifyResult(await this.trash(files));
      return;
    }

    const { tasks, ideas } = this.filesForProject(current);
    const targetTasks = mode === "completed"
      ? tasks.filter((file) => this.isCompletedTask(file))
      : tasks;
    const targetIdeas = mode === "completed" ? [] : ideas;
    const unlinkActions = [];
    const trashFiles = [];

    for (const file of [...targetTasks, ...targetIdeas]) {
      const remainingProjects = this.frontmatterProjectValues(file).filter((value) =>
        this.normalizeLinkpath(value) !== null &&
        !this.matchesProjectLink(value, file.path, current)
      );

      if (remainingProjects.length > 0) {
        unlinkActions.push({ file, remainingProjects });
      } else {
        trashFiles.push(file);
      }
    }

    let unlinked = 0;
    const unlinkFailed = [];
    for (const action of unlinkActions) {
      const file = this.app.vault.getAbstractFileByPath(action.file.path);
      if (!(file instanceof TFile)) {
        unlinkFailed.push(action.file.path);
        continue;
      }

      try {
        await this.app.fileManager.processFrontMatter(file, (fm) => {
          fm.projects = action.remainingProjects;
        });
        unlinked += 1;
      } catch (error) {
        unlinkFailed.push(action.file.path);
        console.error("Workbench project unlink failed:", action.file.path, error);
      }
    }

    if (unlinkFailed.length > 0) {
      new Notice(
        `${unlinked}件のProject紐付けを解除。${unlinkFailed.length}件失敗したためProjectは保持しました。`
      );
      return;
    }

    const entityResult = await this.trash(trashFiles);
    if (entityResult.failed.length > 0) {
      new Notice(
        `${entityResult.moved}件をTrashへ移動、${unlinked}件のProject紐付けを解除。` +
        `${entityResult.failed.length}件失敗したためProjectは保持しました。`
      );
      return;
    }

    let projectMoved = 0;
    if (mode === "all") {
      const projectResult = await this.trash([current]);
      projectMoved = projectResult.moved;
      if (projectResult.failed.length > 0) {
        new Notice(
          `${entityResult.moved}件をTrashへ移動、${unlinked}件のProject紐付けを解除。` +
          "ProjectのTrashに失敗しました。"
        );
        return;
      }
    }

    new Notice(
      `${entityResult.moved + projectMoved}件をTrashへ移動、` +
      `${unlinked}件のProject紐付けを解除しました。`
    );
  }

  async executeClearAll(mode) {
    const groups = this.allClearGroups();
    const files = mode === "completed"
      ? groups.Tasks.filter((file) => this.isCompletedTask(file))
      : [...groups.Tasks, ...groups.Ideas, ...groups.Projects];
    this.notifyResult(await this.trash(files));
  }

  taskTitle(file) {
    const title = this.frontmatter(file).title;
    return typeof title === "string" && title.trim() ? title.trim() : file.basename;
  }

  taskArchived(file) { return this.frontmatter(file).archived === true; }

  taskType(file) {
    const type = this.frontmatter(file).type;
    return typeof type === "string" ? type.trim().toLowerCase() : "";
  }

  isHolidayTask(file) { return this.taskType(file) === HOLIDAY_TYPE; }

  uniqueProjectValues(file) {
    const values = this.frontmatterProjectValues(file)
      .map((value) => this.normalizeLinkpath(value))
      .filter(Boolean);
    return [...new Set(values)];
  }

  projectLink(file) { return `[[${this.projectName(file)}]]`; }

  todayDate() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  nowTimestamp() { return new Date().toISOString(); }

  holidayTaskOnDate(date) {
    return this.markdownFilesUnder("Tasks").find((file) =>
      this.isHolidayTask(file) && getDatePart(this.frontmatter(file).scheduled) === date
    );
  }

  uniqueHolidayPath(date) {
    const base = `Tasks/${date} ${HOLIDAY_TITLE}`;
    let suffix = "";
    let index = 1;
    while (this.app.vault.getAbstractFileByPath(`${base}${suffix}.md`)) {
      index += 1;
      suffix = ` (${index})`;
    }
    return `${base}${suffix}.md`;
  }

  async createHoliday(date, projects) {
    if (!parseDatePart(date)) throw new Error("日付が不正です。");
    if (!Array.isArray(projects) || projects.length === 0) {
      throw new Error("Projectを1つ以上選択してください。");
    }

    const projectLinks = projects.map((project) => this.projectLink(project));
    const existing = this.holidayTaskOnDate(date);
    const timestamp = this.nowTimestamp();

    if (existing) {
      await this.app.fileManager.processFrontMatter(existing, (fm) => {
        const currentProjects = this.flattenStrings(fm.projects);
        fm.title = HOLIDAY_TITLE;
        fm.status = "inbox";
        fm.archived = true;
        fm.scheduled = date;
        fm.projects = [...new Set([...currentProjects, ...projectLinks])];
        fm.type = HOLIDAY_TYPE;
        fm.dateModified = timestamp;
        fm.tags = [...new Set(["task", ...this.flattenStrings(fm.tags)])];
      });
      new Notice(`既存の休日 ${date} にProjectを追加しました。`);
      return existing;
    }

    const path = this.uniqueHolidayPath(date);
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
    const file = await this.app.vault.create(path, `---\n${stringifyYaml(fm)}---\n`);
    new Notice(`休日を作成しました: ${date}`);
    return file;
  }

  projectHolidayDates(project) {
    return new Set(
      this.filesForProject(project).tasks
        .filter((file) => this.isHolidayTask(file))
        .map((file) => getDatePart(this.frontmatter(file).scheduled))
        .filter(Boolean)
    );
  }

  shiftableTasksForProject(project) {
    return this.filesForProject(project).tasks
      .filter((file) => !this.isHolidayTask(file))
      .filter((file) => !this.taskArchived(file))
      .filter((file) => !this.isCompletedTask(file))
      .filter((file) => {
        const fm = this.frontmatter(file);
        return Boolean(getDatePart(fm.scheduled) && getDatePart(fm.due));
      })
      .sort((a, b) => {
        const af = this.frontmatter(a);
        const bf = this.frontmatter(b);
        return String(af.scheduled).localeCompare(String(bf.scheduled)) ||
          String(af.due).localeCompare(String(bf.due)) ||
          a.path.localeCompare(b.path);
      });
  }

  createShiftPlan(project, baseline, amount) {
    const tasks = this.shiftableTasksForProject(project).map((file) => {
      const fm = this.frontmatter(file);
      return {
        path: file.path,
        title: this.taskTitle(file),
        scheduled: fm.scheduled,
        due: fm.due,
        multiProject: this.uniqueProjectValues(file).length > 1,
      };
    });

    const plan = buildShiftPlan(tasks, baseline.path, amount, this.projectHolidayDates(project));
    return { ...plan, projectPath: project.path, baselinePath: baseline.path };
  }

  async executeShiftPlan(plan) {
    for (const change of plan.changes) {
      const file = this.app.vault.getAbstractFileByPath(change.path);
      if (!(file instanceof TFile)) {
        new Notice(`予定が変わったためShiftを中止しました: ${change.title}`);
        return false;
      }
      const fm = this.frontmatter(file);
      if (String(fm.scheduled) !== String(change.oldScheduled) || String(fm.due) !== String(change.oldDue)) {
        new Notice(`予定が変わったためShiftを中止しました: ${change.title}`);
        return false;
      }
    }

    const timestamp = this.nowTimestamp();
    try {
      for (const change of plan.changes) {
        const file = this.app.vault.getAbstractFileByPath(change.path);
        if (!(file instanceof TFile)) throw new Error(`${change.title} が見つかりません。`);
        await this.app.fileManager.processFrontMatter(file, (fm) => {
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

  openCreateHoliday() {
    const projects = this.projects();
    if (projects.length === 0) {
      new Notice("Projectがありません。");
      return;
    }
    new CreateHolidayModal(this.app, this, projects).open();
  }

  openShiftSchedule() {
    const projects = this.projects().filter((project) => this.shiftableTasksForProject(project).length > 0);
    if (projects.length === 0) {
      new Notice("Shift対象のProjectがありません。");
      return;
    }
    new ShiftProjectModal(this.app, this, projects).open();
  }
};
