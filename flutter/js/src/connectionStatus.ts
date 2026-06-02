import { bus } from './eventBus';

let container: HTMLElement | null = null;
let currentToast: HTMLElement | null = null;
let dismissTimer: number | null = null;

export function init(parent: HTMLElement): void {
  container = document.createElement('div');
  container.id = 'connection-status';
  parent.appendChild(container);

  bus.on('msgbox', onMsgbox);
}

interface MsgboxData {
  type: string;
  title: string;
  text: string;
  link?: string;
  hasRetry?: string;
}

function onMsgbox(data: MsgboxData): void {
  if (!data.type) return;
  if (data.type === 'error' && !data.text) return;

  dismissCurrent();

  switch (data.type) {
    case 'connecting':
      showToast(data.text || 'Connecting...', 'connecting');
      break;
    case 'success':
      showToast(data.text || 'Connected', 'success');
      autoDismiss(3000);
      break;
    case 'error':
      showErrorToast(data);
      break;
    case 'input-password':
    case 're-input-password':
      bus.emit('password_required', { retry: data.type === 're-input-password' });
      break;
    case 'msgbox':
      showToast(data.text || '', 'info');
      autoDismiss(3000);
      break;
    default:
      showToast(data.text || data.title || '', 'info');
      autoDismiss(3000);
  }
}

function showToast(text: string, className: string): void {
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${className}`;
  el.textContent = text;
  container.appendChild(el);
  currentToast = el;
}

function showErrorToast(data: MsgboxData): void {
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast error';

  const textSpan = document.createElement('span');
  textSpan.textContent = data.title ? `${data.title}: ${data.text}` : (data.text || 'Error');
  el.appendChild(textSpan);

  if (data.hasRetry === 'true') {
    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.onclick = () => {
      import('./globals').then(g => {
        const conn = g.getConn();
        if (conn) conn.reconnect();
        dismissCurrent();
      });
    };
    el.appendChild(retryBtn);
  }

  if (data.link) {
    const linkBtn = document.createElement('button');
    linkBtn.textContent = 'Details';
    linkBtn.onclick = () => window.open(data.link, '_blank');
    el.appendChild(linkBtn);
  }

  container!.appendChild(el);
  currentToast = el;
}

function autoDismiss(ms: number): void {
  dismissTimer = window.setTimeout(dismissCurrent, ms);
}

export function dismissCurrent(): void {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  if (currentToast && currentToast.parentNode) {
    currentToast.style.animation = 'toastOut 0.2s ease-in forwards';
    setTimeout(() => {
      if (currentToast && currentToast.parentNode) {
        currentToast.parentNode.removeChild(currentToast);
      }
      currentToast = null;
    }, 200);
  }
}
