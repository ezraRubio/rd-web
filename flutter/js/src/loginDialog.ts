import { bus } from './eventBus';

let overlay: HTMLElement | null = null;
let passwordInput: HTMLInputElement | null = null;
let rememberCheck: HTMLInputElement | null = null;
let errorEl: HTMLElement | null = null;
let submitCallback: ((password: string, remember: boolean) => void) | null = null;

export function init(parent: HTMLElement): void {
  overlay = document.createElement('div');
  overlay.id = 'overlay';

  overlay.innerHTML = `
    <div class="dialog">
      <h2>Password Required</h2>
      <p>Enter the password to access this remote desktop.</p>
      <div class="error-msg" style="display:none"></div>
      <input type="password" placeholder="Password" autocomplete="off">
      <label>
        <input type="checkbox"> Remember password
      </label>
      <div class="actions">
        <button class="secondary" id="login-cancel">Cancel</button>
        <button class="primary" id="login-submit">Connect</button>
      </div>
    </div>
  `;

  parent.appendChild(overlay);

  passwordInput = overlay.querySelector('input[type="password"]');
  rememberCheck = overlay.querySelector('input[type="checkbox"]');
  errorEl = overlay.querySelector('.error-msg');

  overlay.querySelector('#login-cancel')!.addEventListener('click', () => {
    hide();
    import('./globals').then(g => g.close());
  });

  overlay.querySelector('#login-submit')!.addEventListener('click', submit);
  passwordInput!.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  bus.on('password_required', (data: { remember?: boolean }) => {
    if (rememberCheck && data?.remember) {
      rememberCheck.checked = true;
    }
    show();
  });

  bus.on('login_result', (data: { success: boolean; error?: string }) => {
    if (!data.success) {
      showError(data.error || 'Wrong password');
    } else {
      hide();
    }
  });
}

function submit(): void {
  const pw = passwordInput?.value || '';
  const remember = rememberCheck?.checked || false;
  if (!pw) {
    showError('Password cannot be empty');
    return;
  }
  hideError();
  if (submitCallback) {
    submitCallback(pw, remember);
  }
}

export function show(): void {
  if (!overlay) return;
  overlay.classList.add('visible');
  passwordInput!.value = '';
  passwordInput!.focus();
  hideError();
}

export function hide(): void {
  if (!overlay) return;
  overlay.classList.remove('visible');
}

export function setCallback(
  cb: (password: string, remember: boolean) => void
): void {
  submitCallback = cb;
}

export function showError(msg: string): void {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

export function hideError(): void {
  if (!errorEl) return;
  errorEl.style.display = 'none';
}
