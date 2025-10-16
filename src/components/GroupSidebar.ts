import { Group } from '../types/group';
import { Tab } from '../types/tab';
import { ProcessMonitorCard } from './ProcessMonitorCard';

export class GroupSidebar {
  private container: HTMLElement;
  private onGroupSelect: (groupId: string) => void;
  private onNewGroup: () => void;
  private processMonitorCard: ProcessMonitorCard;
  private allTabs: Tab[] = [];

  constructor(
    container: HTMLElement,
    appContainer: HTMLElement,
    callbacks: {
      onGroupSelect: (groupId: string) => void;
      onNewGroup: () => void;
    }
  ) {
    this.container = container;
    this.onGroupSelect = callbacks.onGroupSelect;
    this.onNewGroup = callbacks.onNewGroup;
    this.processMonitorCard = new ProcessMonitorCard(appContainer);
  }

  public render(groups: Group[], allTabs: Tab[]): void {
    this.allTabs = allTabs;
    this.container.innerHTML = '';

    // Create groups list container
    const groupsList = document.createElement('div');
    groupsList.className = 'groups-list';

    // Render each group
    groups.forEach((group) => {
      const groupElement = this.createGroupElement(group);
      groupsList.appendChild(groupElement);
    });

    // Add new group button at the bottom
    const newGroupButton = document.createElement('button');
    newGroupButton.className = 'new-group-button';
    newGroupButton.textContent = '+';
    newGroupButton.title = 'New Group';
    newGroupButton.onclick = () => this.onNewGroup();

    this.container.appendChild(groupsList);
    this.container.appendChild(newGroupButton);
  }

  private createGroupElement(group: Group): HTMLElement {
    const groupElement = document.createElement('div');
    groupElement.className = `group-item ${group.isActive ? 'active' : ''}`;
    groupElement.onclick = () => this.onGroupSelect(group.id);

    // Add hover handlers for process monitor card
    groupElement.onmouseenter = () => {
      const groupTabs = this.allTabs.filter((tab) => tab.groupId === group.id);
      this.processMonitorCard.show(group.title, groupTabs);
    };

    groupElement.onmouseleave = () => {
      this.processMonitorCard.hide();
    };

    const titleElement = document.createElement('div');
    titleElement.className = 'group-title';
    titleElement.textContent = group.title;

    const dirElement = document.createElement('div');
    dirElement.className = 'group-dir';
    dirElement.textContent = this.shortenPath(group.workingDir);
    dirElement.title = group.workingDir;

    groupElement.appendChild(titleElement);
    groupElement.appendChild(dirElement);

    return groupElement;
  }

  private shortenPath(path: string): string {
    // Replace home directory with ~
    if (typeof process !== 'undefined' && process.env) {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      if (home && path.startsWith(home)) {
        return '~' + path.substring(home.length);
      }
    }
    // If path is already using ~, keep it
    return path;
  }
}
