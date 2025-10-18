export interface Group {
  id: string;
  title: string;
  workingDir: string;
  isActive: boolean;
  gitBranch?: string | null;
}

export interface GroupState {
  groups: Group[];
  activeGroupId: string | null;
}
