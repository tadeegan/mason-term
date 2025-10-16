import { Group } from '../types/group';
import { Tab } from '../types/tab';
import { ProcessMonitorCard } from './ProcessMonitorCard';

export class GroupSidebar {
  private container: HTMLElement;
  private onGroupSelect: (groupId: string) => void;
  private onNewGroup: () => void;
  private processMonitorCard: ProcessMonitorCard;
  private allTabs: Tab[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private resizeHandle: HTMLElement;

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

    // Update group stats every 3 seconds
    this.updateInterval = setInterval(() => {
      this.updateGroupStats();
    }, 3000);

    // Add resize handle
    this.setupResizeHandle();
  }

  private setupResizeHandle(): void {
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'sidebar-resize-handle';
    this.container.appendChild(this.resizeHandle);

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.container.offsetWidth;
      this.resizeHandle.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      // Respect min and max width constraints
      const minWidth = 150;
      const maxWidth = 600;
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      this.container.style.width = `${constrainedWidth}px`;
    };

    const handleMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      this.resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    this.resizeHandle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  public render(groups: Group[], allTabs: Tab[]): void {
    this.allTabs = allTabs;

    // Remove all children except the resize handle
    while (this.container.firstChild && this.container.firstChild !== this.resizeHandle) {
      this.container.removeChild(this.container.firstChild);
    }
    if (this.container.lastChild && this.container.lastChild !== this.resizeHandle) {
      while (this.container.lastChild !== this.resizeHandle) {
        this.container.removeChild(this.container.lastChild!);
      }
    }

    // Create groups list container
    const groupsList = document.createElement('div');
    groupsList.className = 'groups-list';

    // Render each group
    groups.forEach((group) => {
      const groupElement = this.createGroupElement(group);
      groupsList.appendChild(groupElement);
    });

    // Add new group button container at the bottom
    const newGroupContainer = document.createElement('div');
    newGroupContainer.className = 'new-group-container';

    const newGroupButton = document.createElement('button');
    newGroupButton.className = 'new-group-button';
    newGroupButton.textContent = '+';
    newGroupButton.title = 'New Group (⌘N)';
    newGroupButton.onclick = () => this.onNewGroup();

    const shortcutHint = document.createElement('span');
    shortcutHint.className = 'new-group-hint';
    shortcutHint.textContent = '⌘N';

    newGroupContainer.appendChild(newGroupButton);
    newGroupContainer.appendChild(shortcutHint);

    // Insert before resize handle
    this.container.insertBefore(groupsList, this.resizeHandle);
    this.container.insertBefore(newGroupContainer, this.resizeHandle);

    // Update stats immediately after render
    this.updateGroupStats();
  }

  private createGroupElement(group: Group): HTMLElement {
    const groupElement = document.createElement('div');
    groupElement.className = `group-item ${group.isActive ? 'active' : ''}`;
    groupElement.setAttribute('data-group-id', group.id);
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

    // Stats element (will be populated by updateGroupStats)
    const statsElement = document.createElement('div');
    statsElement.className = 'group-stats';
    statsElement.setAttribute('data-group-stats', group.id);

    groupElement.appendChild(titleElement);
    groupElement.appendChild(dirElement);
    groupElement.appendChild(statsElement);

    return groupElement;
  }

  private async updateGroupStats(): Promise<void> {
    // Get all group elements
    const groupElements = this.container.querySelectorAll('.group-item');

    for (const groupElement of Array.from(groupElements)) {
      const groupId = groupElement.getAttribute('data-group-id');
      if (!groupId) continue;

      // Find tabs for this group
      const groupTabs = this.allTabs.filter((tab) => tab.groupId === groupId);
      if (groupTabs.length === 0) continue;

      // Fetch process info for all tabs in this group
      const processInfoPromises = groupTabs.map((tab) =>
        window.terminalAPI.getProcessInfo(tab.id).then((info) => info)
      );

      const allProcessInfo = await Promise.all(processInfoPromises);
      const validInfo = allProcessInfo.filter((info) => info !== null);

      if (validInfo.length === 0) continue;

      // Calculate totals
      let totalMemory = 0;
      const allPorts = new Set<number>();

      validInfo.forEach((info) => {
        if (info) {
          totalMemory += info.memoryMB;
          info.ports.forEach((port) => allPorts.add(port));
        }
      });

      // Update the stats element
      const statsElement = groupElement.querySelector(`[data-group-stats="${groupId}"]`);
      if (statsElement) {
        const portsArray = Array.from(allPorts).sort((a, b) => a - b);
        const memoryText = totalMemory > 0 ? `${totalMemory.toFixed(0)}MB` : '';
        const portsText = portsArray.length > 0 ? `:${portsArray.join(',')}` : '';

        if (memoryText || portsText) {
          statsElement.textContent = `${memoryText}${memoryText && portsText ? ' ' : ''}${portsText}`;
        } else {
          statsElement.textContent = '';
        }
      }
    }
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
