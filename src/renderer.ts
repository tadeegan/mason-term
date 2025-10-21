/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import { TerminalManager } from './components/TerminalManager';
import { WorkspaceManager } from './services/WorkspaceManager';
import { SessionPicker } from './components/SessionPicker';
import { SettingsPane } from './components/SettingsPane';

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', async () => {
  const appContainer = document.getElementById('app');
  const groupSidebarContainer = document.getElementById('group-sidebar');
  const tabBarContainer = document.getElementById('tab-bar');
  const terminalsContainer = document.getElementById('terminals-container');

  if (appContainer && groupSidebarContainer && tabBarContainer && terminalsContainer) {
    let terminalManager: TerminalManager;

    // Check for saved workspaces
    const workspaces = await WorkspaceManager.listWorkspaces();

    if (workspaces.length > 0) {
      // Show session picker
      const sessionPicker = new SessionPicker();
      const selectedFilename = await sessionPicker.show(workspaces);

      if (selectedFilename) {
        // Load selected workspace
        console.log(`Loading workspace: ${selectedFilename}`);
        const workspaceData = await WorkspaceManager.loadWorkspace(selectedFilename);

        // Create TerminalManager without initial group
        terminalManager = new TerminalManager(
          groupSidebarContainer,
          tabBarContainer,
          terminalsContainer,
          appContainer,
          true // Skip initial group
        );

        // Load workspace data, passing the filename so future saves update this file
        terminalManager.loadWorkspace(workspaceData, selectedFilename);
      } else {
        // Start fresh
        console.log('Starting fresh workspace');
        terminalManager = new TerminalManager(
          groupSidebarContainer,
          tabBarContainer,
          terminalsContainer,
          appContainer
        );
      }
    } else {
      // No saved workspaces, start fresh
      console.log('No saved workspaces, starting fresh');
      terminalManager = new TerminalManager(
        groupSidebarContainer,
        tabBarContainer,
        terminalsContainer,
        appContainer
      );
    }

    // Setup settings pane
    const settingsPane = new SettingsPane();
    settingsPane.onSave(async () => {
      // Refresh settings in terminal manager when settings are saved
      await terminalManager.refreshSettings();
    });

    // Listen for menu events to open settings
    window.terminalAPI.onMenuOpenSettings(() => {
      settingsPane.show();
    });

    // Setup mason command listener
    window.terminalAPI.onMasonCommand((command: string, path: string) => {
      console.log(`Mason command received: ${command} ${path}`);
      if (command === 'new-group') {
        terminalManager.handleMasonNewGroup(path);
      } else if (command === 'set') {
        terminalManager.handleMasonSet(path);
      }
    });

    // Setup keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + T: New Tab
      if (cmdOrCtrl && e.key === 't') {
        e.preventDefault();
        terminalManager.handleNewTabShortcut();
      }

      // Cmd/Ctrl + N: New Group
      if (cmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        terminalManager.handleNewGroupShortcut();
      }

      // Cmd/Ctrl + W: Close Tab
      if (cmdOrCtrl && e.key === 'w') {
        e.preventDefault();
        terminalManager.handleCloseTabShortcut();
      }

      // Cmd/Ctrl + 1-9: Switch to tab by index
      if (cmdOrCtrl && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key, 10);
        terminalManager.handleSwitchToTabByIndex(tabIndex);
      }

      // Cmd/Ctrl + ,: Open Settings
      if (cmdOrCtrl && e.key === ',') {
        e.preventDefault();
        settingsPane.show();
      }
    });

    console.log('Terminal Manager initialized with groups');
  } else {
    console.error('Required containers not found');
  }
});
