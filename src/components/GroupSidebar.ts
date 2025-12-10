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
      this.updatePrs();
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

      // Check if the click was on the editor icon
      if (target.classList.contains('group-editor-icon')) {
        e.preventDefault();
        e.stopPropagation();

        // Find the group element and get the group ID
        const groupElement = target.closest('.group-item') as HTMLElement;
        if (groupElement) {
          const groupId = groupElement.getAttribute('data-group-id');
          if (groupId) {
            // Find the group and open in editor
            const group = this.currentGroups.find((g) => g.id === groupId);
            if (group) {
              window.terminalAPI.openInEditor(group.workingDir);
            }
          }
        }
      }

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

    // Add thread icon (Lucide MessageSquare)
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    iconSpan.style.marginRight = '6px';
    iconSpan.style.verticalAlign = 'middle';
    iconSpan.style.display = 'inline-flex';

    const textNode = document.createTextNode('Threads');
    header.appendChild(iconSpan);
    header.appendChild(textNode);

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

    // Create container for icons
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'group-icons-container';

    // Add open in editor icon
    const editorIcon = document.createElement('span');
    editorIcon.className = 'group-editor-icon';
    editorIcon.textContent = '📝';
    editorIcon.title = 'Open in editor';

    // Add rename icon
    const renameIcon = document.createElement('span');
    renameIcon.className = 'group-rename-icon';
    renameIcon.textContent = '✏️';
    renameIcon.title = 'Rename group';

    iconsContainer.appendChild(editorIcon);
    iconsContainer.appendChild(renameIcon);

    titleRow.appendChild(titleElement);
    titleRow.appendChild(iconsContainer);

    const dirElement = document.createElement('div');
    dirElement.className = 'group-dir-container';

    // Show git branch badge if available
    if (group.gitBranch) {
      const branchBadge = document.createElement('span');
      branchBadge.className = 'git-branch-badge';
      branchBadge.title = `Git branch: ${group.gitBranch}`;

      const branchIconSpan = document.createElement('span');
      branchIconSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>';
      branchIconSpan.style.marginRight = '4px';
      branchIconSpan.style.verticalAlign = 'baseline';
      branchIconSpan.style.display = 'inline-flex';

      branchBadge.appendChild(branchIconSpan);
      branchBadge.appendChild(document.createTextNode(group.gitBranch));
      dirElement.appendChild(branchBadge);
    }

    // Show PR badge if available
    if (group.pr) {
      const prBadge = document.createElement('span');
      prBadge.className = 'pr-badge';
      prBadge.title = `Pull Request: ${group.pr.title}`;
      prBadge.style.cursor = 'pointer';
      prBadge.onclick = (e) => {
        e.stopPropagation();
        window.terminalAPI.openExternal(group.pr!.url);
      };

      const prIconSpan = document.createElement('span');
      prIconSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/></svg>';
      prIconSpan.style.marginRight = '4px';
      prIconSpan.style.verticalAlign = 'baseline';
      prIconSpan.style.display = 'inline-flex';

      prBadge.appendChild(prIconSpan);
      prBadge.appendChild(document.createTextNode(`#${group.pr.number}`));
      dirElement.appendChild(prBadge);
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
    // Create a snapshot to avoid issues with concurrent updates
    const groupsSnapshot = [...this.currentGroups];

    for (const group of groupsSnapshot) {
      try {
        const branch = await window.terminalAPI.getGitBranch(group.workingDir);

        // Find the current state of this group (may have been updated since snapshot)
        const currentGroup = this.currentGroups.find(g => g.id === group.id);
        if (!currentGroup) {
          console.log(`Group ${group.id} no longer exists, skipping branch update`);
          continue;
        }

        // Only update if branch changed
        if (branch !== currentGroup.gitBranch) {
          console.log(`Branch changed for group ${group.id} (${group.title}):`,
            currentGroup.gitBranch || 'none',
            '→',
            branch || 'none',
            '- Clearing PR'
          );
          // Clear PR when branch changes since PR is branch-specific
          this.onGroupUpdate(group.id, { gitBranch: branch, pr: null });
        }
      } catch (error) {
        // Log errors for debugging but don't crash
        console.error(`Failed to get git branch for group ${group.id} (${group.title}) at ${group.workingDir}:`, error);
      }
    }
  }

  private async updatePrs(): Promise<void> {
    // Update PRs for all groups
    // Create a snapshot to avoid issues with concurrent updates
    const groupsSnapshot = [...this.currentGroups];

    for (const group of groupsSnapshot) {
      try {
        const pr = await window.terminalAPI.getPr(group.workingDir);

        // Find the current state of this group (may have been updated since snapshot)
        const currentGroup = this.currentGroups.find(g => g.id === group.id);
        if (!currentGroup) {
          console.log(`Group ${group.id} no longer exists, skipping PR update`);
          continue;
        }

        // Normalize undefined to null for consistent comparison
        const normalizedPr = pr || null;
        const normalizedCurrentPr = currentGroup.pr || null;

        // Only update if PR changed
        const prChanged =
          (!normalizedPr && normalizedCurrentPr) ||
          (normalizedPr && !normalizedCurrentPr) ||
          (normalizedPr && normalizedCurrentPr && normalizedPr.number !== normalizedCurrentPr.number);

        if (prChanged) {
          console.log(`PR changed for group ${group.id} (${group.title}):`,
            currentGroup.pr ? `#${currentGroup.pr.number}` : 'none',
            '→',
            pr ? `#${pr.number}` : 'none'
          );
          this.onGroupUpdate(group.id, { pr });
        }
      } catch (error) {
        // Log errors for debugging but don't crash
        console.error(`Failed to get PR for group ${group.id} (${group.title}) at ${group.workingDir}:`, error);
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
