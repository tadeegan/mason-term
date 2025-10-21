export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
}

export interface Group {
  id: string;
  title: string;
  workingDir: string;
  isActive: boolean;
  gitBranch?: string | null;
  pr?: PullRequest | null;
}

export interface GroupState {
  groups: Group[];
  activeGroupId: string | null;
}
