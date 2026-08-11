const { Modal, Notice, Setting } = require("obsidian");
const { parseDatePart } = require("./schedule-utils");
const {
  createHoliday,
  createShiftPlan,
  errorMessage,
  executeShiftPlan,
  frontmatter,
  shiftableTasksForProject,
  taskTitle,
  todayDate,
} = require("./schedule-service");

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

class CreateHolidayModal extends Modal {
  constructor(app, plugin, projects) {
    super(app);
    this.plugin = plugin;
    this.projects = projects;
    this.date = todayDate();
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
      new Setting(contentEl)
        .setName(this.plugin.projectName(project))
        .addToggle((toggle) => {
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
        button
          .setButtonText("Create")
          .setCta()
          .setDisabled(true)
          .onClick(async () => {
            const selected = this.projects.filter((project) =>
              this.selectedProjectPaths.has(project.path)
            );
            this.createButton.setDisabled(true);
            try {
              await createHoliday(this.plugin, this.date, selected);
              this.close();
            } catch (error) {
              new Notice(`Holidayの作成に失敗しました: ${errorMessage(error)}`);
              this.updateCreateButton();
            }
          });
      });

    this.updateCreateButton();
  }

  onClose() {
    this.contentEl.empty();
  }

  updateCreateButton() {
    if (!this.createButton) return;
    this.createButton.setDisabled(
      !parseDatePart(this.date) || this.selectedProjectPaths.size === 0
    );
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

  onClose() {
    this.contentEl.empty();
  }
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
    contentEl.createEl("h2", {
      text: `Shift Schedule: ${this.plugin.projectName(this.project)}`,
    });
    contentEl.createEl("p", { text: "基準Taskを選択してください。" });

    const tasks = shiftableTasksForProject(this.plugin, this.project);
    for (const file of tasks) {
      const fm = frontmatter(this.plugin, file);
      makeChoiceRow(
        contentEl,
        `${taskTitle(this.plugin, file)} (${fm.scheduled} → ${fm.due})`,
        () => {
          this.close();
          new ShiftAmountModal(this.app, this.plugin, this.project, file).open();
        }
      );
    }
  }

  onClose() {
    this.contentEl.empty();
  }
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
      text: `${this.plugin.projectName(this.project)} / ${taskTitle(this.plugin, this.baseline)}`,
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
      .addButton((button) => {
        button.setButtonText("Back").onClick(() => {
          this.close();
          new ShiftBaselineModal(this.app, this.plugin, this.project).open();
        });
      })
      .addButton((button) => {
        this.previewButton = button;
        button
          .setButtonText("Preview")
          .setCta()
          .onClick(() => {
            if (!Number.isInteger(this.amount) || this.amount === 0) return;
            try {
              const plan = createShiftPlan(
                this.plugin,
                this.project,
                this.baseline,
                this.amount
              );
              this.close();
              new ShiftPreviewModal(
                this.app,
                this.plugin,
                this.project,
                this.baseline,
                plan
              ).open();
            } catch (error) {
              new Notice(`Shiftできません: ${errorMessage(error)}`);
            }
          });
      });

    this.updatePreviewButton();
  }

  onClose() {
    this.contentEl.empty();
  }

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
      contentEl.createEl("p", {
        text: "⚠ 複数Projectに所属するTaskも変更対象に含まれています。",
      });
    }

    for (const change of this.plan.changes) {
      const item = contentEl.createEl("div");
      item.style.marginBottom = "0.8em";
      item.createEl("strong", { text: change.title });
      if (change.baseline) {
        item.createEl("div", { text: `due: ${change.oldDue} → ${change.newDue}` });
      } else {
        item.createEl("div", {
          text: `scheduled: ${change.oldScheduled} → ${change.newScheduled}`,
        });
        item.createEl("div", { text: `due: ${change.oldDue} → ${change.newDue}` });
      }
    }

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText("Back").onClick(() => {
          this.close();
          new ShiftAmountModal(this.app, this.plugin, this.project, this.baseline).open();
        });
      })
      .addButton((button) => {
        button
          .setButtonText("Shift")
          .setWarning()
          .onClick(async () => {
            button.setDisabled(true);
            const ok = await executeShiftPlan(this.plugin, this.plan);
            if (ok) this.close();
            else button.setDisabled(false);
          });
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

function openCreateHoliday(plugin) {
  const projects = plugin.projects();
  if (projects.length === 0) {
    new Notice("Projectがありません。");
    return;
  }
  new CreateHolidayModal(plugin.app, plugin, projects).open();
}

function openShiftSchedule(plugin) {
  const projects = plugin
    .projects()
    .filter((project) => shiftableTasksForProject(plugin, project).length > 0);
  if (projects.length === 0) {
    new Notice("Shift対象のProjectがありません。");
    return;
  }
  new ShiftProjectModal(plugin.app, plugin, projects).open();
}

module.exports = { openCreateHoliday, openShiftSchedule };
