let _fullscreen = false;
const listeners: Array<(v: boolean) => void> = [];

export function init(): void {
  document.addEventListener('fullscreenchange', () => {
    _fullscreen = !!document.fullscreenElement;
    for (const fn of listeners) fn(_fullscreen);
  });
}

export function toggle(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.body.requestFullscreen().catch(() => {});
  }
}

export function isFullscreen(): boolean {
  return _fullscreen;
}

export function onChange(fn: (v: boolean) => void): void {
  listeners.push(fn);
}
