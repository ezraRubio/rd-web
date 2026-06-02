import Connection from './connection';
import * as globals from './globals';
import { bus } from './eventBus';
import * as renderer from './renderer';
import * as connectionStatus from './connectionStatus';
import * as loginDialog from './loginDialog';
import * as cursorHandler from './cursorHandler';
import * as fullscreen from './fullscreen';
import * as inputHandler from './inputHandler';
import * as toolbar from './toolbar';

export function init(): void {
  document.body.innerHTML = `
    <canvas id="remote-screen"></canvas>
  `;

  const canvas = document.getElementById('remote-screen') as HTMLCanvasElement;

  renderer.init(canvas);
  connectionStatus.init(document.body);
  loginDialog.init(document.body);
  toolbar.init(document.body);
  fullscreen.init();
  cursorHandler.init(canvas);

  bus.on('connection_ready', () => {
    toolbar.show();
    canvas.focus();
  });

  document.addEventListener('connection', (e: Event) => {
    const customEvent = e as CustomEvent;
    const { clientId, token, server, key, response } = customEvent.detail;

    localStorage.setItem('override:custom-rendezvous-server', server);
    localStorage.setItem('override:key', key);

    const conn = new Connection();
    conn.setMsgbox((type: string, title: string, text: string) => {
      bus.emit('msgbox', { type, title, text });
    });
    conn.setDraw((display: number, frame: any) => {
      renderer.drawFrame(display, frame);
    });
    globals.setConn(conn);

    inputHandler.bind(canvas, conn);

    loginDialog.setCallback((password: string, remember: boolean) => {
      conn.setRemember(remember);
      conn.login(password);
    });

    bus.on('password_required', () => {
      loginDialog.show();
    });

    conn.start(clientId, token)
      .then(() => response(true))
      .catch(() => response(false));
  });
}
