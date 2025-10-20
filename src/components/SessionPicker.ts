import { WorkspaceMetadata } from '../types/workspace';

export class SessionPicker {
  private modal: HTMLElement | null = null;
  private selectedFilename: string | null = null;

  /**
   * Show the session picker dialog
   * @param workspaces Array of available workspace sessions
   * @returns Promise that resolves with selected filename or null for fresh start
   */
  async show(workspaces: WorkspaceMetadata[]): Promise<string | null> {
    return new Promise((resolve) => {
      this.createModal(workspaces, resolve);
      document.body.appendChild(this.modal!);

      // Focus the first session item
      const firstSession = this.modal!.querySelector('.session-item') as HTMLElement;
      if (firstSession) {
        firstSession.focus();
      }
    });
  }

  private createModal(
    workspaces: WorkspaceMetadata[],
    resolve: (value: string | null) => void
  ): void {
    // Create modal overlay
    this.modal = document.createElement('div');
    this.modal.className = 'session-picker-modal';

    // Create modal content
    const content = document.createElement('div');
    content.className = 'session-picker-content';

    // Header
    const header = document.createElement('h3');
    header.textContent = 'Resume Workspace';
    content.appendChild(header);

    // Description
    const description = document.createElement('p');
    description.className = 'session-picker-description';
    description.textContent = 'Select a previous session to resume or start fresh';
    content.appendChild(description);

    // Sessions list container
    const listContainer = document.createElement('div');
    listContainer.className = 'sessions-list';

    // Add workspace items
    workspaces.forEach((workspace, index) => {
      const item = this.createSessionItem(workspace, index === 0);
      listContainer.appendChild(item);
    });

    content.appendChild(listContainer);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'session-picker-buttons';

    // Start Fresh button
    const freshButton = document.createElement('button');
    freshButton.className = 'session-picker-button session-picker-secondary';
    freshButton.textContent = 'Start Fresh';
    freshButton.onclick = () => {
      this.close(resolve, null);
    };

    // Resume button
    const resumeButton = document.createElement('button');
    resumeButton.className = 'session-picker-button session-picker-primary';
    resumeButton.textContent = 'Resume Selected';
    resumeButton.onclick = () => {
      if (this.selectedFilename) {
        this.close(resolve, this.selectedFilename);
      }
    };

    buttons.appendChild(freshButton);
    buttons.appendChild(resumeButton);
    content.appendChild(buttons);

    this.modal.appendChild(content);

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close(resolve, null);
      }
    });

    // Handle keyboard navigation
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close(resolve, null);
      } else if (e.key === 'Enter') {
        if (this.selectedFilename) {
          this.close(resolve, this.selectedFilename);
        }
      }
    });
  }

  private createSessionItem(workspace: WorkspaceMetadata, isFirst: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.setAttribute('tabindex', '0');
    item.setAttribute('data-filename', workspace.filename);

    if (isFirst) {
      item.classList.add('selected');
      this.selectedFilename = workspace.filename;
    }

    // Format date
    const date = new Date(workspace.timestamp);
    const formattedDate = this.formatDate(date);

    // Session header with date
    const sessionHeader = document.createElement('div');
    sessionHeader.className = 'session-item-header';

    const dateElement = document.createElement('div');
    dateElement.className = 'session-date';
    dateElement.textContent = formattedDate;

    const countBadge = document.createElement('div');
    countBadge.className = 'session-count-badge';
    countBadge.textContent = `${workspace.groupCount} ${workspace.groupCount === 1 ? 'group' : 'groups'}`;

    sessionHeader.appendChild(dateElement);
    sessionHeader.appendChild(countBadge);

    // Group names preview
    const groupsPreview = document.createElement('div');
    groupsPreview.className = 'session-groups-preview';

    const groupsList = workspace.groupNames.slice(0, 3).join(', ');
    const moreCount = workspace.groupCount - 3;
    groupsPreview.textContent = groupsList + (moreCount > 0 ? `, +${moreCount} more` : '');

    item.appendChild(sessionHeader);
    item.appendChild(groupsPreview);

    // Click handler
    item.addEventListener('click', () => {
      this.selectSession(item);
    });

    // Keyboard handler
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectSession(item);
      }
    });

    return item;
  }

  private selectSession(item: HTMLElement): void {
    // Remove selected class from all items
    const allItems = this.modal!.querySelectorAll('.session-item');
    allItems.forEach((i) => i.classList.remove('selected'));

    // Add selected class to clicked item
    item.classList.add('selected');
    this.selectedFilename = item.getAttribute('data-filename');
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If today
    if (diffDays === 0) {
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    // If yesterday
    if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }

    // If within last week
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    // Otherwise full date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private close(resolve: (value: string | null) => void, value: string | null): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    resolve(value);
  }
}
