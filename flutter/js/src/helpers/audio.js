import PCMPlayer from "pcm-player";

let opusWorker = new Worker("./libopus.js");
let pcmPlayer;

function newAudioPlayer(channels, sampleRate) {
  return new PCMPlayer({
    channels,
    sampleRate,
    flushingTime: 2000,
  });
}

export function initAudio(channels, sampleRate) {
  pcmPlayer = newAudioPlayer(channels, sampleRate);
  opusWorker.postMessage({ channels, sampleRate });
}

export function playAudio(packet) {
  opusWorker.postMessage(packet, [packet.buffer]);
}

export function bindOpusWorkerOnInit() {
  opusWorker.onmessage = (e) => {
    pcmPlayer.feed(e.data);
  };
}
