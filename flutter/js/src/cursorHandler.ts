import { bus } from './eventBus';

let canvasElement: HTMLElement | null = null;
let cursorCanvas: HTMLCanvasElement | null = null;

export function init(canvas: HTMLElement): void {
  canvasElement = canvas;
  cursorCanvas = document.createElement('canvas');

  bus.on('cursor_data', (data: any) => {
    setCursorFromData(data);
  });

  bus.on('cursor_id', () => {
    resetCursor();
  });
}

function setCursorFromData(data: any): void {
  if (!canvasElement || !cursorCanvas) return;
  const { width, height, hotx, hoty, colors } = data;
  if (!width || !height || !colors) return;
  cursorCanvas.width = width;
  cursorCanvas.height = height;
  const ctx = cursorCanvas.getContext('2d');
  if (!ctx) return;
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(colors);
  ctx.putImageData(imageData, 0, 0);
  const url = cursorCanvas.toDataURL();
  canvasElement.style.cursor = `url(${url}) ${hotx || 0} ${hoty || 0}, auto`;
}

export function resetCursor(): void {
  if (canvasElement) {
    canvasElement.style.cursor = 'default';
  }
}
