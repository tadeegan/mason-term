import { Terminal } from './Terminal';
import { TabBar } from './TabBar';
import { GroupSidebar } from './GroupSidebar';
import { Tab } from '../types/tab';
import { Group } from '../types/group';

export class TerminalManager {
  private tabs: Tab[] = [];
  private terminals: Map<string, Terminal> = new Map();
  private activeTabId: string | null = null;
  private groups: Group[] = [];
  private activeGroupId: string | null = null;
  private tabBar: TabBar;
  private groupSidebar: GroupSidebar;
  private terminalContainer: HTMLElement;
  private tabCounter = 0;
  private groupCounter = 0;

  constructor(
    groupSidebarContainer: HTMLElement,
    tabBarContainer: HTMLElement,
    terminalContainer: HTMLElement,
    appContainer: HTMLElement
  ) {
    this.terminalContainer = terminalContainer;

    this.groupSidebar = new GroupSidebar(groupSidebarContainer, appContainer, {
      onGroupSelect: (groupId) => this.switchGroup(groupId),
      onNewGroup: () => this.createNewGroup(),
    });

    this.tabBar = new TabBar(tabBarContainer, {
      onTabSelect: (tabId) => this.switchTab(tabId),
      onTabClose: (tabId) => this.closeTab(tabId),
      onNewTab: () => this.createNewTab(),
    });

    // Create initial group with home directory
    const homeDir = this.getHomeDirectory();
    this.createGroup('Default', homeDir);
  }

  private getHomeDirectory(): string {
    // In renderer process, we may not have direct access to process.env
    // Use a sensible default
    if (typeof process !== 'undefined' && process.env) {
      return process.env.HOME || process.env.USERPROFILE || '/';
    }
    // Fallback for renderer - this will be the cwd in main process
    return '~';
  }

  private createGroup(title: string, workingDir: string): void {
    const groupId = `group-${++this.groupCounter}`;

    const group: Group = {
      id: groupId,
      title,
      workingDir,
      isActive: false,
    };

    this.groups.push(group);

    // Switch to new group and create first tab
    this.switchGroup(groupId);
  }

  private createNewGroup(): void {
    const homeDir = this.getHomeDirectory();
    this.createGroup(`Group ${this.groupCounter + 1}`, homeDir);
  }

  private createNewTab(): void {
    if (!this.activeGroupId) return;

    const tabId = `tab-${++this.tabCounter}`;
    const activeGroup = this.groups.find((g) => g.id === this.activeGroupId);
    if (!activeGroup) return;

    // Create tab
    const tab: Tab = {
      id: tabId,
      title: `Terminal ${this.tabCounter}`,
      isActive: false,
      groupId: this.activeGroupId,
    };

    this.tabs.push(tab);

    // Create terminal container
    const terminalDiv = document.createElement('div');
    terminalDiv.id = `terminal-${tabId}`;
    terminalDiv.className = 'terminal-instance';
    terminalDiv.style.display = 'none';
    this.terminalContainer.appendChild(terminalDiv);

    // Create terminal with group's working directory
    const terminal = new Terminal(terminalDiv, tabId, activeGroup.workingDir);
    this.terminals.set(tabId, terminal);

    // Switch to new tab
    this.switchTab(tabId);
  }

  private switchGroup(groupId: string): void {
    // Update groups
    this.groups = this.groups.map((group) => ({
      ...group,
      isActive: group.id === groupId,
    }));

    this.activeGroupId = groupId;

    // Get tabs for this group
    const groupTabs = this.tabs.filter((tab) => tab.groupId === groupId);

    // If group has no tabs, create one
    if (groupTabs.length === 0) {
      this.createNewTab();
      return;
    }

    // Switch to first tab in group (or the active one if it exists)
    const activeTab = groupTabs.find((tab) => tab.isActive) || groupTabs[0];
    this.switchTab(activeTab.id);
  }

  private switchTab(tabId: string): void {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Update tabs - only mark tabs in current group as active/inactive
    this.tabs = this.tabs.map((t) => ({
      ...t,
      isActive: t.groupId === tab.groupId && t.id === tabId,
    }));

    // Hide all terminals, show only the selected one
    this.terminals.forEach((terminal, id) => {
      if (id === tabId) {
        terminal.show();
        terminal.fit();
        terminal.focus();
      } else {
        terminal.hide();
      }
    });

    this.activeTabId = tabId;
    this.render();
  }

  private closeTab(tabId: string): void {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Get tabs in current group
    const groupTabs = this.tabs.filter((t) => t.groupId === tab.groupId);

    // Don't close if it's the last tab in the group
    if (groupTabs.length === 1) {
      return;
    }

    // Find tab index in all tabs
    const tabIndex = this.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    // Dispose terminal
    const terminal = this.terminals.get(tabId);
    if (terminal) {
      terminal.dispose();
      this.terminals.delete(tabId);
    }

    // Remove terminal container
    const terminalDiv = document.getElementById(`terminal-${tabId}`);
    if (terminalDiv) {
      terminalDiv.remove();
    }

    // Remove tab
    this.tabs.splice(tabIndex, 1);

    // Switch to adjacent tab if we closed the active tab
    if (tabId === this.activeTabId) {
      const updatedGroupTabs = this.tabs.filter((t) => t.groupId === tab.groupId);
      if (updatedGroupTabs.length > 0) {
        // Find the index of the closed tab in the group
        const groupIndex = groupTabs.findIndex((t) => t.id === tabId);
        const newIndex = Math.max(0, Math.min(groupIndex, updatedGroupTabs.length - 1));
        this.switchTab(updatedGroupTabs[newIndex].id);
      }
    } else {
      this.render();
    }
  }

  private render(): void {
    // Only render tabs for the active group
    const groupTabs = this.activeGroupId
      ? this.tabs.filter((tab) => tab.groupId === this.activeGroupId)
      : [];

    this.tabBar.render(groupTabs);
    this.groupSidebar.render(this.groups, this.tabs);
  }

  // Public method to handle mason new-group command
  public handleMasonNewGroup(workingDir: string): void {
    console.log(`Creating new group with working directory: ${workingDir}`);
    // Extract a title from the path (use the last directory name)
    const pathParts = workingDir.split('/').filter(Boolean);
    const title = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'New Group';
    this.createGroup(title, workingDir);
  }

  // Public method for keyboard shortcut: Cmd+T (new tab)
  public handleNewTabShortcut(): void {
    this.createNewTab();
  }

  // Public method for keyboard shortcut: Cmd+N (new group)
  public handleNewGroupShortcut(): void {
    this.createNewGroup();
  }
}
