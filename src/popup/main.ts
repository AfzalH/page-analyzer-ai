import type { PageContent, AnalysisProgress } from '../lib/types';
import { getSettings } from '../lib/storage';

const elements = {
  currentUrl: document.getElementById('currentUrl') as HTMLDivElement,
  currentTitle: document.getElementById('currentTitle') as HTMLDivElement,
  errorMessage: document.getElementById('errorMessage') as HTMLDivElement,
  progressSection: document.getElementById('progressSection') as HTMLDivElement,
  progressCount: document.getElementById('progressCount') as HTMLSpanElement,
  progressBar: document.getElementById('progressBar') as HTMLDivElement,
  progressStatus: document.getElementById('progressStatus') as HTMLDivElement,
  linksSection: document.getElementById('linksSection') as HTMLDivElement,
  linksList: document.getElementById('linksList') as HTMLDivElement,
  linksCount: document.getElementById('linksCount') as HTMLDivElement,
  analyzeCurrentBtn: document.getElementById('analyzeCurrentBtn') as HTMLButtonElement,
  analyzeSelectedBtn: document.getElementById('analyzeSelectedBtn') as HTMLButtonElement,
  selectAllBtn: document.getElementById('selectAllBtn') as HTMLButtonElement,
  deselectAllBtn: document.getElementById('deselectAllBtn') as HTMLButtonElement,
  stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
  optionsBtn: document.getElementById('optionsBtn') as HTMLButtonElement,
  resultsBtn: document.getElementById('resultsBtn') as HTMLButtonElement,
};

let currentPageContent: PageContent | null = null;

function showError(message: string): void {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

function hideError(): void {
  elements.errorMessage.classList.add('hidden');
}

function showProgress(): void {
  elements.progressSection.classList.remove('hidden');
  elements.linksSection.classList.add('hidden');
  elements.analyzeCurrentBtn.disabled = true;
  elements.analyzeSelectedBtn.disabled = true;
}

function hideProgress(): void {
  elements.progressSection.classList.add('hidden');
  elements.linksSection.classList.remove('hidden');
  elements.analyzeCurrentBtn.disabled = false;
  elements.analyzeSelectedBtn.disabled = false;
}

function updateProgress(progress: AnalysisProgress): void {
  const percent = (progress.current / progress.total) * 100;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressCount.textContent = `${progress.current}/${progress.total}`;

  let statusText = '';
  switch (progress.status) {
    case 'navigating':
      statusText = `Navigating to: ${progress.currentUrl}`;
      break;
    case 'analyzing':
      statusText = `Analyzing: ${progress.currentUrl}`;
      break;
    case 'complete':
      statusText = 'Analysis complete!';
      setTimeout(hideProgress, 2000);
      break;
    case 'error':
      statusText = `Error: ${progress.error}`;
      break;
  }
  elements.progressStatus.textContent = statusText;
}

function renderLinks(links: string[]): void {
  if (links.length === 0) {
    elements.linksList.innerHTML = '<div class="text-sm text-gray-400">No internal links found</div>';
    elements.linksCount.textContent = '';
    return;
  }

  elements.linksList.innerHTML = links
    .map((link) => {
      const path = new URL(link).pathname;
      return `
        <label class="flex items-start gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
          <input type="checkbox" class="checkbox mt-0.5 link-checkbox" data-url="${link}" />
          <span class="text-xs text-gray-600 break-all">${path || '/'}</span>
        </label>
      `;
    })
    .join('');

  elements.linksCount.textContent = `${links.length} link${links.length === 1 ? '' : 's'} found`;
}

function getSelectedUrls(): string[] {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.link-checkbox:checked');
  return Array.from(checkboxes).map((cb) => cb.dataset.url!);
}

async function loadCurrentPage(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      showError('Cannot access current tab');
      return;
    }

    elements.currentUrl.textContent = tab.url;
    elements.currentTitle.textContent = tab.title || '';

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'getContent' });
    currentPageContent = response as PageContent;

    if (currentPageContent?.internalLinks) {
      renderLinks(currentPageContent.internalLinks);
    }
  } catch (error) {
    elements.linksList.innerHTML = '<div class="text-sm text-gray-400">Cannot access page content. Try refreshing the page.</div>';
  }
}

async function analyzeCurrentPage(): Promise<void> {
  hideError();

  const settings = await getSettings();
  if (!settings.groqApiKey && !settings.geminiApiKey) {
    showError('Please configure API keys in settings');
    return;
  }

  elements.analyzeCurrentBtn.disabled = true;
  elements.analyzeCurrentBtn.textContent = 'Analyzing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'analyzeSinglePage' });
    if (response.error) {
      showError(response.error);
    } else {
      elements.analyzeCurrentBtn.textContent = 'Done!';
      setTimeout(() => {
        elements.analyzeCurrentBtn.textContent = 'Analyze Current';
        elements.analyzeCurrentBtn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Analysis failed');
    elements.analyzeCurrentBtn.textContent = 'Analyze Current';
    elements.analyzeCurrentBtn.disabled = false;
  }
}

async function analyzeSelected(): Promise<void> {
  hideError();

  const settings = await getSettings();
  if (!settings.groqApiKey && !settings.geminiApiKey) {
    showError('Please configure API keys in settings');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showError('Cannot access current tab');
    return;
  }

  const selectedUrls = getSelectedUrls();
  const urls = [tab.url, ...selectedUrls];

  if (urls.length > settings.maxPages) {
    showError(`Maximum ${settings.maxPages} pages allowed. Please select fewer links.`);
    return;
  }

  showProgress();
  elements.progressCount.textContent = `0/${urls.length}`;
  elements.progressBar.style.width = '0%';
  elements.progressStatus.textContent = 'Starting analysis...';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'startBatchAnalysis',
      urls,
    });
    if (response.error) {
      showError(response.error);
      hideProgress();
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Analysis failed');
    hideProgress();
  }
}

async function stopAnalysis(): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'stopAnalysis' });
  hideProgress();
}

function selectAll(): void {
  document.querySelectorAll<HTMLInputElement>('.link-checkbox').forEach((cb) => {
    cb.checked = true;
  });
}

function deselectAll(): void {
  document.querySelectorAll<HTMLInputElement>('.link-checkbox').forEach((cb) => {
    cb.checked = false;
  });
}

function openOptions(): void {
  chrome.runtime.openOptionsPage();
}

function openResults(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/results/index.html') });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'analysisProgress') {
    updateProgress(message as AnalysisProgress);
  }
});

elements.analyzeCurrentBtn.addEventListener('click', analyzeCurrentPage);
elements.analyzeSelectedBtn.addEventListener('click', analyzeSelected);
elements.selectAllBtn.addEventListener('click', selectAll);
elements.deselectAllBtn.addEventListener('click', deselectAll);
elements.stopBtn.addEventListener('click', stopAnalysis);
elements.optionsBtn.addEventListener('click', openOptions);
elements.resultsBtn.addEventListener('click', openResults);

loadCurrentPage();
