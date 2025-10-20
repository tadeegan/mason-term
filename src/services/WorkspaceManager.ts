import { WorkspaceData, WorkspaceMetadata, PersistedGroup } from '../types/workspace';
import { Group } from '../types/group';

export class WorkspaceManager {
  private static readonly VERSION = '1.0.0';

  /**
   * Save the current workspace state to a timestamped file
   * @param groups Array of groups to persist
   * @returns The filename that was saved
   */
  static async saveWorkspace(groups: Group[]): Promise<string> {
    const persistedGroups: PersistedGroup[] = groups.map((group) => ({
      id: group.id,
      title: group.title,
      workingDir: group.workingDir,
    }));

    const workspaceData: WorkspaceData = {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      groups: persistedGroups,
    };

    try {
      const filename = await window.terminalAPI.saveWorkspace(workspaceData);
      console.log(`Workspace saved to: ${filename}`);
      return filename;
    } catch (error) {
      console.error('Failed to save workspace:', error);
      throw error;
    }
  }

  /**
   * Load a workspace from a file
   * @param filename The workspace filename to load
   * @returns The workspace data
   */
  static async loadWorkspace(filename: string): Promise<WorkspaceData> {
    try {
      const data = await window.terminalAPI.loadWorkspace(filename);
      console.log(`Workspace loaded from: ${filename}`);
      return data;
    } catch (error) {
      console.error('Failed to load workspace:', error);
      throw error;
    }
  }

  /**
   * List all available workspace sessions
   * @returns Array of workspace metadata
   */
  static async listWorkspaces(): Promise<WorkspaceMetadata[]> {
    try {
      const workspaces = await window.terminalAPI.listWorkspaces();
      // Sort by timestamp descending (most recent first)
      return workspaces.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to list workspaces:', error);
      throw error;
    }
  }

  /**
   * Generate a filename for the current timestamp
   * Format: workspace-YYYY-MM-DD-HH-MM-SS.json
   */
  static generateFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `workspace-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.json`;
  }
}
