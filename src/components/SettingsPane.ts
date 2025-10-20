import { AppSettings } from '../types/settings';

export class SettingsPane {
  private modal: HTMLElement | null = null;
  private settings: AppSettings | null = null;
  private onSaveCallback: ((settings: AppSettings) => void) | null = null;

  async show() {
    // Load current settings
    try {
      this.settings = await window.terminalAPI.loadSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      return;
    }

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal';
    this.modal.innerHTML = `
      <div class="settings-modal-content">
        <h2 class="settings-title">Settings</h2>

        <div class="settings-section">
          <h3 class="settings-section-title">Terminal</h3>

          <div class="settings-form-group">
            <label class="settings-label" for="scrollback-lines">
              Scrollback Lines
              <span class="settings-hint">Number of lines to keep in terminal history (100-50000)</span>
            </label>
            <input
              type="number"
              id="scrollback-lines"
              class="settings-input"
              value="${this.settings.terminal.scrollbackLines}"
              min="100"
              max="50000"
              step="100"
            />
          </div>
        </div>

        <div class="settings-buttons">
          <button class="settings-button settings-button-secondary" id="settings-reset">
            Reset to Defaults
          </button>
          <div class="settings-buttons-right">
            <button class="settings-button settings-button-secondary" id="settings-cancel">
              Cancel
            </button>
            <button class="settings-button settings-button-primary" id="settings-save">
              Save
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const saveButton = this.modal.querySelector('#settings-save') as HTMLButtonElement;
    const cancelButton = this.modal.querySelector('#settings-cancel') as HTMLButtonElement;
    const resetButton = this.modal.querySelector('#settings-reset') as HTMLButtonElement;

    saveButton.addEventListener('click', () => this.save());
    cancelButton.addEventListener('click', () => this.hide());
    resetButton.addEventListener('click', () => this.reset());

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Add to document
    document.body.appendChild(this.modal);
  }

  hide() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  async save() {
    if (!this.modal || !this.settings) return;

    // Get form values
    const scrollbackInput = this.modal.querySelector('#scrollback-lines') as HTMLInputElement;
    const scrollbackLines = parseInt(scrollbackInput.value, 10);

    // Validate
    if (isNaN(scrollbackLines) || scrollbackLines < 100 || scrollbackLines > 50000) {
      alert('Scrollback lines must be between 100 and 50,000');
      return;
    }

    // Update settings
    this.settings.terminal.scrollbackLines = scrollbackLines;

    // Save to file
    try {
      await window.terminalAPI.saveSettings(this.settings);

      // Notify callback if registered
      if (this.onSaveCallback) {
        this.onSaveCallback(this.settings);
      }

      this.hide();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  }

  async reset() {
    if (!confirm('Reset all settings to defaults? This action cannot be undone.')) {
      return;
    }

    try {
      this.settings = await window.terminalAPI.resetSettings();

      // Update form values
      if (this.modal) {
        const scrollbackInput = this.modal.querySelector('#scrollback-lines') as HTMLInputElement;
        scrollbackInput.value = this.settings.terminal.scrollbackLines.toString();
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      alert('Failed to reset settings. Please try again.');
    }
  }

  onSave(callback: (settings: AppSettings) => void) {
    this.onSaveCallback = callback;
  }
}
