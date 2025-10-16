export interface Tab {
  id: string;
  title: string;
  isActive: boolean;
  groupId: string;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
}
