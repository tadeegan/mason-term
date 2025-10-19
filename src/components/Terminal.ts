import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export class Terminal {
  private xterm: XTerm;
  private fitAddon: FitAddon;
  private container: HTMLElement;
  private xtermWrapper: HTMLElement;
  private terminalId: string;
  private workingDir: string;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, terminalId: string, workingDir: string) {
    this.container = container;
    this.terminalId = terminalId;
    this.workingDir = workingDir;

    // Create inner wrapper div with no padding for xterm
    this.xtermWrapper = document.createElement('div');
    this.xtermWrapper.className = 'xterm-wrapper';
    this.xtermWrapper.style.width = '100%';
    this.xtermWrapper.style.height = '100%';
    this.container.appendChild(this.xtermWrapper);

    // Create xterm instance
    this.xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
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
    const { cols, rows } = this.xterm;
    window.terminalAPI.resize(this.terminalId, cols, rows);
  }

  public show(): void {
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.style.display = 'none';
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
