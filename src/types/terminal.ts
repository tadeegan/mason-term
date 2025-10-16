export interface TerminalAPI {
  create: () => Promise<{ success: boolean }>;
  onData: (callback: (data: string) => void) => void;
  sendData: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  onExit: (callback: (code: number) => void) => void;
}

declare global {
  interface Window {
    terminalAPI: TerminalAPI;
  }
}
