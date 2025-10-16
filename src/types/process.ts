export interface ProcessInfo {
  terminalId: string;
  terminalTitle: string;
  pid: number;
  processName: string;
  workingDir: string;
  ports: number[];
  cpuPercent: number;
  memoryMB: number;
}

export interface GroupProcessInfo {
  groupId: string;
  groupTitle: string;
  terminals: ProcessInfo[];
}
