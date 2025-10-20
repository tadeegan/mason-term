import { ProcessInfo } from './process';
import { PullRequest } from './group';
import { WorkspaceData, WorkspaceMetadata } from './workspace';

export interface TerminalAPI {
  create: (terminalId: string, workingDir: string) => Promise<{ success: boolean }>;
  onData: (terminalId: string, callback: (data: string) => void) => void;
  sendData: (terminalId: string, data: string) => void;
  resize: (terminalId: string, cols: number, rows: number) => void;
  onExit: (terminalId: string, callback: (code: number) => void) => void;
  onMasonCommand: (callback: (command: string, path: string) => void) => void;
  getProcessInfo: (terminalId: string) => Promise<ProcessInfo | null>;
  getGitBranch: (workingDir: string) => Promise<string | null>;
  getPr: (workingDir: string) => Promise<PullRequest | null>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  openInEditor: (workingDir: string) => Promise<{ success: boolean }>;
  closeWindow: () => void;
  saveWorkspace: (data: WorkspaceData) => Promise<string>;
  loadWorkspace: (filename: string) => Promise<WorkspaceData>;
  listWorkspaces: () => Promise<WorkspaceMetadata[]>;
}

declare global {
  interface Window {
    terminalAPI: TerminalAPI;
  }
}
