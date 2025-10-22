import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

export class SettingsManager {
  private static readonly SETTINGS_DIR = path.join(os.homedir(), '.mason');
  private static readonly SETTINGS_FILE = path.join(SettingsManager.SETTINGS_DIR, 'settings.json');

  static async load(): Promise<AppSettings> {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.SETTINGS_DIR)) {
        fs.mkdirSync(this.SETTINGS_DIR, { recursive: true });
      }

      // If settings file doesn't exist, create with defaults
      if (!fs.existsSync(this.SETTINGS_FILE)) {
        await this.save(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      // Read and parse settings
      const data = fs.readFileSync(this.SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data) as AppSettings;

      // Merge with defaults to handle missing properties
      return this.mergeWithDefaults(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async save(settings: AppSettings): Promise<void> {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.SETTINGS_DIR)) {
        fs.mkdirSync(this.SETTINGS_DIR, { recursive: true });
      }

      // Write settings to file
      fs.writeFileSync(this.SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  static async reset(): Promise<AppSettings> {
    await this.save(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  private static mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
    return {
      version: settings.version || DEFAULT_SETTINGS.version,
      terminal: {
        scrollbackLines: settings.terminal?.scrollbackLines ?? DEFAULT_SETTINGS.terminal.scrollbackLines,
        fontSize: settings.terminal?.fontSize ?? DEFAULT_SETTINGS.terminal.fontSize,
        fontFamily: settings.terminal?.fontFamily ?? DEFAULT_SETTINGS.terminal.fontFamily,
        cursorBlink: settings.terminal?.cursorBlink ?? DEFAULT_SETTINGS.terminal.cursorBlink,
        cursorStyle: settings.terminal?.cursorStyle ?? DEFAULT_SETTINGS.terminal.cursorStyle,
      },
      editor: {
        preferredEditor: settings.editor?.preferredEditor ?? DEFAULT_SETTINGS.editor.preferredEditor,
      },
    };
  }
}
