import { Tab } from '../types/tab';

export class TabBar {
  private container: HTMLElement;
  private onTabSelect: (tabId: string) => void;
  private onTabClose: (tabId: string) => void;
  private onNewTab: () => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onTabSelect: (tabId: string) => void;
      onTabClose: (tabId: string) => void;
      onNewTab: () => void;
    }
  ) {
    this.container = container;
    this.onTabSelect = callbacks.onTabSelect;
    this.onTabClose = callbacks.onTabClose;
    this.onNewTab = callbacks.onNewTab;
  }

  public render(tabs: Tab[]): void {
    this.container.innerHTML = '';

    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-list';

    // Render each tab
    tabs.forEach((tab) => {
      const tabElement = this.createTabElement(tab);
      tabsContainer.appendChild(tabElement);
    });

    // Add new tab button
    const newTabButton = document.createElement('button');
    newTabButton.className = 'new-tab-button';
    newTabButton.textContent = '+';
    newTabButton.title = 'New Tab';
    newTabButton.onclick = () => this.onNewTab();

    tabsContainer.appendChild(newTabButton);
    this.container.appendChild(tabsContainer);
  }

  private createTabElement(tab: Tab): HTMLElement {
    const tabElement = document.createElement('div');
    tabElement.className = `tab ${tab.isActive ? 'active' : ''}`;
    tabElement.onclick = () => this.onTabSelect(tab.id);

    const titleElement = document.createElement('span');
    titleElement.className = 'tab-title';
    titleElement.textContent = tab.title;

    const closeButton = document.createElement('button');
    closeButton.className = 'tab-close';
    closeButton.textContent = '×';
    closeButton.onclick = (e) => {
      e.stopPropagation();
      this.onTabClose(tab.id);
    };

    tabElement.appendChild(titleElement);
    tabElement.appendChild(closeButton);

    return tabElement;
  }
}
