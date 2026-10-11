# TBPedia Share

An Obsidian plugin that prepares the active note for WhatsApp, X, LinkedIn,
Facebook, Telegram, LINE, email, and WeChat.

Use **Share current note** for the full document or **Share selected text** to
format and share only the highlighted text. Image embeds inside the selection
are included when supported by the selected sharing method.

It formats the entire active note into platform-sized numbered parts, resolves
embedded local images, and hands text and images to native sharing when the
device supports it. The mobile-only **Share with an app** control uses the
device's native share sheet. Desktop sharing opens a platform's browser
composer and copies the current part as a reliable fallback.

Repeated WhatsApp actions reuse the named WhatsApp Web tab opened by the
plugin. Browser privacy restrictions prevent the plugin from locating a
separately opened WhatsApp tab.

## Development

```powershell
pnpm install
pnpm run dev
```

Copy `manifest.json`, `main.js`, and `styles.css` to your vault at:

```text
<vault>/.obsidian/plugins/tbpedia-share/
```

Use `pnpm run build` for a production bundle and `pnpm run check` for type
checking.
