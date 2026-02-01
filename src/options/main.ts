import type { Settings } from '../lib/types';
import { GROQ_MODELS, GEMINI_MODELS, DEFAULT_SETTINGS } from '../lib/constants';
import { getSettings, saveSettings } from '../lib/storage';

const elements = {
  form: document.getElementById('settingsForm') as HTMLFormElement,
  successMessage: document.getElementById('successMessage') as HTMLDivElement,
  errorMessage: document.getElementById('errorMessage') as HTMLDivElement,
  groqApiKey: document.getElementById('groqApiKey') as HTMLInputElement,
  groqModel: document.getElementById('groqModel') as HTMLSelectElement,
  geminiApiKey: document.getElementById('geminiApiKey') as HTMLInputElement,
  geminiModel: document.getElementById('geminiModel') as HTMLSelectElement,
  maxPages: document.getElementById('maxPages') as HTMLInputElement,
  resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
};

function populateModelDropdowns(): void {
  elements.groqModel.innerHTML = GROQ_MODELS.map(
    (model) => `<option value="${model.id}">${model.name}</option>`
  ).join('');

  elements.geminiModel.innerHTML = GEMINI_MODELS.map(
    (model) => `<option value="${model.id}">${model.name}</option>`
  ).join('');
}

function showSuccess(): void {
  elements.successMessage.classList.remove('hidden');
  elements.errorMessage.classList.add('hidden');
  setTimeout(() => {
    elements.successMessage.classList.add('hidden');
  }, 3000);
}

function showError(message: string): void {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.successMessage.classList.add('hidden');
}

function loadSettingsToForm(settings: Settings): void {
  elements.groqApiKey.value = settings.groqApiKey;
  elements.groqModel.value = settings.groqModel;
  elements.geminiApiKey.value = settings.geminiApiKey;
  elements.geminiModel.value = settings.geminiModel;
  elements.maxPages.value = settings.maxPages.toString();

  const providerRadio = document.querySelector<HTMLInputElement>(
    `input[name="preferredProvider"][value="${settings.preferredProvider}"]`
  );
  if (providerRadio) {
    providerRadio.checked = true;
  }
}

function getFormSettings(): Settings {
  const preferredProvider =
    document.querySelector<HTMLInputElement>('input[name="preferredProvider"]:checked')?.value || 'groq';

  return {
    groqApiKey: elements.groqApiKey.value.trim(),
    groqModel: elements.groqModel.value,
    geminiApiKey: elements.geminiApiKey.value.trim(),
    geminiModel: elements.geminiModel.value,
    preferredProvider: preferredProvider as 'groq' | 'gemini',
    maxPages: parseInt(elements.maxPages.value) || 10,
  };
}

function validateSettings(settings: Settings): string | null {
  if (settings.preferredProvider === 'groq' && !settings.groqApiKey) {
    return 'Please enter a Groq API key or switch to Gemini provider';
  }
  if (settings.preferredProvider === 'gemini' && !settings.geminiApiKey) {
    return 'Please enter a Gemini API key or switch to Groq provider';
  }
  if (settings.maxPages < 1 || settings.maxPages > 50) {
    return 'Max pages must be between 1 and 50';
  }
  return null;
}

async function handleSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const settings = getFormSettings();
  const error = validateSettings(settings);

  if (error) {
    showError(error);
    return;
  }

  try {
    await saveSettings(settings);
    showSuccess();
  } catch (err) {
    showError('Failed to save settings');
  }
}

async function handleReset(): Promise<void> {
  loadSettingsToForm(DEFAULT_SETTINGS);
  await saveSettings(DEFAULT_SETTINGS);
  showSuccess();
}

function setupVisibilityToggles(): void {
  document.querySelectorAll<HTMLButtonElement>('.toggle-visibility').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      if (!targetId) return;

      const input = document.getElementById(targetId) as HTMLInputElement;
      if (input.type === 'password') {
        input.type = 'text';
        button.textContent = 'Hide';
      } else {
        input.type = 'password';
        button.textContent = 'Show';
      }
    });
  });
}

async function init(): Promise<void> {
  populateModelDropdowns();
  setupVisibilityToggles();

  const settings = await getSettings();
  loadSettingsToForm(settings);

  elements.form.addEventListener('submit', handleSubmit);
  elements.resetBtn.addEventListener('click', handleReset);
}

init();
