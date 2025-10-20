// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { TerminalAPI } from './types/terminal';

const terminalAPI: TerminalAPI = {
  create: (terminalId: string, workingDir: string) =>
    ipcRenderer.invoke('terminal:create', terminalId, workingDir),
  onData: (terminalId: string, callback: (data: string) => void) => {
    ipcRenderer.on(`terminal:data:${terminalId}`, (_, data: string) => callback(data));
  },
  sendData: (terminalId: string, data: string) => {
    ipcRenderer.send('terminal:input', terminalId, data);
  },
  resize: (terminalId: string, cols: number, rows: number) => {
    ipcRenderer.send('terminal:resize', terminalId, cols, rows);
  },
  onExit: (terminalId: string, callback: (code: number) => void) => {
    ipcRenderer.on(`terminal:exit:${terminalId}`, (_, code: number) => callback(code));
  },
  onMasonCommand: (callback: (command: string, path: string) => void) => {
    ipcRenderer.on('mason:command', (_, data: { command: string; path: string }) =>
      callback(data.command, data.path)
    );
  },
  getProcessInfo: (terminalId: string) =>
    ipcRenderer.invoke('terminal:getProcessInfo', terminalId),
  getGitBranch: (workingDir: string) =>
    ipcRenderer.invoke('git:getBranch', workingDir),
  getPr: (workingDir: string) =>
    ipcRenderer.invoke('git:getPr', workingDir),
  openExternal: (url: string) =>
    ipcRenderer.invoke('shell:openExternal', url),
  openInEditor: (workingDir: string) =>
    ipcRenderer.invoke('shell:openInEditor', workingDir),
  closeWindow: () => ipcRenderer.send('window:close'),
  saveWorkspace: (data) =>
    ipcRenderer.invoke('workspace:save', data),
  loadWorkspace: (filename) =>
    ipcRenderer.invoke('workspace:load', filename),
  listWorkspaces: () =>
    ipcRenderer.invoke('workspace:list'),
};

contextBridge.exposeInMainWorld('terminalAPI', terminalAPI);
