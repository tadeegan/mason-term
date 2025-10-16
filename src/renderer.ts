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

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
  const groupSidebarContainer = document.getElementById('group-sidebar');
  const tabBarContainer = document.getElementById('tab-bar');
  const terminalsContainer = document.getElementById('terminals-container');

  if (groupSidebarContainer && tabBarContainer && terminalsContainer) {
    const terminalManager = new TerminalManager(
      groupSidebarContainer,
      tabBarContainer,
      terminalsContainer
    );

    // Setup mason command listener
    window.terminalAPI.onMasonCommand((command: string, path: string) => {
      console.log(`Mason command received: ${command} ${path}`);
      if (command === 'new-group') {
        terminalManager.handleMasonNewGroup(path);
      }
    });

    console.log('Terminal Manager initialized with groups');
  } else {
    console.error('Required containers not found');
  }
});
