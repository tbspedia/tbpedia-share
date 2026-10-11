import { App, Modal, Notice, Platform, setIcon } from "obsidian";
import type TBPediaSharePlugin from "./main";
import { buildSharePackage, copyText, openBrowserComposer, shareNatively } from "./share-service";
import type { ShareContext, SharePackage, SocialPlatform } from "./types";
import { plural, t } from "./i18n";

export class ShareModal extends Modal {
  private packageToShare: SharePackage | null = null;
  private selectedPlatform: SocialPlatform | null = null;
  private partIndex = 0;

  constructor(
    app: App,
    private readonly plugin: TBPediaSharePlugin,
    private readonly context: ShareContext
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("tbpedia-share-modal");
    this.renderPlatformPicker();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderPlatformPicker(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.context.mode === "selection" ? t("modal.shareSelectedText") : t("modal.shareCurrentNote") });
    contentEl.createEl("p", {
      cls: "tbpedia-share-intro",
      text: this.context.mode === "selection"
        ? t("modal.selectionSummary", { title: this.context.title, characters: this.context.markdown.length.toLocaleString(), images: t("modal.imagesFound", { count: this.context.attachments.length, plural: plural(this.context.attachments.length) }) })
        : t("modal.noteSummary", { title: this.context.title, images: t("modal.imagesFound", { count: this.context.attachments.length, plural: plural(this.context.attachments.length) }) })
    });
    contentEl.createEl("p", {
      text: t("modal.chooseDestination")
    });

    const grid = contentEl.createDiv({ cls: "tbpedia-platform-grid" });
    const enabled = this.plugin.platforms.filter((platform) => this.plugin.settings.enabledPlatforms.includes(platform.id));
    for (const platform of enabled) {
      const button = grid.createEl("button", { cls: "tbpedia-platform-button" });
      const icon = button.createSpan({ cls: "tbpedia-platform-icon" });
      setIcon(icon, platform.icon);
      button.createSpan({ text: platform.label });
      button.addEventListener("click", () => this.selectPlatform(platform));
    }

    if (!enabled.length) {
      contentEl.createEl("p", { cls: "tbpedia-share-warning", text: t("modal.noDestinations") });
    }
  }

  private selectPlatform(platform: SocialPlatform): void {
    this.selectedPlatform = platform;
    this.packageToShare = buildSharePackage(this.app, this.context, this.plugin.settings, platform);
    this.partIndex = 0;
    this.renderSession();
  }

  private renderSession(): void {
    if (!this.selectedPlatform || !this.packageToShare) return;
    const { contentEl } = this;
    const platform = this.selectedPlatform;
    const sharePackage = this.packageToShare;
    const part = sharePackage.parts[this.partIndex];
    contentEl.empty();

    const heading = contentEl.createDiv({ cls: "tbpedia-share-heading" });
    const back = heading.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t("modal.backToDestinations") } });
    setIcon(back, "arrow-left");
    back.addEventListener("click", () => this.renderPlatformPicker());
    heading.createEl("h2", { text: t("modal.shareTo", { platform: platform.label }) });

    const summary = contentEl.createDiv({ cls: "tbpedia-share-summary" });
    summary.createSpan({ text: t("modal.partSummary", { current: this.partIndex + 1, total: sharePackage.parts.length }) });
    summary.createSpan({ text: `${part.length.toLocaleString()} / ${platform.softLimit.toLocaleString()} characters` });

    const preview = contentEl.createEl("textarea", { cls: "tbpedia-share-preview" });
    preview.value = part;
    preview.setAttr("aria-label", t("modal.formattedShareText"));
    preview.addEventListener("input", () => {
      sharePackage.parts[this.partIndex] = preview.value;
    });

    if (sharePackage.parts.length > 1) {
      contentEl.createEl("p", {
        cls: "tbpedia-share-warning",
        text: t("modal.multiPartWarning", { count: sharePackage.parts.length, platform: platform.label })
      });
    }

    if (this.partIndex === 0 && sharePackage.attachments.length) {
      const attachments = contentEl.createDiv({ cls: "tbpedia-share-attachments" });
      attachments.createEl("strong", { text: t("modal.imageAttachments", { count: sharePackage.attachments.length, plural: plural(sharePackage.attachments.length) }) });
      attachments.createEl("p", {
        text: t("modal.nativeImages")
      });
      const imageList = attachments.createDiv({ cls: "tbpedia-share-image-list" });
      for (const attachment of sharePackage.attachments) {
        const imageButton = imageList.createEl("button", { text: attachment.file.name, cls: "tbpedia-share-file" });
        imageButton.addEventListener("click", () => window.open(this.app.vault.getResourcePath(attachment.file), "_blank"));
      }
    }

    const actions = contentEl.createDiv({ cls: "tbpedia-share-actions" });
    const copy = actions.createEl("button", { text: t("modal.copyPart"), cls: "mod-cta" });
    copy.addEventListener("click", async () => {
      await copyText(sharePackage.parts[this.partIndex]);
      new Notice(t("notice.partCopied", { part: this.partIndex + 1 }));
    });

    if (Platform.isMobileApp && typeof (navigator as { share?: unknown }).share === "function") {
      const native = actions.createEl("button", { text: t("modal.shareWithApp") });
      native.addEventListener("click", async () => {
        const shared = await shareNatively(this.app, this.context, sharePackage, this.partIndex, this.plugin.settings);
        if (!shared) {
          await copyText(sharePackage.parts[this.partIndex]);
          new Notice(t("notice.shareUnavailable"));
        }
      });
    }

    if (platform.browserUrl) {
      const needsManualPaste = platform.id === "facebook" || platform.id === "telegram" || platform.id === "wechat";
      const browserLabel = needsManualPaste ? t("modal.copyOpen", { platform: platform.label }) : t("modal.open", { platform: platform.label });
      const browser = actions.createEl("button", { text: browserLabel });
      browser.addEventListener("click", async () => {
        const current = sharePackage.parts[this.partIndex];
        await copyText(current);
        const opened = openBrowserComposer(platform, current, this.context.title);
        browser.setText(t("modal.copied", { platform: platform.label }));
        window.setTimeout(() => browser.setText(browserLabel), 2500);
        if (platform.id === "facebook") {
          new Notice(opened ? t("notice.facebook") : t("notice.copiedOpen", { platform: platform.label }));
          return;
        }
        if (platform.id === "telegram") {
          new Notice(opened ? t("notice.telegram") : t("notice.copiedOpen", { platform: platform.label }));
          return;
        }
        if (platform.id === "wechat") {
          new Notice(opened ? t("notice.wechat") : t("notice.copiedOpen", { platform: platform.label }));
          return;
        }
        new Notice(opened
          ? t("notice.openedBackup", { platform: platform.label })
          : t("notice.copiedOpen", { platform: platform.label }));
      });
    }

    if (!Platform.isMobileApp) {
      const desktopHelp = t("modal.desktopHelp");
      contentEl.createEl("p", {
        cls: "tbpedia-share-desktop-help",
        text: desktopHelp
      });
    }

    if (sharePackage.parts.length > 1) {
      const navigation = contentEl.createDiv({ cls: "tbpedia-share-navigation" });
      const previous = navigation.createEl("button", { text: t("modal.previousPart") });
      previous.disabled = this.partIndex === 0;
      previous.addEventListener("click", () => {
        this.partIndex -= 1;
        this.renderSession();
      });
      const next = navigation.createEl("button", { text: t("modal.nextPart") });
      next.disabled = this.partIndex === sharePackage.parts.length - 1;
      next.addEventListener("click", () => {
        this.partIndex += 1;
        this.renderSession();
      });
    }
  }
}
