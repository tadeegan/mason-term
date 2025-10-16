import { Terminal } from './Terminal';
import { TabBar } from './TabBar';
import { Tab } from '../types/tab';

export class TerminalManager {
  private tabs: Tab[] = [];
  private terminals: Map<string, Terminal> = new Map();
  private activeTabId: string | null = null;
  private tabBar: TabBar;
  private terminalContainer: HTMLElement;
  private tabCounter = 0;

  constructor(tabBarContainer: HTMLElement, terminalContainer: HTMLElement) {
    this.terminalContainer = terminalContainer;
    this.tabBar = new TabBar(tabBarContainer, {
      onTabSelect: (tabId) => this.switchTab(tabId),
      onTabClose: (tabId) => this.closeTab(tabId),
      onNewTab: () => this.createNewTab(),
    });

    // Create initial tab
    this.createNewTab();
  }

  private createNewTab(): void {
    const tabId = `tab-${++this.tabCounter}`;

    // Create tab
    const tab: Tab = {
      id: tabId,
      title: `Terminal ${this.tabCounter}`,
      isActive: false,
    };

    this.tabs.push(tab);

    // Create terminal container
    const terminalDiv = document.createElement('div');
    terminalDiv.id = `terminal-${tabId}`;
    terminalDiv.className = 'terminal-instance';
    terminalDiv.style.display = 'none';
    this.terminalContainer.appendChild(terminalDiv);

    // Create terminal
    const terminal = new Terminal(terminalDiv, tabId);
    this.terminals.set(tabId, terminal);

    // Switch to new tab
    this.switchTab(tabId);
  }

  private switchTab(tabId: string): void {
    // Update tabs
    this.tabs = this.tabs.map((tab) => ({
      ...tab,
      isActive: tab.id === tabId,
    }));

    // Hide all terminals
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
    // Don't close if it's the last tab
    if (this.tabs.length === 1) {
      return;
    }

    // Find tab index
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
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
      const newIndex = Math.max(0, tabIndex - 1);
      this.switchTab(this.tabs[newIndex].id);
    } else {
      this.render();
    }
  }

  private render(): void {
    this.tabBar.render(this.tabs);
  }
}
