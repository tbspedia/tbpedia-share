import { App, Notice, Platform, TFile } from "obsidian";
import { makeNativeFiles, resolveAttachments } from "./attachments";
import { extractImageReferences, formatMarkdown, splitForPlatform } from "./markdown";
import type { TBPediaShareSettings } from "./settings";
import type { ShareContext, SharePackage, SocialPlatform } from "./types";
import { t } from "./i18n";

export async function buildShareContext(
  app: App,
  file: TFile,
  selectedText?: string
): Promise<ShareContext> {
  const selection = selectedText?.trim();
  const mode = selection ? "selection" : "note";
  const markdown = selection ?? await app.vault.read(file);
  const attachments = resolveAttachments(app, file, extractImageReferences(markdown));
  return { file, title: file.basename, markdown, attachments, mode };
}

export function buildSharePackage(
  app: App,
  context: ShareContext,
  settings: TBPediaShareSettings,
  platform: SocialPlatform
): SharePackage {
  const metadata = app.metadataCache.getFileCache(context.file);
  const text = formatMarkdown(
    context.markdown,
    metadata,
    settings,
    platform,
    context.mode === "selection" ? "" : context.title
  );
  return {
    platform,
    parts: splitForPlatform(text, platform.softLimit),
    attachments: context.attachments
  };
}

export async function copyText(text: string): Promise<void> {
  if (Platform.isDesktopApp) {
    try {
      const desktopWindow = window as typeof window & {
        require?: (moduleName: string) => { clipboard?: { writeText: (value: string) => void } };
      };
      const desktopRequire = typeof require === "function" ? require : desktopWindow.require;
      const clipboard = desktopRequire?.("electron").clipboard;
      if (clipboard) {
        clipboard.writeText(text);
        return;
      }
    } catch {
      // Fall through to the browser-compatible clipboard implementations.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

export async function shareNatively(
  app: App,
  context: ShareContext,
  packageToShare: SharePackage,
  partIndex: number,
  settings: TBPediaShareSettings
): Promise<boolean> {
  if (!navigator.share) return false;
  const attachments = partIndex === 0 ? packageToShare.attachments : [];
  const files = attachments.length
    ? await makeNativeFiles(app, attachments, settings.removeImageMetadata)
    : [];
  const payload: ShareData = {
    title: context.title,
    text: packageToShare.parts[partIndex]
  };

  if (files.length && navigator.canShare?.({ files })) payload.files = files;
  try {
    await navigator.share(payload);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    new Notice(t("notice.nativeShareFailed"));
    return false;
  }
}

export function openBrowserComposer(platform: SocialPlatform, text: string, title: string): boolean {
  if (!platform.browserUrl) return false;
  if (Platform.isMobileApp && platform.mobileUrl) {
    // `_system` asks Obsidian's mobile WebView to hand the registered URL scheme
    // to Android/iOS. In Telegram's case this opens the installed app directly.
    window.open(platform.mobileUrl(text, title), "_system");
    return true;
  }
  if (platform.webTextLimit > 0 && text.length > platform.webTextLimit) return false;
  const url = platform.browserUrl(text, title);
  if (platform.id === "whatsapp") {
    const whatsappWindow = window.open(url, "tbpedia-share-whatsapp");
    if (whatsappWindow) whatsappWindow.opener = null;
    return true;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
