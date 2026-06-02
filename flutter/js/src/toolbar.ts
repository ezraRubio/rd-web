import { bus } from './eventBus';
import * as fullscreen from './fullscreen';

let toolbarEl: HTMLElement | null = null;

interface ToggleDef {
  id: string;
  label: string;
  optionKey: string;
}

const toggles: ToggleDef[] = [
  { id: 'toggle-cursor', label: 'Cursor', optionKey: 'show-remote-cursor' },
  { id: 'toggle-audio', label: 'Audio', optionKey: 'disable-audio' },
  { id: 'toggle-clipboard', label: 'Clipboard', optionKey: 'disable-clipboard' },
  { id: 'toggle-viewonly', label: 'View Only', optionKey: 'view-only' },
];

export function init(parent: HTMLElement): void {
  toolbarEl = document.createElement('div');
  toolbarEl.id = 'toolbar';

  const groups: Array<{ label?: string; html: string }> = [
    {
      html: `
        <button id="tb-disconnect" class="danger" title="Disconnect">Disconnect</button>
        <button id="tb-fullscreen" title="Fullscreen">Fullscreen</button>
      `,
    },
    {
      label: 'View',
      html: `
        <select id="tb-viewstyle">
          <option value="original">Original</option>
          <option value="adaptive" selected>Adaptive</option>
          <option value="scaled">Scaled</option>
        </select>
        <select id="tb-scrollstyle">
          <option value="scrollauto" selected>Auto Scroll</option>
          <option value="scrollbar">Scrollbar</option>
        </select>
        <select id="tb-quality">
          <option value="low">Low</option>
          <option value="balanced" selected>Balanced</option>
          <option value="best">Best</option>
        </select>
      `,
    },
    {
      html: `
        <button id="tb-ctrlaltdel" title="Send Ctrl+Alt+Del">CAD</button>
        <button id="tb-lock" title="Lock remote screen">Lock</button>
        <button id="tb-refresh" title="Refresh screen">Refresh</button>
        <button id="tb-reconnect" title="Reconnect">Reconnect</button>
      `,
    },
  ];

  for (const toggle of toggles) {
    if (!groups[1]) continue;
    const btn = document.createElement('button');
    btn.id = toggle.id;
    btn.className = 'toggle';
    btn.textContent = toggle.label;
    btn.title = `Toggle ${toggle.label}`;
    groups[1].html = btn.outerHTML + groups[1].html;
  }

  let html = '';
  for (const g of groups) {
    if (g.label) {
      html += `<span class="group-label">${g.label}</span>`;
    }
    html += `<div class="group">${g.html}</div>`;
  }

  toolbarEl.innerHTML = html;
  parent.appendChild(toolbarEl);

  bindEvents();
}

function getConn() {
  return (window as any).curConn;
}

function bindEvents(): void {
  if (!toolbarEl) return;

  toolbarEl.querySelector('#tb-disconnect')?.addEventListener('click', () => {
    const conn = getConn();
    if (conn) conn.close();
    hide();
  });

  toolbarEl.querySelector('#tb-fullscreen')?.addEventListener('click', () => {
    fullscreen.toggle();
  });

  toolbarEl.querySelector('#tb-ctrlaltdel')?.addEventListener('click', () => {
    getConn()?.ctrlAltDel();
  });

  toolbarEl.querySelector('#tb-lock')?.addEventListener('click', () => {
    getConn()?.lockScreen();
  });

  toolbarEl.querySelector('#tb-refresh')?.addEventListener('click', () => {
    getConn()?.refresh();
  });

  toolbarEl.querySelector('#tb-reconnect')?.addEventListener('click', () => {
    getConn()?.reconnect();
  });

  toolbarEl.querySelector('#tb-viewstyle')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const conn = getConn();
    if (conn) conn.setOption('view_style', val);
  });

  toolbarEl.querySelector('#tb-scrollstyle')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const conn = getConn();
    if (conn) conn.setOption('scroll_style', val);
  });

  toolbarEl.querySelector('#tb-quality')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const conn = getConn();
    if (conn) conn.setImageQuality(val);
  });

  for (const toggle of toggles) {
    const btn = toolbarEl.querySelector(`#${toggle.id}`);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const conn = getConn();
      if (conn) conn.toggleOption(toggle.optionKey);
    });
    bus.on('permission', (data: any) => {
      if (data[toggle.optionKey.replace('disable-', '')] !== undefined) {
        btn.classList.toggle('active', !data[toggle.optionKey.replace('disable-', '')]);
      }
    });
  }
}

export function show(): void {
  if (toolbarEl) toolbarEl.classList.add('visible');
}

export function hide(): void {
  if (toolbarEl) toolbarEl.classList.remove('visible');
}
