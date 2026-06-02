import type Connection from './connection';

let canvas: HTMLElement | null = null;
let conn: Connection | null = null;
let lastX = 0, lastY = 0;

export function bind(canvasEl: HTMLElement, connection: Connection): void {
  canvas = canvasEl;
  conn = connection;

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  canvas.setAttribute('tabindex', '0');
  canvas.focus();
}

export function unbind(): void {
  if (!canvas) return;

  canvas.removeEventListener('keydown', onKeyDown);
  canvas.removeEventListener('keyup', onKeyUp);
  canvas.removeEventListener('mousemove', onMouseMove);
  canvas.removeEventListener('mousedown', onMouseDown);
  canvas.removeEventListener('mouseup', onMouseUp);
  canvas.removeEventListener('wheel', onWheel);

  canvas = null;
  conn = null;
}

function getMods(e: MouseEvent | KeyboardEvent | WheelEvent) {
  return {
    alt: e.altKey,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    command: e.metaKey,
  };
}

function onKeyDown(e: KeyboardEvent): void {
  if (!conn) return;
  e.preventDefault();
  const m = getMods(e);
  conn.inputKey(e.key, true, true, m.alt, m.ctrl, m.shift, m.command);
}

function onKeyUp(e: KeyboardEvent): void {
  if (!conn) return;
  const m = getMods(e);
  conn.inputKey(e.key, false, false, m.alt, m.ctrl, m.shift, m.command);
}

function onMouseMove(e: MouseEvent): void {
  if (!conn) return;
  lastX = e.clientX;
  lastY = e.clientY;
  const m = getMods(e);
  const mask = 0;
  conn.inputMouse(mask, lastX, lastY, m.alt, m.ctrl, m.shift, m.command);
}

function onMouseDown(e: MouseEvent): void {
  if (!conn) return;
  lastX = e.clientX;
  lastY = e.clientY;
  const m = getMods(e);
  let mask = 1;
  mask |= buttonToMask(e.button) << 3;
  conn.inputMouse(mask, lastX, lastY, m.alt, m.ctrl, m.shift, m.command);
}

function onMouseUp(e: MouseEvent): void {
  if (!conn) return;
  lastX = e.clientX;
  lastY = e.clientY;
  const m = getMods(e);
  let mask = 2;
  mask |= buttonToMask(e.button) << 3;
  conn.inputMouse(mask, lastX, lastY, m.alt, m.ctrl, m.shift, m.command);
}

function onWheel(e: WheelEvent): void {
  if (!conn) return;
  e.preventDefault();
  lastX = e.clientX;
  lastY = e.clientY;
  const m = getMods(e);
  let mask = 3;
  if (e.deltaY < 0) {
    mask |= 1 << 3;
  } else {
    mask |= 2 << 3;
  }
  conn.inputMouse(mask, lastX, lastY, m.alt, m.ctrl, m.shift, m.command);
}

function buttonToMask(button: number): number {
  switch (button) {
    case 0: return 1;
    case 1: return 4;
    case 2: return 2;
    default: return 1;
  }
}
