const { MarkdownView, Notice } = require("obsidian");
const WorkbenchCommands = require("./core");

const DASHBOARD_PATH = "Dashboard.md";
const TASKS_BASE_PATH = "Bases/Tasks.base";
const CALENDAR_BASE_PATH = "TaskNotes/Views/calendar-default.base";
const DASHBOARD_KEYS = new Set(["p", "t", "c", "k"]);

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isVisible(element) {
  if (!element) return false;
  const view = element.ownerDocument?.defaultView;
  const style = view?.getComputedStyle(element);
  if (style?.display === "none" || style?.visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

module.exports = class WorkbenchCommandsWithDashboardKeys extends WorkbenchCommands {
  onload() {
    super.onload();
    this.registerDomEvent(document, "keydown", (event) => this.handleDashboardKeydown(event));
  }

  activeDashboardPreview() {
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

    const view = this.activeDashboardPreview();
    if (!view || this.isEditableTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();

    if (key === "p") {
      void this.switchDashboardTasksView(view, "Tasks");
      return;
    }
    if (key === "t") {
      void this.switchDashboardTasksView(view, "Today");
      return;
    }
    if (key === "c") {
      void this.openDashboardLink(`${CALENDAR_BASE_PATH}#Calendar`);
      return;
    }
    if (key === "k") {
      void this.openDashboardLink(`${TASKS_BASE_PATH}#Kanban`);
    }
  }

  dashboardTasksEmbed(view) {
    const root = view.previewMode?.containerEl ?? view.containerEl;
    const embeds = [...root.querySelectorAll(".bases-embed")];
    if (embeds.length === 0) return null;

    return embeds.find((embed) => {
      const attributes = ["src", "data-path", "data-file", "data-source", "alt"]
        .map((name) => embed.getAttribute(name))
        .filter(Boolean)
        .join(" ");
      return attributes.includes("Tasks.base") || attributes.includes(TASKS_BASE_PATH);
    }) ?? embeds[0];
  }

  currentBasesViewName(embed) {
    return normalizeText(
      embed.querySelector(".bases-toolbar-views-menu .text-button-label")?.textContent
    );
  }

  findBasesViewMenuItem(documentRef, viewName) {
    const items = [...documentRef.querySelectorAll(".bases-toolbar-menu-container .bases-toolbar-menu-item")]
      .filter(isVisible);

    return items.find((item) => {
      const label = item.querySelector(".text-button-label, .menu-item-title");
      return normalizeText(label?.textContent ?? item.textContent) === viewName;
    }) ?? null;
  }

  async waitForBasesViewMenuItem(documentRef, viewName) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const item = this.findBasesViewMenuItem(documentRef, viewName);
      if (item) return item;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return null;
  }

  async switchDashboardTasksView(view, viewName) {
    const embed = this.dashboardTasksEmbed(view);
    if (!embed) {
      new Notice("DashboardのTasksビューが見つかりません。");
      return;
    }

    if (this.currentBasesViewName(embed) === viewName) return;

    const button = embed.querySelector(
      ".bases-toolbar-views-menu .text-icon-button, .bases-toolbar-views-menu button"
    );
    if (!button) {
      new Notice("Tasksのビュー切り替えボタンが見つかりません。");
      return;
    }

    button.click();
    const item = await this.waitForBasesViewMenuItem(embed.ownerDocument, viewName);
    if (!item) {
      new Notice(`${viewName}ビューが見つかりません。`);
      return;
    }
    item.click();
  }

  async openDashboardLink(linktext) {
    await this.app.workspace.openLinkText(linktext, DASHBOARD_PATH, false);
  }
};
