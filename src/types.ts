import type { TFile } from "obsidian";

export type PlatformId =
  | "whatsapp"
  | "x"
  | "linkedin"
  | "facebook"
  | "telegram"
  | "line"
  | "email"
  | "wechat";

export interface SocialPlatform {
  id: PlatformId;
  label: string;
  icon: string;
  softLimit: number;
  webTextLimit: number;
  browserUrl?: (text: string, title: string) => string;
  /** Native URL scheme used by mobile apps when one is available. */
  mobileUrl?: (text: string, title: string) => string;
  mobileHint: string;
}

export interface ShareAttachment {
  file: TFile;
  alt: string;
  source: "wiki" | "markdown";
}

export interface ShareContext {
  file: TFile;
  title: string;
  markdown: string;
  attachments: ShareAttachment[];
  mode: "note" | "selection";
}

export interface SharePackage {
  platform: SocialPlatform;
  parts: string[];
  attachments: ShareAttachment[];
}
