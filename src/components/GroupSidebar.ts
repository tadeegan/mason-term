import { Group } from '../types/group';
import { Tab } from '../types/tab';
import { ProcessMonitorCard } from './ProcessMonitorCard';

export class GroupSidebar {
  private container: HTMLElement;
  private onGroupSelect: (groupId: string) => void;
  private onNewGroup: () => void;
  private onGroupRename: (groupId: string, newTitle: string) => void;
  private onGroupUpdate: (groupId: string, updates: Partial<Group>) => void;
  private processMonitorCard: ProcessMonitorCard;
  private allTabs: Tab[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private resizeHandle: HTMLElement;
  private currentGroups: Group[] = [];

  constructor(
    container: HTMLElement,
    appContainer: HTMLElement,
    callbacks: {
      onGroupSelect: (groupId: string) => void;
      onNewGroup: () => void;
      onGroupRename: (groupId: string, newTitle: string) => void;
      onGroupUpdate: (groupId: string, updates: Partial<Group>) => void;
    }
  ) {
    this.container = container;
    this.onGroupSelect = callbacks.onGroupSelect;
    this.onNewGroup = callbacks.onNewGroup;
    this.onGroupRename = callbacks.onGroupRename;
    this.onGroupUpdate = callbacks.onGroupUpdate;
    this.processMonitorCard = new ProcessMonitorCard(appContainer);

    // Update group stats every 3 seconds
    this.updateInterval = setInterval(() => {
      this.updateGroupStats();
      this.updateGitBranches();
    }, 3000);

    // Add resize handle
    this.setupResizeHandle();

    // Setup event delegation for double-click on group titles
    this.setupEventDelegation();
  }

  private setupEventDelegation(): void {
    // Use event delegation so listeners persist across re-renders
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Check if the click was on the rename icon
      if (target.classList.contains('group-rename-icon')) {
        e.preventDefault();
        e.stopPropagation();

        // Find the group element and get the group ID
        const groupElement = target.closest('.group-item') as HTMLElement;
        if (groupElement) {
          const groupId = groupElement.getAttribute('data-group-id');
          if (groupId) {
            // Get the group title from the element
            const titleElement = groupElement.querySelector('.group-title') as HTMLElement;
            const currentTitle = titleElement?.textContent || '';

            this.startEditingGroupName(titleElement, { id: groupId, title: currentTitle } as Group);
          }
        }
      }
    });
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
    this.currentGroups = groups;

    // Remove all children except the resize handle
    while (this.container.firstChild && this.container.firstChild !== this.resizeHandle) {
      this.container.removeChild(this.container.firstChild);
    }
    if (this.container.lastChild && this.container.lastChild !== this.resizeHandle) {
      while (this.container.lastChild !== this.resizeHandle) {
        this.container.removeChild(this.container.lastChild!);
      }
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'groups-header';
    header.textContent = 'Groups';

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
    this.container.insertBefore(header, this.resizeHandle);
    this.container.insertBefore(groupsList, this.resizeHandle);
    this.container.insertBefore(newGroupContainer, this.resizeHandle);

    // Update stats and git branches immediately after render
    this.updateGroupStats();
    this.updateGitBranches();
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

    // Create title row container
    const titleRow = document.createElement('div');
    titleRow.className = 'group-title-row';

    const titleElement = document.createElement('div');
    titleElement.className = 'group-title';
    titleElement.textContent = group.title;

    // Add rename icon
    const renameIcon = document.createElement('span');
    renameIcon.className = 'group-rename-icon';
    renameIcon.textContent = '✏️';
    renameIcon.title = 'Rename group';

    titleRow.appendChild(titleElement);
    titleRow.appendChild(renameIcon);

    const dirElement = document.createElement('div');
    dirElement.className = 'group-dir-container';

    // Show git branch badge if available
    if (group.gitBranch) {
      const branchBadge = document.createElement('span');
      branchBadge.className = 'git-branch-badge';
      branchBadge.innerHTML = `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" style="margin-right: 4px; vertical-align: baseline;"><path d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.182 3.5a2.5 2.5 0 1 1 3.637 0c.294.165.5.483.5.848v.652A2.5 2.5 0 0 1 10.819 7.5H9.5v4.95a2.5 2.5 0 1 1-1 0V7.5H7.181A2.5 2.5 0 0 1 4.681 5v-.652c0-.365.206-.683.5-.848a2.5 2.5 0 1 1 0-3.296A1.017 1.017 0 0 1 5.681 0h4.638c.199 0 .38.079.5.204zM4.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9 13.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg>${group.gitBranch}`;
      branchBadge.title = `Git branch: ${group.gitBranch}`;
      dirElement.appendChild(branchBadge);
    }

    // Show working directory path
    const pathElement = document.createElement('span');
    pathElement.className = 'group-path';
    pathElement.textContent = this.shortenPath(group.workingDir);
    pathElement.title = group.workingDir;
    dirElement.appendChild(pathElement);

    // Stats element (will be populated by updateGroupStats)
    const statsElement = document.createElement('div');
    statsElement.className = 'group-stats';
    statsElement.setAttribute('data-group-stats', group.id);

    groupElement.appendChild(titleRow);
    groupElement.appendChild(dirElement);
    groupElement.appendChild(statsElement);

    return groupElement;
  }

  private async updateGitBranches(): Promise<void> {
    // Update git branches for all groups
    for (const group of this.currentGroups) {
      try {
        const branch = await window.terminalAPI.getGitBranch(group.workingDir);

        // Only update if branch changed
        if (branch !== group.gitBranch) {
          this.onGroupUpdate(group.id, { gitBranch: branch });
        }
      } catch (error) {
        // Ignore errors (likely not a git repo)
      }
    }
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

      // Get stats element (no loading state to avoid flickering)
      const statsElement = groupElement.querySelector(`[data-group-stats="${groupId}"]`);
      if (!statsElement) continue;

      // Fetch process info for all tabs in this group in the background
      const processInfoPromises = groupTabs.map((tab) =>
        window.terminalAPI.getProcessInfo(tab.id).then((info) => info)
      );

      const allProcessInfo = await Promise.all(processInfoPromises);
      const validInfo = allProcessInfo.filter((info) => info !== null);

      if (validInfo.length === 0) {
        continue;
      }

      // Calculate totals
      let totalMemory = 0;
      const allPorts = new Set<number>();

      validInfo.forEach((info) => {
        if (info) {
          totalMemory += info.memoryMB;
          info.ports.forEach((port) => allPorts.add(port));
        }
      });

      // Update the stats element silently (no loading state)
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

  private startEditingGroupName(titleElement: HTMLElement, group: Group): void {
    const currentTitle = group.title;
    console.log('Starting edit for group:', currentTitle);

    // Create custom modal dialog
    const modal = document.createElement('div');
    modal.className = 'rename-modal';
    modal.innerHTML = `
      <div class="rename-modal-content">
        <h3>Rename Group</h3>
        <input type="text" class="rename-input" value="${currentTitle}" />
        <div class="rename-buttons">
          <button class="rename-cancel">Cancel</button>
          <button class="rename-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('.rename-input') as HTMLInputElement;
    const saveBtn = modal.querySelector('.rename-save') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('.rename-cancel') as HTMLButtonElement;

    // Focus and select the input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    const closeModal = () => {
      modal.remove();
    };

    const saveRename = () => {
      const newTitle = input.value.trim();
      console.log('User entered:', newTitle);

      if (newTitle && newTitle !== currentTitle) {
        console.log('Renaming group from', currentTitle, 'to', newTitle);
        this.onGroupRename(group.id, newTitle);
      }
      closeModal();
    };

    // Event listeners
    saveBtn.addEventListener('click', saveRename);
    cancelBtn.addEventListener('click', closeModal);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
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
