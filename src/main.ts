import { Editor, MarkdownView, Menu, Notice, Plugin, TFile } from "obsidian";
import { PLATFORMS } from "./platforms";
import { DEFAULT_SETTINGS, TBPediaShareSettingTab, type TBPediaShareSettings } from "./settings";
import { buildShareContext } from "./share-service";
import { ShareModal } from "./share-modal";
import type { SocialPlatform } from "./types";
import { t } from "./i18n";

export default class TBPediaSharePlugin extends Plugin {
  settings: TBPediaShareSettings = DEFAULT_SETTINGS;
  readonly platforms: SocialPlatform[] = PLATFORMS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new TBPediaShareSettingTab(this.app, this));

    this.addRibbonIcon("share-2", t("ribbon.shareCurrentNote"), () => void this.openActiveNoteShare());
    this.addCommand({
      id: "share-current-note",
      name: t("command.shareCurrentNote"),
      callback: () => void this.openActiveNoteShare()
    });
    this.addCommand({
      id: "share-selected-text",
      name: t("command.shareSelectedText"),
      callback: () => void this.openSelectedTextShare()
    });

    this.registerEvent(this.app.workspace.on("file-menu", (menu: Menu, file) => {
      if (file instanceof TFile && file.extension.toLowerCase() === "md") {
        menu.addItem((item) => item
          .setTitle(t("menu.shareNote"))
          .setIcon("share-2")
          .onClick(() => void this.openFileShare(file)));
      }
    }));

    this.registerEvent(this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view) => {
      if (view instanceof MarkdownView && view.file) {
        menu.addItem((item) => item
          .setTitle(t("menu.shareNote"))
          .setIcon("share-2")
          .onClick(() => void this.openFileShare(view.file as TFile)));
        const selectedText = editor.getSelection().trim();
        if (selectedText) {
          menu.addItem((item) => item
            .setTitle(t("menu.shareSelectedText"))
            .setIcon("quote")
            .onClick(() => void this.openFileShare(view.file as TFile, selectedText)));
        }
      }
    }));
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async openActiveNoteShare(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) {
      new Notice(t("notice.openNote"));
      return;
    }
    await this.openFileShare(view.file);
  }

  private async openSelectedTextShare(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editorSelection = view?.editor?.getSelection().trim();
    const documentSelection = window.getSelection()?.toString().trim();
    const selection = editorSelection || documentSelection;
    if (!view?.file || !selection) {
      new Notice(t("notice.selectText"));
      return;
    }
    await this.openFileShare(view.file, selection);
  }

  private async openFileShare(file: TFile, selectedText?: string): Promise<void> {
    try {
      const context = await buildShareContext(this.app, file, selectedText);
      new ShareModal(this.app, this, context).open();
    } catch (error) {
      console.error("TBPedia Share could not prepare the note", error);
      new Notice(t("notice.readFailed"));
    }
  }
}
