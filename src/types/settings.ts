export interface TerminalSettings {
  scrollbackLines: number;
  fontSize: number;
  fontFamily: string;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
}

export interface AppSettings {
  version: string;
  terminal: TerminalSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: '1.0.0',
  terminal: {
    scrollbackLines: 10000,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
    cursorStyle: 'block',
  },
};
