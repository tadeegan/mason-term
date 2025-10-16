// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { TerminalAPI } from './types/terminal';

const terminalAPI: TerminalAPI = {
  create: () => ipcRenderer.invoke('terminal:create'),
  onData: (callback: (data: string) => void) => {
    ipcRenderer.on('terminal:data', (_, data: string) => callback(data));
  },
  sendData: (data: string) => {
    ipcRenderer.send('terminal:input', data);
  },
  resize: (cols: number, rows: number) => {
    ipcRenderer.send('terminal:resize', cols, rows);
  },
  onExit: (callback: (code: number) => void) => {
    ipcRenderer.on('terminal:exit', (_, code: number) => callback(code));
  },
};

contextBridge.exposeInMainWorld('terminalAPI', terminalAPI);
