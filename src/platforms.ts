import type { SocialPlatform } from "./types";

const enc = encodeURIComponent;

export const PLATFORMS: SocialPlatform[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "message-circle",
    softLimit: 4096,
    webTextLimit: 1800,
    browserUrl: (text) => `https://wa.me/?text=${enc(text)}`,
    mobileUrl: (text) => `whatsapp://send?text=${enc(text)}`,
    mobileHint: "Open WhatsApp or its web composer"
  },
  {
    id: "x",
    label: "X",
    icon: "at-sign",
    softLimit: 280,
    webTextLimit: 280,
    browserUrl: (text) => `https://x.com/intent/tweet?text=${enc(text)}`,
    // X continues to register the legacy Twitter URL scheme on mobile.
    mobileUrl: (text) => `twitter://post?message=${enc(text)}`,
    mobileHint: "Open X with the current thread part"
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "briefcase-business",
    softLimit: 3000,
    webTextLimit: 1800,
    browserUrl: () => "https://www.linkedin.com/feed/?shareActive=true",
    // A routed deep link is required: bare `linkedin://` has no destination
    // and is ignored by many Android builds. LinkedIn has no public text-prefill
    // URL scheme, so the copied text is ready to paste.
    mobileUrl: () => "linkedin://feed/",
    mobileHint: "Open LinkedIn; the current part is copied for pasting"
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "facebook",
    softLimit: 63206,
    webTextLimit: 1800,
    browserUrl: () => "https://www.facebook.com/",
    // Best-effort composer intent. Facebook may ignore `text` on newer builds,
    // so the text is always copied before this route is opened.
    mobileUrl: (text) => `fb://composer/?text=${enc(text)}`,
    mobileHint: "Open Facebook; the current part is copied for pasting"
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "send",
    softLimit: 4096,
    webTextLimit: 0,
    browserUrl: () => "https://web.telegram.org/",
    // Android/iOS route this URL to the installed Telegram app, not Telegram Web.
    mobileUrl: (text) => `tg://msg?text=${enc(text)}`,
    mobileHint: "Open Telegram with the current part on mobile, or paste into Telegram Web on desktop"
  },
  {
    id: "line",
    label: "LINE",
    icon: "messages-square",
    softLimit: 5000,
    webTextLimit: 1800,
    browserUrl: (text) => `https://line.me/R/share?text=${enc(text)}`,
    // LINE's app scheme opens its message-share flow with the current part.
    mobileUrl: (text) => `line://msg/text/${enc(text)}`,
    mobileHint: "Open LINE's share flow with the current part"
  },
  {
    id: "email",
    label: "Email",
    icon: "mail",
    softLimit: 10000,
    webTextLimit: 1800,
    browserUrl: (text, title) => `mailto:?subject=${enc(title)}&body=${enc(text)}`,
    // `_system` delegates mailto: to the device's configured mail app.
    mobileUrl: (text, title) => `mailto:?subject=${enc(title)}&body=${enc(text)}`,
    mobileHint: "Open the default mail composer"
  },
  {
    id: "wechat",
    label: "WeChat",
    icon: "message-square-text",
    softLimit: 2000,
    webTextLimit: 0,
    browserUrl: () => "https://web.wechat.com/",
    // Open the installed app; the current part is copied and ready to paste.
    mobileUrl: () => "weixin://",
    mobileHint: "Open WeChat and paste the current part on mobile, or use WeChat Web on desktop"
  }
];

export function platformById(id: string): SocialPlatform | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}
