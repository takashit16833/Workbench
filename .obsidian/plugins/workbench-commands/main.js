const {
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
} = require("obsidian");

const DATA_FOLDERS = ["Tasks", "Ideas", "Scopes"];
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

class ClearScopeModal extends Modal {
  constructor(app, plugin, scopes) {
    super(app);
    this.plugin = plugin;
    this.scopes = scopes;
  }

  onOpen() {
    this.renderScopePicker();
  }

  onClose() {
    this.contentEl.empty();
  }

  renderScopePicker() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Clear Scope" });

    for (const scope of this.scopes) {
      makeChoiceRow(contentEl, this.plugin.scopeName(scope), () =>
        this.renderModePicker(scope)
      );
    }
  }

  renderModePicker(scope) {
    const { contentEl } = this;
    contentEl.empty();

    const current = this.app.vault.getAbstractFileByPath(scope.path);
    if (!(current instanceof TFile)) {
      new Notice("Scopeが見つかりません。");
      this.close();
      return;
    }

    contentEl.createEl("h2", { text: `Clear Scope: ${this.plugin.scopeName(current)}` });

    makeChoiceRow(contentEl, "完了のみ", () => {
      const tasks = this.plugin.completedTasksForScope(current);
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

  renderConfirmation(scope, mode) {
    const { contentEl } = this;
    contentEl.empty();

    const current = this.app.vault.getAbstractFileByPath(scope.path);
    if (!(current instanceof TFile)) {
      new Notice("Scopeが見つかりません。");
      this.close();
      return;
    }

    const completedOnly = mode === "completed";
    const label = completedOnly ? "完了のみ" : "すべて";
    const { tasks, ideas } = this.plugin.filesForScope(current);
    const targetTasks = completedOnly
      ? tasks.filter((file) => this.plugin.isCompletedTask(file))
      : tasks;

    contentEl.createEl("h2", {
      text: `Clear Scope: ${this.plugin.scopeName(current)} — ${label}`,
    });
    contentEl.createEl("p", { text: `Tasks: ${targetTasks.length}` });

    if (!completedOnly) {
      contentEl.createEl("p", { text: `Ideas: ${ideas.length}` });
      contentEl.createEl("p", { text: "Scope: 1" });
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
            await this.plugin.executeClearScope(current, mode);
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
      contentEl.createEl("p", { text: `Scopes: ${groups.Scopes.length}` });
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
      id: "clear-scope",
      name: "Clear Scope",
      callback: () => this.openClearScope(),
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

  scopes() {
    return this.markdownFilesUnder("Scopes").sort((a, b) =>
      a.path.localeCompare(b.path)
    );
  }

  scopeName(file) {
    return file.path.replace(/^Scopes\//, "").replace(/\.md$/i, "");
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

  completedTasksForScope(scope) {
    return this.filesForScope(scope).tasks.filter((file) =>
      this.isCompletedTask(file)
    );
  }

  isScopesKey(key) {
    return key === "scopes" || key.startsWith("scopes.") || key.startsWith("scopes[");
  }

  normalizeLinkpath(value) {
    if (typeof value !== "string") return null;

    const text = value.trim();
    if (!text) return null;

    const wikilink = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]$/);
    const linkpath = wikilink ? wikilink[1] : text;

    return linkpath.replace(/\.md$/i, "");
  }

  matchesScopeLink(linkpath, sourcePath, scope) {
    const normalized = this.normalizeLinkpath(linkpath);
    if (!normalized) return false;

    const resolved = this.app.metadataCache.getFirstLinkpathDest(normalized, sourcePath);
    if (resolved) return resolved.path === scope.path;

    const scopePath = scope.path.replace(/\.md$/i, "");
    return normalized === scopePath || normalized === scope.basename;
  }

  frontmatterScopeLinks(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    return (cache?.frontmatterLinks ?? [])
      .filter((link) => this.isScopesKey(link.key ?? ""))
      .map((link) => link.link)
      .filter(Boolean);
  }

  flattenStrings(value) {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap((item) => this.flattenStrings(item));
    return [];
  }

  frontmatterScopeValues(file) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return this.flattenStrings(frontmatter?.scopes);
  }

  referencesScope(file, scope) {
    const cachedLinks = this.frontmatterScopeLinks(file);
    if (cachedLinks.some((link) => this.matchesScopeLink(link, file.path, scope))) {
      return true;
    }

    return this.frontmatterScopeValues(file).some((value) =>
      this.matchesScopeLink(value, file.path, scope)
    );
  }

  filesForScope(scope) {
    return {
      tasks: this.markdownFilesUnder("Tasks").filter((file) =>
        this.referencesScope(file, scope)
      ),
      ideas: this.markdownFilesUnder("Ideas").filter((file) =>
        this.referencesScope(file, scope)
      ),
    };
  }

  allClearGroups() {
    return Object.fromEntries(
      DATA_FOLDERS.map((folder) => [folder, this.markdownFilesUnder(folder)])
    );
  }

  openClearScope() {
    const scopes = this.scopes();
    if (scopes.length === 0) {
      new Notice("Scopeがありません。");
      return;
    }

    new ClearScopeModal(this.app, this, scopes).open();
  }

  openClearAll() {
    const groups = this.allClearGroups();
    const count = groups.Tasks.length + groups.Ideas.length + groups.Scopes.length;
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

  async executeClearScope(scope, mode) {
    const current = this.app.vault.getAbstractFileByPath(scope.path);
    if (!(current instanceof TFile)) {
      new Notice("Scopeが見つかりません。");
      return;
    }

    const { tasks, ideas } = this.filesForScope(current);
    const files = mode === "completed"
      ? tasks.filter((file) => this.isCompletedTask(file))
      : [...tasks, ...ideas, current];

    const result = await this.trash(files);
    this.notifyResult(result);
  }

  async executeClearAll(mode) {
    const groups = this.allClearGroups();
    const files = mode === "completed"
      ? groups.Tasks.filter((file) => this.isCompletedTask(file))
      : [...groups.Tasks, ...groups.Ideas, ...groups.Scopes];

    const result = await this.trash(files);
    this.notifyResult(result);
  }
};
