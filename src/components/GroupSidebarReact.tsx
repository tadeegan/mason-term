import React, { useEffect, useState, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Group } from '../types/group';
import { Tab } from '../types/tab';
import { ProcessMonitorCard } from './ProcessMonitorCard';

interface GroupStats {
  memory: number;
  ports: number[];
}

interface GroupItemProps {
  group: Group;
  allTabs: Tab[];
  isActive: boolean;
  stats: GroupStats | null;
  onSelect: (groupId: string) => void;
  onRename: (groupId: string, newTitle: string) => void;
  onShowMonitor: (group: Group, tabs: Tab[]) => void;
  onHideMonitor: () => void;
}

const GroupItem: React.FC<GroupItemProps> = ({
  group,
  allTabs,
  isActive,
  stats,
  onSelect,
  onRename,
  onShowMonitor,
  onHideMonitor,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(group.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const shortenPath = (path: string): string => {
    if (typeof process !== 'undefined' && process.env) {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      if (home && path.startsWith(home)) {
        return '~' + path.substring(home.length);
      }
    }
    return path;
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(group.title);
    setIsEditing(true);
  };

  const handleSaveRename = () => {
    const newTitle = editValue.trim();
    if (newTitle && newTitle !== group.title) {
      onRename(group.id, newTitle);
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditValue(group.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.terminalAPI.openInEditor(group.workingDir);
  };

  const handlePrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (group.pr) {
      window.terminalAPI.openExternal(group.pr.url);
    }
  };

  const groupTabs = allTabs.filter(tab => tab.groupId === group.id);

  return (
    <div
      className={`group-item ${isActive ? 'active' : ''}`}
      data-group-id={group.id}
      onClick={() => onSelect(group.id)}
      onMouseEnter={() => onShowMonitor(group, groupTabs)}
      onMouseLeave={() => onHideMonitor()}
    >
      <div className="group-title-row">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="group-title-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="group-title">{group.title}</div>
        )}
        <div className="group-icons-container">
          <span
            className="group-editor-icon"
            title="Open in editor"
            onClick={handleEditorClick}
          >
            📝
          </span>
          <span
            className="group-rename-icon"
            title="Rename group"
            onClick={handleRenameClick}
          >
            ✏️
          </span>
        </div>
      </div>

      <div className="group-dir-container">
        {group.gitBranch && (
          <span className="git-branch-badge" title={`Git branch: ${group.gitBranch}`}>
            <span
              style={{
                marginRight: '4px',
                verticalAlign: 'baseline',
                display: 'inline-flex',
              }}
              dangerouslySetInnerHTML={{
                __html:
                  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
              }}
            />
            {group.gitBranch}
          </span>
        )}

        {group.pr && (
          <span
            className="pr-badge"
            title={`Pull Request: ${group.pr.title}`}
            style={{ cursor: 'pointer' }}
            onClick={handlePrClick}
          >
            <span
              style={{
                marginRight: '4px',
                verticalAlign: 'baseline',
                display: 'inline-flex',
              }}
              dangerouslySetInnerHTML={{
                __html:
                  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/></svg>',
              }}
            />
            #{group.pr.number}
          </span>
        )}

        <span className="group-path" title={group.workingDir}>
          {shortenPath(group.workingDir)}
        </span>
      </div>

      <div className="group-stats">
        {stats && (
          <>
            {stats.memory > 0 && <span>{stats.memory.toFixed(0)}MB</span>}
            {stats.ports.length > 0 && stats.ports.map(port => (
              <span key={port} className="port-badge" title={`Port ${port}`}>
                :{port}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

interface GroupSidebarProps {
  groups: Group[];
  allTabs: Tab[];
  groupStats: Map<string, GroupStats>;
  onGroupSelect: (groupId: string) => void;
  onNewGroup: () => void;
  onGroupRename: (groupId: string, newTitle: string) => void;
  onGroupUpdate: (groupId: string, updates: Partial<Group>) => void;
}

const GroupSidebarComponent: React.FC<GroupSidebarProps> = ({
  groups,
  allTabs,
  groupStats,
  onGroupSelect,
  onNewGroup,
  onGroupRename,
  onGroupUpdate,
}) => {
  const processMonitorCardRef = useRef<ProcessMonitorCard | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update git branches and PRs every 3 seconds
    updateIntervalRef.current = setInterval(() => {
      updateGitBranches();
      updatePrs();
    }, 3000);

    // Initial update
    updateGitBranches();
    updatePrs();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Re-run updates when groups change
  useEffect(() => {
    updateGitBranches();
    updatePrs();
  }, [groups]);

  const updateGitBranches = async () => {
    const groupsSnapshot = [...groups];

    for (const group of groupsSnapshot) {
      try {
        const branch = await window.terminalAPI.getGitBranch(group.workingDir);
        const currentGroup = groups.find(g => g.id === group.id);

        if (!currentGroup) {
          console.log(`Group ${group.id} no longer exists, skipping branch update`);
          continue;
        }

        if (branch !== currentGroup.gitBranch) {
          console.log(`Branch changed for group ${group.id} (${group.title}):`,
            currentGroup.gitBranch || 'none', '→', branch || 'none'
          );
          onGroupUpdate(group.id, { gitBranch: branch });
        }
      } catch (error) {
        console.error(`Failed to get git branch for group ${group.id}:`, error);
      }
    }
  };

  const updatePrs = async () => {
    console.log('\n=== React GroupSidebar: updatePrs() called ===');
    console.log('Current groups:', groups.map(g => ({ id: g.id, title: g.title, pr: g.pr })));

    const groupsSnapshot = [...groups];

    for (const group of groupsSnapshot) {
      console.log(`\n--- Checking PR for group ${group.id} (${group.title}) ---`);
      console.log(`  Working dir: ${group.workingDir}`);
      console.log(`  Current PR state:`, group.pr);

      try {
        const pr = await window.terminalAPI.getPr(group.workingDir);
        console.log(`  Detected PR:`, pr);

        const currentGroup = groups.find(g => g.id === group.id);
        if (!currentGroup) {
          console.log(`  Group ${group.id} no longer exists, skipping PR update`);
          continue;
        }

        const prChanged =
          (!pr && currentGroup.pr) ||
          (pr && !currentGroup.pr) ||
          (pr && currentGroup.pr && pr.number !== currentGroup.pr.number);

        console.log(`  PR changed? ${prChanged}`);
        console.log(`    (!pr && currentGroup.pr): ${!pr && currentGroup.pr}`);
        console.log(`    (pr && !currentGroup.pr): ${pr && !currentGroup.pr}`);
        console.log(`    (pr && currentGroup.pr && pr.number !== currentGroup.pr.number): ${pr && currentGroup.pr && pr.number !== currentGroup.pr.number}`);

        if (prChanged) {
          console.log(`  ✅ PR changed for group ${group.id} (${group.title}):`,
            currentGroup.pr ? `#${currentGroup.pr.number}` : 'none', '→', pr ? `#${pr.number}` : 'none'
          );
          onGroupUpdate(group.id, { pr });
        } else {
          console.log(`  ⏭️  No change, skipping`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to get PR for group ${group.id}:`, error);
      }
    }
  };

  const handleShowMonitor = (group: Group, tabs: Tab[]) => {
    if (processMonitorCardRef.current) {
      processMonitorCardRef.current.show(group.title, tabs);
    }
  };

  const handleHideMonitor = () => {
    if (processMonitorCardRef.current) {
      processMonitorCardRef.current.hide();
    }
  };

  return (
    <>
      <div className="groups-header">
        <span
          style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-flex' }}
          dangerouslySetInnerHTML={{
            __html:
              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
          }}
        />
        Threads
      </div>

      <div className="groups-list">
        {groups.map(group => (
          <GroupItem
            key={group.id}
            group={group}
            allTabs={allTabs}
            isActive={group.isActive}
            stats={groupStats.get(group.id) || null}
            onSelect={onGroupSelect}
            onRename={onGroupRename}
            onShowMonitor={handleShowMonitor}
            onHideMonitor={handleHideMonitor}
          />
        ))}
      </div>

      <div className="new-group-container">
        <button
          className="new-group-button"
          title="New Group (⌘N)"
          onClick={onNewGroup}
        >
          +
        </button>
        <span className="new-group-hint">⌘N</span>
      </div>
    </>
  );
};

export class GroupSidebarReact {
  private root: Root | null = null;
  private container: HTMLElement;
  private reactContainer: HTMLElement;
  private resizeHandle: HTMLElement;
  private groupStats: Map<string, GroupStats> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private currentGroups: Group[] = [];
  private currentTabs: Tab[] = [];
  private callbacks: {
    onGroupSelect: (groupId: string) => void;
    onNewGroup: () => void;
    onGroupRename: (groupId: string, newTitle: string) => void;
    onGroupUpdate: (groupId: string, updates: Partial<Group>) => void;
  };

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
    this.callbacks = callbacks;

    // Create a container for React content
    this.reactContainer = document.createElement('div');
    this.reactContainer.className = 'react-container';
    this.reactContainer.style.flex = '1';
    this.reactContainer.style.overflow = 'auto';
    this.container.appendChild(this.reactContainer);

    // Create resize handle outside React
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'sidebar-resize-handle';
    this.container.appendChild(this.resizeHandle);
    this.setupResizeHandle();

    // Create React root in the react container, not the main container
    this.root = createRoot(this.reactContainer);

    // Start stats update interval
    this.updateInterval = setInterval(() => {
      this.updateGroupStats();
    }, 3000);

    // Initial stats update
    this.updateGroupStats();
  }

  public render(groups: Group[], allTabs: Tab[]): void {
    this.currentGroups = groups;
    this.currentTabs = allTabs;

    if (this.root) {
      this.root.render(
        <GroupSidebarComponent
          groups={groups}
          allTabs={allTabs}
          groupStats={this.groupStats}
          onGroupSelect={this.callbacks.onGroupSelect}
          onNewGroup={this.callbacks.onNewGroup}
          onGroupRename={this.callbacks.onGroupRename}
          onGroupUpdate={this.callbacks.onGroupUpdate}
        />
      );
    }

    // Update stats after render
    this.updateGroupStats();
  }

  private async updateGroupStats(): Promise<void> {
    const newStats = new Map<string, GroupStats>();

    for (const group of this.currentGroups) {
      const groupTabs = this.currentTabs.filter(tab => tab.groupId === group.id);
      if (groupTabs.length === 0) continue;

      const processInfoPromises = groupTabs.map(tab =>
        window.terminalAPI.getProcessInfo(tab.id).then(info => info)
      );

      const allProcessInfo = await Promise.all(processInfoPromises);
      const validInfo = allProcessInfo.filter(info => info !== null);

      if (validInfo.length === 0) continue;

      let totalMemory = 0;
      const allPorts = new Set<number>();

      validInfo.forEach(info => {
        if (info) {
          totalMemory += info.memoryMB;
          info.ports.forEach(port => allPorts.add(port));
        }
      });

      const portsArray = Array.from(allPorts).sort((a, b) => a - b);

      newStats.set(group.id, {
        memory: totalMemory,
        ports: portsArray,
      });
    }

    this.groupStats = newStats;

    // Re-render with updated stats
    if (this.root && this.currentGroups.length > 0) {
      this.root.render(
        <GroupSidebarComponent
          groups={this.currentGroups}
          allTabs={this.currentTabs}
          groupStats={this.groupStats}
          onGroupSelect={this.callbacks.onGroupSelect}
          onNewGroup={this.callbacks.onNewGroup}
          onGroupRename={this.callbacks.onGroupRename}
          onGroupUpdate={this.callbacks.onGroupUpdate}
        />
      );
    }
  }

  private setupResizeHandle(): void {
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
}
