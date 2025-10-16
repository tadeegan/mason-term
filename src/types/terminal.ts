export interface TerminalAPI {
  create: (terminalId: string, workingDir: string) => Promise<{ success: boolean }>;
  onData: (terminalId: string, callback: (data: string) => void) => void;
  sendData: (terminalId: string, data: string) => void;
  resize: (terminalId: string, cols: number, rows: number) => void;
  onExit: (terminalId: string, callback: (code: number) => void) => void;
  onMasonCommand: (callback: (command: string, path: string) => void) => void;
}

declare global {
  interface Window {
    terminalAPI: TerminalAPI;
  }
}
