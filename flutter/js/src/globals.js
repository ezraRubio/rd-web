import Connection from "./connection";
import PORT from "./connection";
import _sodium from "libsodium-wrappers";
import { checkIfRetry, version } from "./gen_js_from_hbb";
import { getEffectiveOption } from "./config";
import PCMPlayer from "pcm-player";
import { bus } from "./eventBus";

window.curConn = undefined;

export function isMobile() {
  return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4));
}

export function isDesktop() {
  return !isMobile();
}

let _connStatus = 0;
let _videoConnCount = 0;
export function setConnStatus(status, videoCount = 0) {
  _connStatus = status;
  _videoConnCount = videoCount;
}

export function msgbox(type, title, text, link) {
  if (!type || (type == 'error' && !text)) return;
  var hasRetry = checkIfRetry(type, title, text) ? 'true' : '';
  bus.emit('msgbox', { type, title, text, link: link ?? '', hasRetry });
}

export function pushEvent(name, payload) {
  bus.emit(name, payload);
}

let yuvCanvas;
let gl;
let lastDw = 0, lastDh = 0;

if (typeof YUVCanvas !== 'undefined' && YUVCanvas.WebGLFrameSink && YUVCanvas.WebGLFrameSink.isAvailable()) {
  var _canvas = document.createElement('canvas');
  yuvCanvas = YUVCanvas.attach(_canvas, { webGL: true });
  gl = _canvas.getContext("webgl");
}

export function draw(display, frame) {
  if (!yuvCanvas) return;
  var dw = frame.format.displayWidth;
  var dh = frame.format.displayHeight;
  if (dw !== lastDw || dh !== lastDh) {
    lastDw = dw;
    lastDh = dh;
  }
  yuvCanvas.drawFrame(frame);
}

export function sendOffCanvas(c) {
  // kept for compatibility; yuvWorker removed from module scope
}

export function setConn(conn) {
  window.curConn = conn;
}

export function getConn() {
  return window.curConn;
}

export async function startConn(id, password = undefined) {
  localStorage.setItem('remote-id', id);
  await window.curConn?.start(id, password);
}

export function close() {
  getConn()?.close();
  setConn(undefined);
}

export function newConn() {
  window.curConn?.close();
  const conn = new Connection();
  setConn(conn);
  return conn;
}

let sodium;
export async function verify(signed, pk) {
  if (!sodium) {
    await _sodium.ready;
    sodium = _sodium;
  }
  if (typeof pk == 'string') {
    pk = decodeBase64(pk);
  }
  return sodium.crypto_sign_open(signed, pk);
}

export function decodeBase64(pk) {
  return sodium.from_base64(pk, sodium.base64_variants.ORIGINAL);
}

export function genBoxKeyPair() {
  const pair = sodium.crypto_box_keypair();
  const sk = pair.privateKey;
  const pk = pair.publicKey;
  return [sk, pk];
}

export function genSecretKey() {
  return sodium.crypto_secretbox_keygen();
}

export function seal(unsigned, theirPk, ourSk) {
  const nonce = Uint8Array.from(Array(24).fill(0));
  return sodium.crypto_box_easy(unsigned, nonce, theirPk, ourSk);
}

function makeOnce(value) {
  var byteArray = Array(24).fill(0);
  for (var index = 0; index < byteArray.length && value > 0; index++) {
    var byte = value & 0xff;
    byteArray[index] = byte;
    value = (value - byte) / 256;
  }
  return Uint8Array.from(byteArray);
};

export function encrypt(unsigned, nonce, key) {
  return sodium.crypto_secretbox_easy(unsigned, makeOnce(nonce), key);
}

export function decrypt(signed, nonce, key) {
  return sodium.crypto_secretbox_open_easy(signed, makeOnce(nonce), key);
}

let opusWorker = new Worker("./libopus.js");
let pcmPlayer;

opusWorker.onmessage = (e) => {
  if (pcmPlayer) {
    pcmPlayer.feed(e.data);
  }
};

export function initAudio(channels, sampleRate) {
  pcmPlayer = new PCMPlayer({
    channels,
    sampleRate,
    flushingTime: 2000
  });
  opusWorker.postMessage({ channels, sampleRate });
}

export function playAudio(packet) {
  opusWorker.postMessage(packet, [packet.buffer]);
}

export function getPeers() {
  return getJsonObj('peers');
}

export function getJsonObj(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}

export function copyToClipboard(text) {
  if (window.clipboardData && window.clipboardData.setData) {
    return window.clipboardData.setData("Text", text);
  }
  else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
    var textarea = document.createElement("textarea");
    textarea.textContent = text;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand("copy");
    }
    catch (ex) {
      console.warn("Copy to clipboard failed.", ex);
    }
    finally {
      document.body.removeChild(textarea);
    }
  }
}

export function getVersionNumber(v) {
  try {
    let versions = v.split('-');
    let n = 0;
    if (versions.length > 0) {
      let last = 0;
      for (let x of versions[0].split('.')) {
        last = parseInt(x) || 0;
        n = n * 1000 + last;
      }
      n -= last;
      n += last * 10;
    }
    if (versions.length > 1) {
      n += parseInt(versions[1]) || 0;
    }
    return n;
  }
  catch (e) {
    console.error('Failed to parse version number: "' + v + '" ' + e.message);
    return 0;
  }
}

export function getUserDefaultOption(value) {
  const configValue = getEffectiveOption(value)
  if (configValue) {
    return configValue
  }
  const defaultOptions = {
    'view_style': 'original',
    'scroll_style': 'scrollauto',
    'image_quality': 'balanced',
    'codec-preference': 'auto',
    'custom_image_quality': '50',
    'custom-fps': '30',
  };
  try {
    const userDefaultOptions = JSON.parse(localStorage.getItem('user-default-options')) || {};
    return userDefaultOptions[value] || defaultOptions[value] || '';
  }
  catch (e) {
    console.error('Failed to get user default options: ' + e.message);
    return defaultOptions[value] || '';
  }
}

export function queryOnlines(value) {
  // TODO: implement this
}
