/// <reference types="vite/client" />

interface YUVCanvasFrameSink {
  isAvailable(): boolean;
}

interface YUVCanvasStatic {
  attach(canvas: HTMLCanvasElement, options: { webGL: boolean }): any;
  WebGLFrameSink: YUVCanvasFrameSink;
}

declare var YUVCanvas: YUVCanvasStatic;
declare var OGVDecoderVideoVP9W: any;
