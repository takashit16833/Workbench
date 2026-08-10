const {
  FuzzySuggestModal,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
} = require("obsidian");

const DATA_FOLDERS = ["Tasks", "Ideas", "Scopes"];

class ScopeSuggestModal extends FuzzySuggestModal {
  constructor(app, scopes) {
    super(app);
    this.scopes = scopes;
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
    this.done = false;
    this.setPlaceholder("Scopeを選択");
  }

  getItems() {
    return this.scopes;
  }

  getItemText(file) {
    return file.path.replace(/^Scopes\//, "").replace(/\.md$/i, "");
  }

  onChooseItem(file) {
    this.done = true;
    this.resolve(file);
  }

  onClose() {
    if (!this.done) this.resolve(null);
  }
}

class ResetConfirmModal extends Modal {
  constructor(app, title, lines) {
    super(app);
    this.title = title;
    this.lines = lines;
    this.done = false;
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.title });

    for (const line of this.lines) {
      contentEl.createEl("p", { text: line });
    }

    contentEl.createEl("p", { text: "実行するには RESET と入力してください。" });

    let value = "";
    let confirmButton;

    new Setting(contentEl)
      .setName("確認")
      .addText((text) => {
        text.setPlaceholder("RESET");
        text.onChange((next) => {
          value = next;
          if (confirmButton) confirmButton.setDisabled(value !== "RESET");
        });
        setTimeout(() => text.inputEl.focus(), 0);
      });

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText("Cancel").onClick(() => this.close());
      })
      .addButton((button) => {
        confirmButton = button;
        button
          .setButtonText("Clear")
          .setWarning()
          .setDisabled(true)
          .onClick(() => {
            if (value !== "RESET") return;
            this.done = true;
            this.resolve(true);
            this.close();
          });
      });
  }

  onClose() {
    this.contentEl.empty();
    if (!this.done) this.resolve(false);
  }
}

module.exports = class WorkbenchCommands extends Plugin {
  onload() {
    this.addCommand({
      id: "clear-scope",
      name: "Clear Scope",
      callback: () => this.clearScope(),
    });

    this.addCommand({
      id: "clear-all",
      name: "Clear All",
      callback: () => this.clearAll(),
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

  scopeValues(file) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const value = frontmatter?.scopes;
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  linkpath(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    const match = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]$/);
    return (match ? match[1] : text).replace(/\.md$/i, "");
  }

  referencesScope(file, scope) {
    return this.scopeValues(file).some((value) => {
      const linkpath = this.linkpath(value);
      if (!linkpath) return false;

      const resolved = this.app.metadataCache.getFirstLinkpathDest(linkpath, file.path);
      if (resolved) return resolved.path === scope.path;

      const scopePath = scope.path.replace(/\.md$/i, "");
      return linkpath === scopePath || linkpath === scope.basename;
    });
  }

  async chooseScope() {
    const scopes = this.scopes();
    if (scopes.length === 0) {
      new Notice("Scopeがありません。");
      return null;
    }

    const modal = new ScopeSuggestModal(this.app, scopes);
    modal.open();
    return modal.promise;
  }

  async confirm(title, lines) {
    const modal = new ResetConfirmModal(this.app, title, lines);
    modal.open();
    return modal.promise;
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

  async clearScope() {
    const scope = await this.chooseScope();
    if (!scope) return;

    const tasks = this.markdownFilesUnder("Tasks").filter((file) =>
      this.referencesScope(file, scope)
    );
    const ideas = this.markdownFilesUnder("Ideas").filter((file) =>
      this.referencesScope(file, scope)
    );

    const confirmed = await this.confirm(`Clear Scope: ${scope.basename}`, [
      `Tasks: ${tasks.length}`,
      `Ideas: ${ideas.length}`,
      "Scope: 1",
      "Notesは変更しません。",
    ]);
    if (!confirmed) return;

    const result = await this.trash([...tasks, ...ideas, scope]);
    if (result.failed.length > 0) {
      new Notice(`${result.moved}件をTrashへ移動。${result.failed.length}件失敗しました。`);
      return;
    }

    new Notice(`${result.moved}件をTrashへ移動しました。`);
  }

  async clearAll() {
    const groups = Object.fromEntries(
      DATA_FOLDERS.map((folder) => [folder, this.markdownFilesUnder(folder)])
    );

    const files = [...groups.Tasks, ...groups.Ideas, ...groups.Scopes];
    if (files.length === 0) {
      new Notice("Clear対象がありません。");
      return;
    }

    const confirmed = await this.confirm("Clear All", [
      `Tasks: ${groups.Tasks.length}`,
      `Ideas: ${groups.Ideas.length}`,
      `Scopes: ${groups.Scopes.length}`,
      "Notesは変更しません。",
    ]);
    if (!confirmed) return;

    const result = await this.trash(files);
    if (result.failed.length > 0) {
      new Notice(`${result.moved}件をTrashへ移動。${result.failed.length}件失敗しました。`);
      return;
    }

    new Notice(`${result.moved}件をTrashへ移動しました。`);
  }
};
