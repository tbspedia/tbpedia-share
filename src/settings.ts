import { App, PluginSettingTab, Setting } from "obsidian";
import type TBPediaSharePlugin from "./main";
import type { PlatformId } from "./types";
import { t } from "./i18n";

export interface TBPediaShareSettings {
  enabledPlatforms: PlatformId[];
  includeTitle: boolean;
  includeTags: boolean;
  removeFrontmatter: boolean;
  removeImageMetadata: boolean;
  preferredPlatform: PlatformId;
}

export const DEFAULT_SETTINGS: TBPediaShareSettings = {
  enabledPlatforms: ["whatsapp", "x", "linkedin", "facebook", "telegram", "line", "email", "wechat"],
  includeTitle: true,
  includeTags: true,
  removeFrontmatter: true,
  removeImageMetadata: true,
  preferredPlatform: "whatsapp"
};

export class TBPediaShareSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: TBPediaSharePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "True Buddha Pedia Share" });
    containerEl.createEl("p", {
      text: t("settings.intro")
    });

    new Setting(containerEl)
      .setName(t("settings.includeTitle.name"))
      .setDesc(t("settings.includeTitle.desc"))
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.includeTitle)
        .onChange(async (value) => {
          this.plugin.settings.includeTitle = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t("settings.includeTags.name"))
      .setDesc(t("settings.includeTags.desc"))
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.includeTags)
        .onChange(async (value) => {
          this.plugin.settings.includeTags = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t("settings.removeFrontmatter.name"))
      .setDesc(t("settings.removeFrontmatter.desc"))
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.removeFrontmatter)
        .onChange(async (value) => {
          this.plugin.settings.removeFrontmatter = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t("settings.removeImageMetadata.name"))
      .setDesc(t("settings.removeImageMetadata.desc"))
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.removeImageMetadata)
        .onChange(async (value) => {
          this.plugin.settings.removeImageMetadata = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: t("settings.destinations") });
    for (const platform of this.plugin.platforms) {
      new Setting(containerEl)
        .setName(platform.label)
        .setDesc(t("settings.platformLimit", { limit: platform.softLimit.toLocaleString() }))
        .addToggle((toggle) => toggle
          .setValue(this.plugin.settings.enabledPlatforms.includes(platform.id))
          .onChange(async (enabled) => {
            const platforms = this.plugin.settings.enabledPlatforms.filter((id) => id !== platform.id);
            if (enabled) platforms.push(platform.id);
            this.plugin.settings.enabledPlatforms = platforms;
            await this.plugin.saveSettings();
          }));
    }
  }
}
