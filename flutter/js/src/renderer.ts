let visibleCanvas: HTMLCanvasElement;
let canvas2d: CanvasRenderingContext2D | null = null;
let yuvCanvas: any;
let yuvWorker: Worker | null = null;
let lastDw = 0, lastDh = 0;

export function init(canvas: HTMLCanvasElement): void {
  visibleCanvas = canvas;

  if ((YUVCanvas as any).WebGLFrameSink.isAvailable()) {
    yuvCanvas = (YUVCanvas as any).attach(canvas, { webGL: true });
  } else {
    yuvWorker = new Worker('./yuv.js');
    canvas2d = canvas.getContext('2d');
    yuvWorker.onmessage = (e: MessageEvent) => {
      const { frame } = e.data;
      if (!canvas2d) return;
      const width = visibleCanvas.width;
      const height = visibleCanvas.height;
      const imageData = canvas2d.createImageData(width, height);
      imageData.data.set(frame);
      canvas2d.putImageData(imageData, 0, 0);
    };
  }
}

export function drawFrame(display: number, frame: any): void {
  if (!visibleCanvas) return;

  if (yuvWorker) {
    yuvWorker.postMessage({ display, frame });
  } else if (yuvCanvas) {
    const dw = frame.format.displayWidth;
    const dh = frame.format.displayHeight;
    if (dw !== lastDw || dh !== lastDh) {
      lastDw = dw;
      lastDh = dh;
      visibleCanvas.width = dw;
      visibleCanvas.height = dh;
    }
    yuvCanvas.drawFrame(frame);
  }
}

export function sendOffscreenCanvas(c: HTMLCanvasElement): void {
  if (!yuvWorker) return;
  const offscreen = c.transferControlToOffscreen();
  yuvWorker.postMessage({ canvas: offscreen }, [offscreen]);
}
