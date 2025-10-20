import { Terminal } from './Terminal';
import { TabBar } from './TabBar';
import { GroupSidebar } from './GroupSidebar';
import { Tab } from '../types/tab';
import { Group } from '../types/group';
import { WorkspaceManager } from '../services/WorkspaceManager';
import { WorkspaceData } from '../types/workspace';

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
    appContainer: HTMLElement,
    skipInitialGroup: boolean = false
  ) {
    this.terminalContainer = terminalContainer;

    this.groupSidebar = new GroupSidebar(groupSidebarContainer, appContainer, {
      onGroupSelect: (groupId) => this.switchGroup(groupId),
      onNewGroup: () => this.createNewGroup(),
      onGroupRename: (groupId, newTitle) => this.renameGroup(groupId, newTitle),
      onGroupUpdate: (groupId, updates) => this.updateGroup(groupId, updates),
    });

    this.tabBar = new TabBar(tabBarContainer, {
      onTabSelect: (tabId) => this.switchTab(tabId),
      onTabClose: (tabId) => this.closeTab(tabId),
      onNewTab: () => this.createNewTab(),
    });

    // Create initial group with home directory (unless we're loading a workspace)
    if (!skipInitialGroup) {
      const homeDir = this.getHomeDirectory();
      this.createGroup('Default', homeDir);
    }
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

  private createGroup(title: string, workingDir: string, createTab: boolean = true): void {
    const groupId = `group-${++this.groupCounter}`;

    const group: Group = {
      id: groupId,
      title,
      workingDir,
      isActive: false,
    };

    this.groups.push(group);

    // Switch to new group
    this.switchGroup(groupId);

    // Create initial tab if requested
    if (createTab) {
      this.createNewTab();
    }

    // Save workspace state
    this.saveState();
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

    // If group has no tabs, show empty workspace
    if (groupTabs.length === 0) {
      this.activeTabId = null;
      this.showEmptyWorkspace();
      this.render();
      return;
    }

    // Switch to first tab in group (or the active one if it exists)
    const activeTab = groupTabs.find((tab) => tab.isActive) || groupTabs[0];
    this.switchTab(activeTab.id);
  }

  private switchTab(tabId: string): void {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Hide empty workspace
    this.hideEmptyWorkspace();

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

    // If this was the last tab in the group, show empty workspace
    if (groupTabs.length === 1) {
      this.activeTabId = null;
      this.showEmptyWorkspace();
      this.render();
      return;
    }

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

  private showEmptyWorkspace(): void {
    // Hide all terminals
    this.terminals.forEach((terminal) => {
      terminal.hide();
    });

    // Create or show empty workspace UI
    let emptyWorkspace = document.getElementById('empty-workspace');
    if (!emptyWorkspace) {
      emptyWorkspace = document.createElement('div');
      emptyWorkspace.id = 'empty-workspace';
      emptyWorkspace.className = 'empty-workspace';

      const content = document.createElement('div');
      content.className = 'empty-workspace-content';

      const icon = document.createElement('div');
      icon.className = 'empty-workspace-icon';
      icon.textContent = '⌨';

      const message = document.createElement('div');
      message.className = 'empty-workspace-message';
      message.textContent = 'No terminals in this workspace';

      const hint = document.createElement('div');
      hint.className = 'empty-workspace-hint';
      hint.textContent = 'Press ⌘T to create a new terminal or ⌘W to close this workspace';

      content.appendChild(icon);
      content.appendChild(message);
      content.appendChild(hint);
      emptyWorkspace.appendChild(content);
      this.terminalContainer.appendChild(emptyWorkspace);
    } else {
      emptyWorkspace.style.display = 'flex';
    }
  }

  private hideEmptyWorkspace(): void {
    const emptyWorkspace = document.getElementById('empty-workspace');
    if (emptyWorkspace) {
      emptyWorkspace.style.display = 'none';
    }
  }

  private renameGroup(groupId: string, newTitle: string): void {
    this.groups = this.groups.map((group) => {
      if (group.id === groupId) {
        return { ...group, title: newTitle };
      }
      return group;
    });
    this.render();
    this.saveState();
  }

  private updateGroup(groupId: string, updates: Partial<Group>): void {
    this.groups = this.groups.map((group) => {
      if (group.id === groupId) {
        return { ...group, ...updates };
      }
      return group;
    });
    this.render();
    this.saveState();
  }

  private closeGroup(groupId: string): void {
    // If this is the last group, close the app
    if (this.groups.length === 1) {
      window.terminalAPI.closeWindow();
      return;
    }

    // Remove all tabs from this group
    const groupTabs = this.tabs.filter((t) => t.groupId === groupId);
    groupTabs.forEach((tab) => {
      const terminal = this.terminals.get(tab.id);
      if (terminal) {
        terminal.dispose();
        this.terminals.delete(tab.id);
      }
      const terminalDiv = document.getElementById(`terminal-${tab.id}`);
      if (terminalDiv) {
        terminalDiv.remove();
      }
    });

    // Remove tabs
    this.tabs = this.tabs.filter((t) => t.groupId !== groupId);

    // Remove group
    const groupIndex = this.groups.findIndex((g) => g.id === groupId);
    if (groupIndex !== -1) {
      this.groups.splice(groupIndex, 1);
    }

    // Switch to adjacent group
    if (groupId === this.activeGroupId) {
      const newIndex = Math.max(0, Math.min(groupIndex, this.groups.length - 1));
      this.switchGroup(this.groups[newIndex].id);
    } else {
      this.render();
    }

    // Save workspace state
    this.saveState();
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

  // Public method to handle mason set command
  public handleMasonSet(workingDir: string): void {
    console.log(`Setting current group working directory to: ${workingDir}`);

    if (!this.activeGroupId) {
      console.warn('No active group to set working directory');
      return;
    }

    // Update the active group's working directory
    this.groups = this.groups.map((group) => {
      if (group.id === this.activeGroupId) {
        return { ...group, workingDir };
      }
      return group;
    });

    // Re-render to show updated directory
    this.render();
  }

  // Public method for keyboard shortcut: Cmd+T (new tab)
  public handleNewTabShortcut(): void {
    this.createNewTab();
  }

  // Public method for keyboard shortcut: Cmd+N (new group)
  public handleNewGroupShortcut(): void {
    this.createNewGroup();
  }

  // Public method for keyboard shortcut: Cmd+W (close tab)
  public handleCloseTabShortcut(): void {
    if (this.activeTabId) {
      this.closeTab(this.activeTabId);
    } else if (this.activeGroupId) {
      // No active tab means we're in empty workspace, close the group
      this.closeGroup(this.activeGroupId);
    }
  }

  // Public method for keyboard shortcut: Cmd+1 through Cmd+9 (switch to tab by index)
  public handleSwitchToTabByIndex(index: number): void {
    if (!this.activeGroupId) return;

    // Get tabs for active group
    const groupTabs = this.tabs.filter((tab) => tab.groupId === this.activeGroupId);

    // Check if index is within bounds (1-based index from user, 0-based for array)
    if (index > 0 && index <= groupTabs.length) {
      this.switchTab(groupTabs[index - 1].id);
    }
  }

  // Workspace persistence methods

  /**
   * Save current workspace state to file
   */
  private async saveState(): Promise<void> {
    try {
      await WorkspaceManager.saveWorkspace(this.groups);
    } catch (error) {
      console.error('Failed to save workspace state:', error);
    }
  }

  /**
   * Load workspace from data and recreate groups
   */
  public loadWorkspace(workspaceData: WorkspaceData): void {
    // Clear existing groups (except we'll replace them with loaded ones)
    this.groups = [];

    // Recreate groups from workspace data
    workspaceData.groups.forEach((persistedGroup, index) => {
      // Restore group counter to avoid ID conflicts
      this.groupCounter = Math.max(
        this.groupCounter,
        parseInt(persistedGroup.id.replace('group-', '')) || 0
      );

      const group: Group = {
        id: persistedGroup.id,
        title: persistedGroup.title,
        workingDir: persistedGroup.workingDir,
        isActive: index === 0, // First group is active
      };

      this.groups.push(group);
    });

    // If we have groups, switch to the first one
    if (this.groups.length > 0) {
      this.switchGroup(this.groups[0].id);
      // Create initial tab
      this.createNewTab();
    }
  }
}
