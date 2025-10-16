export interface Group {
  id: string;
  title: string;
  workingDir: string;
  isActive: boolean;
}

export interface GroupState {
  groups: Group[];
  activeGroupId: string | null;
}
