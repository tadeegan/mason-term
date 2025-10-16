import { ProcessInfo } from '../types/process';
import { Tab } from '../types/tab';

export class ProcessMonitorCard {
  private card: HTMLElement | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isHovering = false;
  private currentGroupId: string | null = null;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;

  constructor(private appContainer: HTMLElement) {}

  public async show(groupTitle: string, groupTabs: Tab[]): Promise<void> {
    this.isHovering = true;

    // Cancel any pending hide operation
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Get a stable group ID from the tabs
    const groupId = groupTabs.length > 0 ? groupTabs[0].groupId : groupTitle;

    // If we're already showing this group, don't re-initialize
    if (this.currentGroupId === groupId && this.card) {
      return;
    }

    this.currentGroupId = groupId;

    // Clear any existing debounce
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Clear existing interval if any
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Create card if it doesn't exist
    if (!this.card) {
      this.card = document.createElement('div');
      this.card.className = 'process-monitor-card';
      this.appContainer.appendChild(this.card);

      // Add fade-in animation
      setTimeout(() => {
        this.card?.classList.add('visible');
      }, 10);
    }

    // Start updating process info
    await this.updateProcessInfo(groupTitle, groupTabs);

    // Update every 2 seconds while hovering
    this.updateInterval = setInterval(async () => {
      if (this.isHovering && this.currentGroupId === groupId) {
        await this.updateProcessInfo(groupTitle, groupTabs);
      }
    }, 2000);
  }

  public hide(): void {
    this.isHovering = false;

    // Delay hiding to allow moving between groups without flickering
    // If show() is called within this delay, it will cancel the hide
    this.hideTimeout = setTimeout(() => {
      this.currentGroupId = null;

      // Clear update interval
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Clear any pending debounce
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }

      // Fade out and remove card
      if (this.card) {
        this.card.classList.remove('visible');
        setTimeout(() => {
          if (this.card && this.card.parentElement) {
            this.card.parentElement.removeChild(this.card);
          }
          this.card = null;
        }, 200); // Match CSS transition duration
      }

      this.hideTimeout = null;
    }, 150); // 150ms grace period for moving between groups
  }

  private async updateProcessInfo(groupTitle: string, groupTabs: Tab[]): Promise<void> {
    if (!this.card) return;

    // Fetch process info for all tabs
    const processInfoPromises = groupTabs.map((tab) =>
      window.terminalAPI.getProcessInfo(tab.id).then((info) => ({
        tab,
        info,
      }))
    );

    const results = await Promise.all(processInfoPromises);

    // Collect all ports across all terminals
    const allPorts = new Set<number>();
    let totalCpu = 0;
    let totalMemory = 0;

    const validResults = results.filter((r) => r.info !== null);

    validResults.forEach((r) => {
      if (r.info) {
        r.info.ports.forEach((port) => allPorts.add(port));
        totalCpu += r.info.cpuPercent;
        totalMemory += r.info.memoryMB;
      }
    });

    // Build card HTML
    const portsArray = Array.from(allPorts).sort((a, b) => a - b);

    let html = `
      <div class="process-monitor-header">
        <h3>${groupTitle}</h3>
        <div class="process-monitor-summary">
          <span class="summary-item">
            <span class="summary-label">Total CPU:</span>
            <span class="summary-value">${totalCpu.toFixed(1)}%</span>
          </span>
          <span class="summary-item">
            <span class="summary-label">Total Memory:</span>
            <span class="summary-value">${totalMemory.toFixed(1)} MB</span>
          </span>
        </div>
      </div>
    `;

    if (portsArray.length > 0) {
      html += `
        <div class="process-monitor-ports">
          <div class="ports-label">Listening Ports:</div>
          <div class="ports-list">
            ${portsArray.map((port) => `<span class="port-badge">${port}</span>`).join('')}
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="process-monitor-ports">
          <div class="ports-label">No ports listening</div>
        </div>
      `;
    }

    html += '<div class="process-monitor-terminals">';

    if (validResults.length === 0) {
      html += '<div class="no-terminals">No active terminals</div>';
    } else {
      validResults.forEach(({ tab, info }) => {
        if (info) {
          html += `
            <div class="terminal-info-item">
              <div class="terminal-info-header">
                <span class="terminal-title">${tab.title}</span>
                <span class="terminal-pid">PID: ${info.pid}</span>
              </div>
              <div class="terminal-info-details">
                <span class="terminal-process">${info.processName}</span>
                <span class="terminal-cpu">CPU: ${info.cpuPercent.toFixed(1)}%</span>
                <span class="terminal-memory">Mem: ${info.memoryMB.toFixed(1)} MB</span>
              </div>
              ${
                info.ports.length > 0
                  ? `
                <div class="terminal-ports">
                  Ports: ${info.ports.join(', ')}
                </div>
              `
                  : ''
              }
            </div>
          `;
        }
      });
    }

    html += '</div>';

    // Check if card still exists before updating (might have been hidden during async operations)
    if (this.card) {
      this.card.innerHTML = html;
    }
  }
}
