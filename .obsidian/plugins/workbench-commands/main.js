const {
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
} = require("obsidian");

const DATA_FOLDERS = ["Tasks", "Ideas", "Projects"];
const COMPLETED_STATUSES = new Set(["done", "dropped"]);

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

class ClearProjectModal extends Modal {
  constructor(app, plugin, projects) {
    super(app);
    this.plugin = plugin;
    this.projects = projects;
  }

  onOpen() {
    this.renderProjectPicker();
  }

  onClose() {
    this.contentEl.empty();
  }

  renderProjectPicker() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Clear Project" });

    const unassigned = this.plugin.filesWithoutProject();
    if (unassigned.tasks.length > 0 || unassigned.ideas.length > 0) {
      makeChoiceRow(contentEl, "無所属", () => this.renderModePicker(null));
    }

    for (const project of this.projects) {
      makeChoiceRow(contentEl, this.plugin.projectName(project), () =>
        this.renderModePicker(project)
      );
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

    makeChoiceRow(contentEl, "すべて", () =>
      this.renderConfirmation(current, "all")
    );
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

    contentEl.createEl("h2", {
      text: `Clear Project: ${projectLabel} — ${label}`,
    });
    contentEl.createEl("p", { text: `Tasks: ${targetTasks.length}` });

    if (!completedOnly) {
      contentEl.createEl("p", { text: `Ideas: ${ideas.length}` });
      if (current) {
        contentEl.createEl("p", { text: "Project: 1" });
      }
    }

    contentEl.createEl("p", { text: "Notesは変更しません。" });
    contentEl.createEl("p", { text: "実行するには RESET と入力してください。" });

    let value = "";
    let clearButton;

    new Setting(contentEl)
      .setName("確認")
      .addText((text) => {
        text.setPlaceholder("RESET");
        text.onChange((next) => {
          value = next;
          if (clearButton) clearButton.setDisabled(value !== "RESET");
        });
        setTimeout(() => text.inputEl.focus(), 0);
      });

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText("Back").onClick(() => this.renderModePicker(current));
      })
      .addButton((button) => {
        clearButton = button;
        button
          .setButtonText("Clear")
          .setWarning()
          .setDisabled(true)
          .onClick(async () => {
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

  onOpen() {
    this.renderModePicker();
  }

  onClose() {
    this.contentEl.empty();
  }

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

    new Setting(contentEl)
      .setName("確認")
      .addText((text) => {
        text.setPlaceholder("RESET");
        text.onChange((next) => {
          value = next;
          if (clearButton) clearButton.setDisabled(value !== "RESET");
        });
        setTimeout(() => text.inputEl.focus(), 0);
      });

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText("Back").onClick(() => this.renderModePicker());
      })
      .addButton((button) => {
        clearButton = button;
        button
          .setButtonText("Clear")
          .setWarning()
          .setDisabled(true)
          .onClick(async () => {
            if (value !== "RESET") return;
            clearButton.setDisabled(true);
            await this.plugin.executeClearAll(mode);
            this.close();
          });
      });
  }
}

module.exports = class WorkbenchCommands extends Plugin {
  onload() {
    this.addCommand({
      id: "clear-project",
      name: "Clear Project",
      callback: () => this.openClearProject(),
    });

    this.addCommand({
      id: "clear-all",
      name: "Clear All",
      callback: () => this.openClearAll(),
    });
  }

  markdownFilesUnder(folder) {
    const prefix = `${folder}/`;
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(prefix));
  }

  projects() {
    return this.markdownFilesUnder("Projects").sort((a, b) =>
      a.path.localeCompare(b.path)
    );
  }

  projectName(file) {
    return file.path.replace(/^Projects\//, "").replace(/\.md$/i, "");
  }

  taskStatus(file) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return typeof frontmatter?.status === "string"
      ? frontmatter.status.trim().toLowerCase()
      : "";
  }

  isCompletedTask(file) {
    return COMPLETED_STATUSES.has(this.taskStatus(file));
  }

  completedTasks() {
    return this.markdownFilesUnder("Tasks").filter((file) =>
      this.isCompletedTask(file)
    );
  }

  completedTasksForProject(project) {
    return this.filesForProject(project).tasks.filter((file) =>
      this.isCompletedTask(file)
    );
  }

  completedTasksWithoutProject() {
    return this.filesWithoutProject().tasks.filter((file) =>
      this.isCompletedTask(file)
    );
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
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return this.flattenStrings(frontmatter?.projects);
  }

  hasProjectAssignment(file) {
    if (this.frontmatterProjectLinks(file).length > 0) return true;
    return this.frontmatterProjectValues(file).some((value) =>
      this.normalizeLinkpath(value) !== null
    );
  }

  referencesProject(file, project) {
    const cachedLinks = this.frontmatterProjectLinks(file);
    if (cachedLinks.some((link) => this.matchesProjectLink(link, file.path, project))) {
      return true;
    }

    return this.frontmatterProjectValues(file).some((value) =>
      this.matchesProjectLink(value, file.path, project)
    );
  }

  filesForProject(project) {
    return {
      tasks: this.markdownFilesUnder("Tasks").filter((file) =>
        this.referencesProject(file, project)
      ),
      ideas: this.markdownFilesUnder("Ideas").filter((file) =>
        this.referencesProject(file, project)
      ),
    };
  }

  filesWithoutProject() {
    return {
      tasks: this.markdownFilesUnder("Tasks").filter((file) =>
        !this.hasProjectAssignment(file)
      ),
      ideas: this.markdownFilesUnder("Ideas").filter((file) =>
        !this.hasProjectAssignment(file)
      ),
    };
  }

  allClearGroups() {
    return Object.fromEntries(
      DATA_FOLDERS.map((folder) => [folder, this.markdownFilesUnder(folder)])
    );
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

    const { tasks, ideas } = current
      ? this.filesForProject(current)
      : this.filesWithoutProject();
    const files = mode === "completed"
      ? tasks.filter((file) => this.isCompletedTask(file))
      : current
        ? [...tasks, ...ideas, current]
        : [...tasks, ...ideas];

    const result = await this.trash(files);
    this.notifyResult(result);
  }

  async executeClearAll(mode) {
    const groups = this.allClearGroups();
    const files = mode === "completed"
      ? groups.Tasks.filter((file) => this.isCompletedTask(file))
      : [...groups.Tasks, ...groups.Ideas, ...groups.Projects];

    const result = await this.trash(files);
    this.notifyResult(result);
  }
};
