import type { CachedMetadata } from "obsidian";
import type { TBPediaShareSettings } from "./settings";
import type { SocialPlatform } from "./types";

const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const wikiEmbed = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
const markdownEmbed = /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;

export interface ImageReference {
  link: string;
  alt: string;
  source: "wiki" | "markdown";
}

export function extractImageReferences(markdown: string): ImageReference[] {
  const refs: ImageReference[] = [];
  for (const match of markdown.matchAll(wikiEmbed)) {
    refs.push({ link: match[1].trim(), alt: (match[2] || match[1]).trim(), source: "wiki" });
  }
  for (const match of markdown.matchAll(markdownEmbed)) {
    refs.push({ link: match[2].trim(), alt: match[1].trim() || match[2].trim(), source: "markdown" });
  }
  return refs;
}

export function formatMarkdown(
  markdown: string,
  metadata: CachedMetadata | null,
  settings: TBPediaShareSettings,
  platform: SocialPlatform,
  title: string
): string {
  let text = markdown;
  if (settings.removeFrontmatter) text = text.replace(frontmatter, "");

  text = text
    .replace(wikiEmbed, (_match, link: string, label?: string) => `[Image: ${(label || link).trim()}]`)
    .replace(markdownEmbed, (_match, alt: string, link: string) => `[Image: ${(alt || link).trim()}]`)
    .replace(/!\[\[([^\]]+)\]\]/g, "[Attachment: $1]")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\^[-\w]+/g, "")
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/^> \[!([^\]]+)\]\s*(.*)$/gm, "$1: $2")
    .replace(/^> ?/gm, "")
    .replace(/^#{1,6}\s+(.+)$/gm, (_match, heading: string) => `${heading}\n${"—".repeat(Math.min(heading.length, 40))}`)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+] \[x\]\s+/gim, "☑ ")
    .replace(/^\s*[-*+] \[ \]\s+/gim, "☐ ")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (settings.includeTitle && title.trim()) text = `${title.trim()}\n\n${text}`;

  if (settings.includeTags && metadata?.tags?.length) {
    const tags = [...new Set(metadata.tags.map((entry) => entry.tag.replace(/^#/, "").replace(/[^\p{L}\p{N}_-]/gu, "")))]
      .filter(Boolean)
      .map((tag) => `#${tag}`)
      .join(" ");
    if (tags) text = `${text}\n\n${tags}`;
  }

  return platform.id === "email" ? text : text.replace(/\n{3,}/g, "\n\n");
}

export function splitForPlatform(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let remaining = text.trim();
  while (remaining.length > limit) {
    const candidate = remaining.slice(0, limit + 1);
    const splitAt = Math.max(
      candidate.lastIndexOf("\n\n"),
      candidate.lastIndexOf("\n"),
      candidate.lastIndexOf(". "),
      candidate.lastIndexOf(" ")
    );
    const position = splitAt > Math.floor(limit * 0.45) ? splitAt : limit;
    parts.push(remaining.slice(0, position).trim());
    remaining = remaining.slice(position).trim();
  }
  if (remaining) parts.push(remaining);
  if (parts.length === 1) return parts;

  return parts.map((part, index) => {
    const marker = `[${index + 1}/${parts.length}] `;
    return `${marker}${part.slice(0, Math.max(1, limit - marker.length))}`.trim();
  });
}
