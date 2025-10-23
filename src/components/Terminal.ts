import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

export class Terminal {
  private xterm: XTerm;
  private fitAddon: FitAddon;
  private webLinksAddon: WebLinksAddon;
  private container: HTMLElement;
  private xtermWrapper: HTMLElement;
  private terminalId: string;
  private workingDir: string;
  private resizeObserver: ResizeObserver;
  private isVisible: boolean = true;
  private pendingData: string = '';

  constructor(container: HTMLElement, terminalId: string, workingDir: string, settings?: AppSettings) {
    this.container = container;
    this.terminalId = terminalId;
    this.workingDir = workingDir;

    // Create inner wrapper div with no padding for xterm
    this.xtermWrapper = document.createElement('div');
    this.xtermWrapper.className = 'xterm-wrapper';
    this.xtermWrapper.style.width = '100%';
    this.xtermWrapper.style.height = '100%';
    this.container.appendChild(this.xtermWrapper);

    // Use provided settings or fall back to defaults
    const terminalSettings = settings?.terminal || DEFAULT_SETTINGS.terminal;

    // Create xterm instance
    this.xterm = new XTerm({
      cursorBlink: terminalSettings.cursorBlink,
      fontSize: terminalSettings.fontSize,
      fontFamily: terminalSettings.fontFamily,
      cursorStyle: terminalSettings.cursorStyle,
      scrollback: terminalSettings.scrollbackLines,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    });

    // Setup fit addon
    this.fitAddon = new FitAddon();
    this.xterm.loadAddon(this.fitAddon);

    // Setup web links addon to make URLs clickable
    this.webLinksAddon = new WebLinksAddon((event: MouseEvent, uri: string) => {
      // Open links in the default browser
      window.terminalAPI.openExternal(uri);
    });
    this.xterm.loadAddon(this.webLinksAddon);

    // Open terminal in the wrapper (not the padded container)
    this.xterm.open(this.xtermWrapper);
    this.fitAddon.fit();

    // Setup event listeners
    this.setupListeners();

    // Create the PTY process
    this.initializeTerminal();

    // Use ResizeObserver to watch for wrapper size changes
    this.resizeObserver = new ResizeObserver(() => {
      this.fit();
    });
    this.resizeObserver.observe(this.xtermWrapper);
  }

  private async initializeTerminal(): Promise<void> {
    try {
      await window.terminalAPI.create(this.terminalId, this.workingDir);
      console.log(`Terminal ${this.terminalId} process created successfully in ${this.workingDir}`);
    } catch (error) {
      console.error(`Failed to create terminal ${this.terminalId} process:`, error);
    }
  }

  private setupListeners(): void {
    // Send input to backend
    this.xterm.onData((data: string) => {
      window.terminalAPI.sendData(this.terminalId, data);
    });

    // Receive output from backend
    window.terminalAPI.onData(this.terminalId, (data: string) => {
      this.xterm.write(data);
    });

    // Handle terminal exit
    window.terminalAPI.onExit(this.terminalId, (code: number) => {
      this.xterm.write(`\r\n\r\nProcess exited with code ${code}\r\n`);
    });
  }

  public fit(): void {
    this.fitAddon.fit();
    // Only send resize to PTY if terminal is visible
    // This prevents dimension collapse when terminal is hidden
    if (this.isVisible) {
      const { cols, rows } = this.xterm;
      window.terminalAPI.resize(this.terminalId, cols, rows);
    }
  }

  public show(): void {
    this.container.style.zIndex = '1';
    this.isVisible = true;
    // Restore proper dimensions after showing
    this.fit();
  }

  public hide(): void {
    this.container.style.zIndex = '0';
    this.isVisible = false;
  }

  public getId(): string {
    return this.terminalId;
  }

  public focus(): void {
    this.xterm.focus();
  }

  public dispose(): void {
    this.resizeObserver.disconnect();
    this.xterm.dispose();
  }
}
