export interface Tab {
  id: string;
  title: string;
  isActive: boolean;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
}
