# TBPedia Share — Design Specification

## Purpose

TBPedia Share is an Obsidian plugin that prepares the current Markdown note, or a selected portion of it, for sharing through social and messaging applications. It keeps the source note untouched and does not send content until the user explicitly chooses a share action.

The plugin supports WhatsApp, X, LinkedIn, Facebook, Telegram, LINE, Email, and WeChat. It works on Obsidian desktop and mobile, using browser composers on desktop and native app URL schemes where available on mobile.

## Design principles

- **User-controlled sharing:** content is only copied, opened, or sent after an explicit action.
- **Local-first:** notes are read from the active vault; there is no plugin service, account, or remote storage.
- **Reliable fallback:** share text is copied before a composer/app is opened, so the user can paste it if an external application cannot accept prefilled text.
- **Platform-aware:** each destination has its own length limit, browser URL, and optional native mobile route.
- **Obsidian-native language selection:** interface text follows Obsidian’s configured language through `getLanguage()`.

## High-level architecture

```text
Obsidian command / ribbon / context menu
                 │
                 ▼
             main.ts
                 │ builds context
                 ▼
          share-service.ts ─────► attachments.ts
                 │                     │
                 │                     ▼
                 │                vault image files
                 ▼
          share-modal.ts
           │          │
           │          └────────► platforms.ts
           ▼                         │
      markdown.ts                     ▼
  formatting and splitting      browser/native app route
           │
           ▼
         i18n.ts
```

## Components

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Plugin lifecycle, Obsidian commands, ribbon action, and file/editor context menus. |
| `src/share-modal.ts` | Two-stage sharing UI: choose a platform, then review/copy/open each prepared message part. |
| `src/share-service.ts` | Creates sharing context/packages, handles clipboard access, invokes the native share sheet, and opens external composers. |
| `src/markdown.ts` | Converts Obsidian-flavoured Markdown to portable text, extracts image embeds, and splits long messages within platform limits. |
| `src/attachments.ts` | Resolves local image embeds and optionally creates metadata-stripped raster copies for native sharing. |
| `src/platforms.ts` | Platform registry: display label, icons, character limits, browser URLs, and mobile deep links. |
| `src/settings.ts` | Persistent user options and settings screen. |
| `src/i18n.ts` | Language detection, translated message catalogues, locale aliases, and interpolation. |
| `src/types.ts` | Shared TypeScript domain types. |

## Sharing lifecycle

1. The user starts sharing from the ribbon, command palette, file context menu, or editor context menu.
2. `main.ts` identifies the active Markdown file and optional selected text.
3. `buildShareContext()` reads the source text and resolves image embeds relative to that note.
4. `ShareModal` lists the destinations enabled in settings.
5. When the user chooses a destination, `buildSharePackage()` formats the Markdown and splits it according to that platform’s soft character limit.
6. The user can edit the preview, copy the current part, open a destination, use the mobile system share sheet, or navigate through additional parts.
7. Copying happens before an external application is opened, providing a dependable paste fallback.

## Markdown and attachment processing

The formatter removes or simplifies Obsidian-specific syntax for better portability:

- optional YAML frontmatter removal;
- wiki links converted to readable labels;
- image embeds represented in text while their local files are separately resolved;
- comments, block identifiers, Markdown emphasis, and heading markup simplified;
- task list and list markers converted to portable symbols.

Long content is split on paragraph, line, sentence, or word boundaries where possible. Multi-part content receives a `[part/total]` prefix while remaining within the selected platform limit.

Supported image types are PNG, JPEG, WebP, GIF, and SVG. For native mobile sharing, raster image attachments can be rendered onto a canvas to remove embedded camera metadata such as GPS data. SVG and GIF assets are preserved rather than rasterized.

## Platform delivery behavior

| Platform | Desktop | Mobile |
| --- | --- | --- |
| WhatsApp | WhatsApp web composer | Native `whatsapp://send` message composer |
| X | X web intent | Native Twitter/X post route |
| LinkedIn | LinkedIn feed composer | Routed LinkedIn app deep link; text is copied for paste |
| Facebook | Facebook website | Facebook composer deep link; copied text remains the fallback |
| Telegram | Telegram Web | Native Telegram message route with text |
| LINE | LINE web share URL | Native LINE message share route with text |
| Email | `mailto:` composer | Device default mail app with subject and body |
| WeChat | WeChat Web | Native WeChat launch; copied text is pasted manually |

External applications ultimately control whether deep-link parameters are accepted. The plugin therefore treats clipboard copying as the guaranteed delivery path and external opening as a convenience.

## Settings

Settings are persisted using Obsidian plugin data storage.

- **Enabled platforms:** controls which destinations appear in the modal.
- **Include note title:** prepends the active note title to full-note sharing.
- **Include tags:** appends compatible tags as hashtags.
- **Remove frontmatter:** omits YAML properties from prepared text.
- **Strip image metadata:** uses a canvas-rendered image copy for native sharing where supported.

## Localization

`i18n.ts` uses Obsidian’s `getLanguage()` API. It does not add a separate language setting, which ensures the plugin follows the rest of the Obsidian interface.

Supported locale identifiers are:

```text
ja, en, fr, es, de, nl, sv, ko, zh-TW, zh-CN, vi, id, th, bo
```

Locale aliases are normalized before look-up:

- `zh-Hant` → `zh-TW`
- `zh-Hans` and generic `zh` → `zh-CN`
- `bo-Tibt` and `bo-CN` → `bo`

Each UI string uses a message key and optional `{{variable}}` interpolation. English is the safe fallback for an unavailable message key. New UI text must be added to the `MessageKey` union, the English base catalogue, and every locale catalogue before use.

## Privacy and security

- The plugin has no network client or remote backend.
- Notes and attachments remain in the vault until the user invokes an external share action.
- Browser composers and app deep links are only opened after a click.
- Clipboard copying is intentional and visible in the UI.
- Metadata removal is best-effort and limited to supported raster image formats.

## Build and verification

```powershell
pnpm run check
pnpm run build
```

`check` runs TypeScript validation. `build` bundles `src/main.ts` into the production `main.js` file using esbuild. To install manually, copy `manifest.json`, `main.js`, and `styles.css` into the vault’s `.obsidian/plugins/tbpedia-share/` directory.
