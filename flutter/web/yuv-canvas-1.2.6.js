var YUVCanvas = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/yuv-canvas/src/FrameSink.js
  var require_FrameSink = __commonJS({
    "node_modules/yuv-canvas/src/FrameSink.js"(exports, module) {
      (function() {
        "use strict";
        function FrameSink(canvas, options) {
          throw new Error("abstract");
        }
        FrameSink.prototype.drawFrame = function(buffer) {
          throw new Error("abstract");
        };
        FrameSink.prototype.clear = function() {
          throw new Error("abstract");
        };
        module.exports = FrameSink;
      })();
    }
  });

  // node_modules/yuv-canvas/src/depower.js
  var require_depower = __commonJS({
    "node_modules/yuv-canvas/src/depower.js"(exports, module) {
      (function() {
        "use strict";
        function depower(ratio) {
          var shiftCount = 0, n = ratio >> 1;
          while (n != 0) {
            n = n >> 1;
            shiftCount++;
          }
          if (ratio !== 1 << shiftCount) {
            throw "chroma plane dimensions must be power of 2 ratio to luma plane dimensions; got " + ratio;
          }
          return shiftCount;
        }
        module.exports = depower;
      })();
    }
  });

  // node_modules/yuv-canvas/src/YCbCr.js
  var require_YCbCr = __commonJS({
    "node_modules/yuv-canvas/src/YCbCr.js"(exports, module) {
      (function() {
        "use strict";
        var depower = require_depower();
        function convertYCbCr(buffer, output) {
          var width = buffer.format.width | 0, height = buffer.format.height | 0, hdec = depower(buffer.format.width / buffer.format.chromaWidth) | 0, vdec = depower(buffer.format.height / buffer.format.chromaHeight) | 0, bytesY = buffer.y.bytes, bytesCb = buffer.u.bytes, bytesCr = buffer.v.bytes, strideY = buffer.y.stride | 0, strideCb = buffer.u.stride | 0, strideCr = buffer.v.stride | 0, outStride = width << 2, YPtr = 0, Y0Ptr = 0, Y1Ptr = 0, CbPtr = 0, CrPtr = 0, outPtr = 0, outPtr0 = 0, outPtr1 = 0, colorCb = 0, colorCr = 0, multY = 0, multCrR = 0, multCbCrG = 0, multCbB = 0, x = 0, y = 0, xdec = 0, ydec = 0;
          if (hdec == 1 && vdec == 1) {
            outPtr0 = 0;
            outPtr1 = outStride;
            ydec = 0;
            for (y = 0; y < height; y += 2) {
              Y0Ptr = y * strideY | 0;
              Y1Ptr = Y0Ptr + strideY | 0;
              CbPtr = ydec * strideCb | 0;
              CrPtr = ydec * strideCr | 0;
              for (x = 0; x < width; x += 2) {
                colorCb = bytesCb[CbPtr++] | 0;
                colorCr = bytesCr[CrPtr++] | 0;
                multCrR = (409 * colorCr | 0) - 57088 | 0;
                multCbCrG = (100 * colorCb | 0) + (208 * colorCr | 0) - 34816 | 0;
                multCbB = (516 * colorCb | 0) - 70912 | 0;
                multY = 298 * bytesY[Y0Ptr++] | 0;
                output[outPtr0] = multY + multCrR >> 8;
                output[outPtr0 + 1] = multY - multCbCrG >> 8;
                output[outPtr0 + 2] = multY + multCbB >> 8;
                outPtr0 += 4;
                multY = 298 * bytesY[Y0Ptr++] | 0;
                output[outPtr0] = multY + multCrR >> 8;
                output[outPtr0 + 1] = multY - multCbCrG >> 8;
                output[outPtr0 + 2] = multY + multCbB >> 8;
                outPtr0 += 4;
                multY = 298 * bytesY[Y1Ptr++] | 0;
                output[outPtr1] = multY + multCrR >> 8;
                output[outPtr1 + 1] = multY - multCbCrG >> 8;
                output[outPtr1 + 2] = multY + multCbB >> 8;
                outPtr1 += 4;
                multY = 298 * bytesY[Y1Ptr++] | 0;
                output[outPtr1] = multY + multCrR >> 8;
                output[outPtr1 + 1] = multY - multCbCrG >> 8;
                output[outPtr1 + 2] = multY + multCbB >> 8;
                outPtr1 += 4;
              }
              outPtr0 += outStride;
              outPtr1 += outStride;
              ydec++;
            }
          } else {
            outPtr = 0;
            for (y = 0; y < height; y++) {
              xdec = 0;
              ydec = y >> vdec;
              YPtr = y * strideY | 0;
              CbPtr = ydec * strideCb | 0;
              CrPtr = ydec * strideCr | 0;
              for (x = 0; x < width; x++) {
                xdec = x >> hdec;
                colorCb = bytesCb[CbPtr + xdec] | 0;
                colorCr = bytesCr[CrPtr + xdec] | 0;
                multCrR = (409 * colorCr | 0) - 57088 | 0;
                multCbCrG = (100 * colorCb | 0) + (208 * colorCr | 0) - 34816 | 0;
                multCbB = (516 * colorCb | 0) - 70912 | 0;
                multY = 298 * bytesY[YPtr++] | 0;
                output[outPtr] = multY + multCrR >> 8;
                output[outPtr + 1] = multY - multCbCrG >> 8;
                output[outPtr + 2] = multY + multCbB >> 8;
                outPtr += 4;
              }
            }
          }
        }
        module.exports = {
          convertYCbCr
        };
      })();
    }
  });

  // node_modules/yuv-canvas/src/SoftwareFrameSink.js
  var require_SoftwareFrameSink = __commonJS({
    "node_modules/yuv-canvas/src/SoftwareFrameSink.js"(exports, module) {
      (function() {
        "use strict";
        var FrameSink = require_FrameSink(), YCbCr = require_YCbCr();
        function SoftwareFrameSink(canvas) {
          var self = this, ctx = canvas.getContext("2d"), imageData = null, resampleCanvas = null, resampleContext = null;
          function initImageData(width, height) {
            imageData = ctx.createImageData(width, height);
            var data = imageData.data, pixelCount = width * height * 4;
            for (var i = 0; i < pixelCount; i += 4) {
              data[i + 3] = 255;
            }
          }
          function initResampleCanvas(cropWidth, cropHeight) {
            resampleCanvas = document.createElement("canvas");
            resampleCanvas.width = cropWidth;
            resampleCanvas.height = cropHeight;
            resampleContext = resampleCanvas.getContext("2d");
          }
          self.drawFrame = function drawFrame(buffer) {
            var format = buffer.format;
            if (canvas.width !== format.displayWidth || canvas.height !== format.displayHeight) {
              canvas.width = format.displayWidth;
              canvas.height = format.displayHeight;
            }
            if (imageData === null || imageData.width != format.width || imageData.height != format.height) {
              initImageData(format.width, format.height);
            }
            YCbCr.convertYCbCr(buffer, imageData.data);
            var resample = format.cropWidth != format.displayWidth || format.cropHeight != format.displayHeight;
            var drawContext;
            if (resample) {
              if (!resampleCanvas) {
                initResampleCanvas(format.cropWidth, format.cropHeight);
              }
              drawContext = resampleContext;
            } else {
              drawContext = ctx;
            }
            drawContext.putImageData(
              imageData,
              -format.cropLeft,
              -format.cropTop,
              format.cropLeft,
              format.cropTop,
              format.cropWidth,
              format.cropHeight
            );
            if (resample) {
              ctx.drawImage(resampleCanvas, 0, 0, format.displayWidth, format.displayHeight);
            }
          };
          self.clear = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          };
          return self;
        }
        SoftwareFrameSink.prototype = Object.create(FrameSink.prototype);
        module.exports = SoftwareFrameSink;
      })();
    }
  });

  // node_modules/yuv-canvas/build/shaders.js
  var require_shaders = __commonJS({
    "node_modules/yuv-canvas/build/shaders.js"(exports, module) {
      module.exports = {
        vertex: "precision lowp float;\n\nattribute vec2 aPosition;\nattribute vec2 aLumaPosition;\nattribute vec2 aChromaPosition;\nvarying vec2 vLumaPosition;\nvarying vec2 vChromaPosition;\nvoid main() {\n    gl_Position = vec4(aPosition, 0, 1);\n    vLumaPosition = aLumaPosition;\n    vChromaPosition = aChromaPosition;\n}\n",
        fragment: "// inspired by https://github.com/mbebenita/Broadway/blob/master/Player/canvas.js\n\nprecision lowp float;\n\nuniform sampler2D uTextureY;\nuniform sampler2D uTextureCb;\nuniform sampler2D uTextureCr;\nvarying vec2 vLumaPosition;\nvarying vec2 vChromaPosition;\nvoid main() {\n   // Y, Cb, and Cr planes are uploaded as LUMINANCE textures.\n   float fY = texture2D(uTextureY, vLumaPosition).x;\n   float fCb = texture2D(uTextureCb, vChromaPosition).x;\n   float fCr = texture2D(uTextureCr, vChromaPosition).x;\n\n   // Premultipy the Y...\n   float fYmul = fY * 1.1643828125;\n\n   // And convert that to RGB!\n   gl_FragColor = vec4(\n     fYmul + 1.59602734375 * fCr - 0.87078515625,\n     fYmul - 0.39176171875 * fCb - 0.81296875 * fCr + 0.52959375,\n     fYmul + 2.017234375   * fCb - 1.081390625,\n     1\n   );\n}\n",
        vertexStripe: "precision lowp float;\n\nattribute vec2 aPosition;\nattribute vec2 aTexturePosition;\nvarying vec2 vTexturePosition;\n\nvoid main() {\n    gl_Position = vec4(aPosition, 0, 1);\n    vTexturePosition = aTexturePosition;\n}\n",
        fragmentStripe: "// extra 'stripe' texture fiddling to work around IE 11's poor performance on gl.LUMINANCE and gl.ALPHA textures\n\nprecision lowp float;\n\nuniform sampler2D uStripe;\nuniform sampler2D uTexture;\nvarying vec2 vTexturePosition;\nvoid main() {\n   // Y, Cb, and Cr planes are mapped into a pseudo-RGBA texture\n   // so we can upload them without expanding the bytes on IE 11\n   // which doesn't allow LUMINANCE or ALPHA textures\n   // The stripe textures mark which channel to keep for each pixel.\n   // Each texture extraction will contain the relevant value in one\n   // channel only.\n\n   float fLuminance = dot(\n      texture2D(uStripe, vTexturePosition),\n      texture2D(uTexture, vTexturePosition)\n   );\n\n   gl_FragColor = vec4(fLuminance, fLuminance, fLuminance, 1);\n}\n"
      };
    }
  });

  // node_modules/yuv-canvas/src/WebGLFrameSink.js
  var require_WebGLFrameSink = __commonJS({
    "node_modules/yuv-canvas/src/WebGLFrameSink.js"(exports, module) {
      (function() {
        "use strict";
        var FrameSink = require_FrameSink(), shaders = require_shaders();
        function WebGLFrameSink(canvas) {
          var self = this, gl = WebGLFrameSink.contextForCanvas(canvas), debug = false;
          if (gl === null) {
            throw new Error("WebGL unavailable");
          }
          function checkError() {
            if (debug) {
              err = gl.getError();
              if (err !== 0) {
                throw new Error("GL error " + err);
              }
            }
          }
          function compileShader(type, source) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              var err2 = gl.getShaderInfoLog(shader);
              gl.deleteShader(shader);
              throw new Error("GL shader compilation for " + type + " failed: " + err2);
            }
            return shader;
          }
          var program, unpackProgram, err;
          var rectangle = new Float32Array([
            -1,
            -1,
            1,
            -1,
            -1,
            1,
            -1,
            1,
            1,
            -1,
            1,
            1
          ]);
          var textures = {};
          var framebuffers = {};
          var stripes = {};
          var buf, positionLocation, unpackPositionLocation;
          var unpackTexturePositionBuffer, unpackTexturePositionLocation;
          var stripeLocation, unpackTextureLocation;
          var lumaPositionBuffer, lumaPositionLocation;
          var chromaPositionBuffer, chromaPositionLocation;
          function createOrReuseTexture(name) {
            if (!textures[name]) {
              textures[name] = gl.createTexture();
            }
            return textures[name];
          }
          function uploadTexture(name, width, height, data) {
            var texture = createOrReuseTexture(name);
            gl.activeTexture(gl.TEXTURE0);
            if (WebGLFrameSink.stripe) {
              var uploadTemp = !textures[name + "_temp"];
              var tempTexture = createOrReuseTexture(name + "_temp");
              gl.bindTexture(gl.TEXTURE_2D, tempTexture);
              if (uploadTemp) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  width / 4,
                  height,
                  0,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  data
                );
              } else {
                gl.texSubImage2D(
                  gl.TEXTURE_2D,
                  0,
                  0,
                  0,
                  width / 4,
                  height,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  data
                );
              }
              var stripeTexture = textures[name + "_stripe"];
              var uploadStripe = !stripeTexture;
              if (uploadStripe) {
                stripeTexture = createOrReuseTexture(name + "_stripe");
              }
              gl.bindTexture(gl.TEXTURE_2D, stripeTexture);
              if (uploadStripe) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  width,
                  1,
                  0,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  buildStripe(width, 1)
                );
              }
            } else {
              gl.bindTexture(gl.TEXTURE_2D, texture);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.LUMINANCE,
                width,
                height,
                0,
                gl.LUMINANCE,
                gl.UNSIGNED_BYTE,
                data
              );
            }
          }
          function unpackTexture(name, width, height) {
            var texture = textures[name];
            gl.useProgram(unpackProgram);
            var fb = framebuffers[name];
            if (!fb) {
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, texture);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                width,
                height,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                null
              );
              fb = framebuffers[name] = gl.createFramebuffer();
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            var tempTexture = textures[name + "_temp"];
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, tempTexture);
            gl.uniform1i(unpackTextureLocation, 1);
            var stripeTexture = textures[name + "_stripe"];
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, stripeTexture);
            gl.uniform1i(stripeLocation, 2);
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, unpackTexturePositionBuffer);
            gl.enableVertexAttribArray(unpackTexturePositionLocation);
            gl.vertexAttribPointer(unpackTexturePositionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.viewport(0, 0, width, height);
            gl.drawArrays(gl.TRIANGLES, 0, rectangle.length / 2);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          }
          function attachTexture(name, register, index) {
            gl.activeTexture(register);
            gl.bindTexture(gl.TEXTURE_2D, textures[name]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.uniform1i(gl.getUniformLocation(program, name), index);
          }
          function buildStripe(width) {
            if (stripes[width]) {
              return stripes[width];
            }
            var len = width, out = new Uint32Array(len);
            for (var i = 0; i < len; i += 4) {
              out[i] = 255;
              out[i + 1] = 65280;
              out[i + 2] = 16711680;
              out[i + 3] = 4278190080;
            }
            return stripes[width] = new Uint8Array(out.buffer);
          }
          function initProgram(vertexShaderSource, fragmentShaderSource) {
            var vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
            var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            var program2 = gl.createProgram();
            gl.attachShader(program2, vertexShader);
            gl.attachShader(program2, fragmentShader);
            gl.linkProgram(program2);
            if (!gl.getProgramParameter(program2, gl.LINK_STATUS)) {
              var err2 = gl.getProgramInfoLog(program2);
              gl.deleteProgram(program2);
              throw new Error("GL program linking failed: " + err2);
            }
            return program2;
          }
          function init() {
            if (WebGLFrameSink.stripe) {
              unpackProgram = initProgram(shaders.vertexStripe, shaders.fragmentStripe);
              unpackPositionLocation = gl.getAttribLocation(unpackProgram, "aPosition");
              unpackTexturePositionBuffer = gl.createBuffer();
              var textureRectangle = new Float32Array([
                0,
                0,
                1,
                0,
                0,
                1,
                0,
                1,
                1,
                0,
                1,
                1
              ]);
              gl.bindBuffer(gl.ARRAY_BUFFER, unpackTexturePositionBuffer);
              gl.bufferData(gl.ARRAY_BUFFER, textureRectangle, gl.STATIC_DRAW);
              unpackTexturePositionLocation = gl.getAttribLocation(unpackProgram, "aTexturePosition");
              stripeLocation = gl.getUniformLocation(unpackProgram, "uStripe");
              unpackTextureLocation = gl.getUniformLocation(unpackProgram, "uTexture");
            }
            program = initProgram(shaders.vertex, shaders.fragment);
            buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, rectangle, gl.STATIC_DRAW);
            positionLocation = gl.getAttribLocation(program, "aPosition");
            lumaPositionBuffer = gl.createBuffer();
            lumaPositionLocation = gl.getAttribLocation(program, "aLumaPosition");
            chromaPositionBuffer = gl.createBuffer();
            chromaPositionLocation = gl.getAttribLocation(program, "aChromaPosition");
          }
          self.drawFrame = function(buffer) {
            var format = buffer.format;
            var formatUpdate = !program || canvas.width !== format.displayWidth || canvas.height !== format.displayHeight;
            if (formatUpdate) {
              canvas.width = format.displayWidth;
              canvas.height = format.displayHeight;
              self.clear();
            }
            if (!program) {
              init();
            }
            if (formatUpdate) {
              var setupTexturePosition = function(buffer2, location, texWidth) {
                var textureX0 = format.cropLeft / texWidth;
                var textureX1 = (format.cropLeft + format.cropWidth) / texWidth;
                var textureY0 = (format.cropTop + format.cropHeight) / format.height;
                var textureY1 = format.cropTop / format.height;
                var textureRectangle = new Float32Array([
                  textureX0,
                  textureY0,
                  textureX1,
                  textureY0,
                  textureX0,
                  textureY1,
                  textureX0,
                  textureY1,
                  textureX1,
                  textureY0,
                  textureX1,
                  textureY1
                ]);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
                gl.bufferData(gl.ARRAY_BUFFER, textureRectangle, gl.STATIC_DRAW);
              };
              setupTexturePosition(
                lumaPositionBuffer,
                lumaPositionLocation,
                buffer.y.stride
              );
              setupTexturePosition(
                chromaPositionBuffer,
                chromaPositionLocation,
                buffer.u.stride * format.width / format.chromaWidth
              );
            }
            uploadTexture("uTextureY", buffer.y.stride, format.height, buffer.y.bytes);
            uploadTexture("uTextureCb", buffer.u.stride, format.chromaHeight, buffer.u.bytes);
            uploadTexture("uTextureCr", buffer.v.stride, format.chromaHeight, buffer.v.bytes);
            if (WebGLFrameSink.stripe) {
              unpackTexture("uTextureY", buffer.y.stride, format.height);
              unpackTexture("uTextureCb", buffer.u.stride, format.chromaHeight);
              unpackTexture("uTextureCr", buffer.v.stride, format.chromaHeight);
            }
            gl.useProgram(program);
            gl.viewport(0, 0, canvas.width, canvas.height);
            attachTexture("uTextureY", gl.TEXTURE0, 0);
            attachTexture("uTextureCb", gl.TEXTURE1, 1);
            attachTexture("uTextureCr", gl.TEXTURE2, 2);
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, lumaPositionBuffer);
            gl.enableVertexAttribArray(lumaPositionLocation);
            gl.vertexAttribPointer(lumaPositionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, chromaPositionBuffer);
            gl.enableVertexAttribArray(chromaPositionLocation);
            gl.vertexAttribPointer(chromaPositionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, rectangle.length / 2);
          };
          self.clear = function() {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
          };
          self.clear();
          return self;
        }
        WebGLFrameSink.stripe = function() {
          if (navigator.userAgent.indexOf("Windows") !== -1) {
            return true;
          }
          return false;
        }();
        WebGLFrameSink.contextForCanvas = function(canvas) {
          var options = {
            preferLowPowerToHighPerformance: true,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: true,
            preserveDrawingBuffer: true
          };
          return canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
        };
        WebGLFrameSink.isAvailable = function() {
          var canvas = document.createElement("canvas"), gl;
          canvas.width = 1;
          canvas.height = 1;
          try {
            gl = WebGLFrameSink.contextForCanvas(canvas);
          } catch (e) {
            return false;
          }
          if (gl) {
            var register = gl.TEXTURE0, width = 4, height = 4, texture = gl.createTexture(), data = new Uint8Array(width * height), texWidth = WebGLFrameSink.stripe ? width / 4 : width, format = WebGLFrameSink.stripe ? gl.RGBA : gl.LUMINANCE, filter = WebGLFrameSink.stripe ? gl.NEAREST : gl.LINEAR;
            gl.activeTexture(register);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              format,
              texWidth,
              height,
              0,
              format,
              gl.UNSIGNED_BYTE,
              data
            );
            var err = gl.getError();
            if (err) {
              return false;
            } else {
              return true;
            }
          } else {
            return false;
          }
        };
        WebGLFrameSink.prototype = Object.create(FrameSink.prototype);
        module.exports = WebGLFrameSink;
      })();
    }
  });

  // node_modules/yuv-canvas/src/yuv-canvas.js
  var require_yuv_canvas = __commonJS({
    "node_modules/yuv-canvas/src/yuv-canvas.js"(exports, module) {
      (function() {
        "use strict";
        var FrameSink = require_FrameSink(), SoftwareFrameSink = require_SoftwareFrameSink(), WebGLFrameSink = require_WebGLFrameSink();
        var YUVCanvas = {
          FrameSink,
          SoftwareFrameSink,
          WebGLFrameSink,
          attach: function(canvas, options) {
            options = options || {};
            var webGL = "webGL" in options ? options.webGL : WebGLFrameSink.isAvailable();
            if (webGL) {
              return new WebGLFrameSink(canvas, options);
            } else {
              return new SoftwareFrameSink(canvas, options);
            }
          }
        };
        module.exports = YUVCanvas;
      })();
    }
  });
  return require_yuv_canvas();
})();
/**
 * Basic YCbCr->RGB conversion
 *
 * @author Brion Vibber <brion@pobox.com>
 * @copyright 2014-2019
 * @license MIT-style
 *
 * @param {YUVFrame} buffer - input frame buffer
 * @param {Uint8ClampedArray} output - array to draw RGBA into
 * Assumes that the output array already has alpha channel set to opaque.
 */
/**
 * Convert a ratio into a bit-shift count; for instance a ratio of 2
 * becomes a bit-shift of 1, while a ratio of 1 is a bit-shift of 0.
 *
 * @author Brion Vibber <brion@pobox.com>
 * @copyright 2016
 * @license MIT-style
 *
 * @param {number} ratio - the integer ratio to convert.
 * @returns {number} - number of bits to shift to multiply/divide by the ratio.
 * @throws exception if given a non-power-of-two
 */
