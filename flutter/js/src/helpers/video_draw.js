import { convertYCbCr } from "yuv-canvas/src/YCbCr";

let flipPixels;
let lastDw = 0,
  lastDh = 0;

export function draw(display, frame, sessionId) {
  var dw = frame.format.displayWidth;
  var dh = frame.format.displayHeight;
  var size = dw * dh * 4;
  if (dw !== lastDw || dh !== lastDh) {
    lastDw = dw;
    lastDh = dh;
    flipPixels = new Uint8Array(size);
  }

  var fw = frame.format.width;
  var fh = frame.format.height;
  var fsize = fw * fh * 4;
  if (!draw._temp || draw._temp.length !== fsize) {
    draw._temp = new Uint8ClampedArray(fsize).fill(255);
  }

  convertYCbCr(frame, draw._temp);

  var cropLeft = frame.format.cropLeft;
  var cropTop = frame.format.cropTop;
  var dstRow = dw * 4;

  for (var y = 0; y < dh; y++) {
    var srcStart = ((cropTop + y) * fw + cropLeft) * 4;
    var dstStart = y * dstRow;
    flipPixels.set(draw._temp.subarray(srcStart, srcStart + dstRow), dstStart);
  }

  onRgba(sessionId || "", display, dw, dh, flipPixels);
}
