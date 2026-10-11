import { App, TFile } from "obsidian";
import type { ShareAttachment } from "./types";
import type { ImageReference } from "./markdown";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

export function isShareableImage(file: TFile): boolean {
  return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

export function resolveAttachments(app: App, source: TFile, references: ImageReference[]): ShareAttachment[] {
  const attachments: ShareAttachment[] = [];
  const seen = new Set<string>();

  for (const reference of references) {
    const cleanLink = decodeURIComponent(reference.link.split(/[?#]/, 1)[0]);
    const target = app.metadataCache.getFirstLinkpathDest(cleanLink, source.path)
      ?? app.vault.getAbstractFileByPath(cleanLink);
    if (!(target instanceof TFile) || !isShareableImage(target) || seen.has(target.path)) continue;
    seen.add(target.path);
    attachments.push({ file: target, alt: reference.alt, source: reference.source });
  }

  return attachments;
}

export async function makeNativeFiles(
  app: App,
  attachments: ShareAttachment[],
  stripMetadata: boolean
): Promise<File[]> {
  const files: File[] = [];
  for (const attachment of attachments) {
    const binary = await app.vault.readBinary(attachment.file);
    const mime = imageMimeType(attachment.file.extension);
    const source = new Blob([binary], { type: mime });
    const processed = stripMetadata && canRasterize(attachment.file.extension)
      ? await rasterize(source, mime).catch(() => source)
      : source;
    files.push(new File([processed], attachment.file.name, { type: processed.type || mime }));
  }
  return files;
}

function imageMimeType(extension: string): string {
  const normalized = extension.toLowerCase();
  if (normalized === "jpg") return "image/jpeg";
  if (normalized === "svg") return "image/svg+xml";
  return `image/${normalized}`;
}

function canRasterize(extension: string): boolean {
  return ["png", "jpg", "jpeg", "webp"].includes(extension.toLowerCase());
}

async function rasterize(source: Blob, mime: string): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const maxEdge = 2400;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return source;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const outputType = mime === "image/png" ? "image/png" : "image/jpeg";
    const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.9));
    return output ?? source;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be rendered."));
    image.src = src;
  });
}
