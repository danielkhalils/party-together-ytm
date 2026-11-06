const STORAGE_KEY = 'partyTogetherAppUrl';
const form = document.querySelector('#url-form');
const input = document.querySelector('#app-url');
const frame = document.querySelector('#app-frame');
const emptyState = document.querySelector('#empty-state');
const footer = document.querySelector('#open-link');
const openTab = document.querySelector('#open-tab');
const error = document.querySelector('#form-error');

function showSettings(value = '') {
  input.value = value;
  form.hidden = false;
  frame.hidden = true;
  emptyState.hidden = Boolean(value);
  footer.hidden = true;
  error.textContent = '';
  input.focus();
}

function openApp(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const isLocalDev = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(isLocalDev && url.protocol === 'http:')) throw new Error();
    localStorage.setItem(STORAGE_KEY, url.href);
    frame.src = url.href;
    openTab.href = url.href;
    form.hidden = true;
    emptyState.hidden = true;
    frame.hidden = false;
    footer.hidden = false;
  } catch {
    error.textContent = 'Use uma URL HTTPS válida (HTTP só é aceito em localhost).';
    form.hidden = false;
    input.focus();
  }
}

document.querySelector('#settings-button').addEventListener('click', () => showSettings(localStorage.getItem(STORAGE_KEY) || ''));
document.querySelector('#change-url').addEventListener('click', () => showSettings(localStorage.getItem(STORAGE_KEY) || ''));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  openApp(input.value.trim());
});

const savedUrl = localStorage.getItem(STORAGE_KEY);
if (savedUrl) openApp(savedUrl);
else showSettings();
