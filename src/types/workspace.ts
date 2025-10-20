export interface PersistedGroup {
  id: string;
  title: string;
  workingDir: string;
}

export interface WorkspaceData {
  version: string;
  timestamp: string;
  groups: PersistedGroup[];
}

export interface WorkspaceMetadata {
  filename: string;
  filepath: string;
  timestamp: string;
  groupCount: number;
  groupNames: string[];
}
