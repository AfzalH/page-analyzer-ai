import type { AnalysisResult, PageContent, AnalysisProgress } from '../lib/types';
import { getSettings, saveResult } from '../lib/storage';
import { analyzeContent } from '../lib/api';

interface AnalysisState {
  urls: string[];
  currentIndex: number;
  tabId: number;
  isRunning: boolean;
}

let analysisState: AnalysisState | null = null;

async function sendProgressUpdate(progress: AnalysisProgress): Promise<void> {
  try {
    await chrome.runtime.sendMessage(progress);
  } catch {
    // Popup might be closed, ignore
  }
}

async function getPageContent(tabId: number): Promise<PageContent> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const mainContent =
        document.querySelector('main') ||
        document.querySelector('article') ||
        document.querySelector('[role="main"]') ||
        document.body;

      // Clone the content to avoid modifying the actual page
      const clone = mainContent.cloneNode(true) as HTMLElement;

      // Remove non-content elements
      const selectorsToRemove = [
        'script', 'style', 'noscript', 'iframe', 'svg',
        'nav', 'header', 'footer', 'aside',
        '[aria-hidden="true"]', '[role="navigation"]',
        '.nav', '.navigation', '.menu', '.sidebar',
        '.ad', '.ads', '.advertisement', '.cookie-banner'
      ];

      selectorsToRemove.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      });

      // Get cleaned HTML
      let html = clone.innerHTML;

      // Simplify HTML: remove excessive attributes but keep structure
      html = html
        .replace(/\s(class|id|style|data-[\w-]+)="[^"]*"/gi, '')
        .replace(/\s(onclick|onload|onerror)="[^"]*"/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

      if (html.length > 50000) {
        html = html.substring(0, 50000) + '... [truncated]';
      }

      return {
        url: window.location.href,
        title: document.title,
        content: html,
        internalLinks: [],
      };
    },
  });

  return result.result as PageContent;
}

async function analyzeCurrentPage(tabId: number): Promise<AnalysisResult | null> {
  try {
    const settings = await getSettings();
    const pageContent = await getPageContent(tabId);

    if (!pageContent.content || pageContent.content.length < 50) {
      return null;
    }

    const { analysis, provider, model } = await analyzeContent(
      settings,
      pageContent.url,
      pageContent.content
    );

    const result: AnalysisResult = {
      url: pageContent.url,
      title: pageContent.title,
      analyzedAt: Date.now(),
      contentPreview: pageContent.content.substring(0, 200) + '...',
      analysis,
      provider,
      model,
    };

    await saveResult(result);
    return result;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

async function createBackgroundTab(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, 30000);

    let newTabId: number | null = null;

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (newTabId && updatedTabId === newTabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(() => resolve(newTabId!), 1000);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.create({ url, active: false }).then((tab) => {
      if (tab.id) {
        newTabId = tab.id;
      } else {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Failed to create tab'));
      }
    }).catch((error) => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      reject(error);
    });
  });
}

async function closeTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // Tab might already be closed
  }
}

async function runBatchAnalysis(): Promise<void> {
  if (!analysisState || !analysisState.isRunning) return;

  const { urls, tabId } = analysisState;
  const settings = await getSettings();
  const maxPages = settings.maxPages;

  for (let i = analysisState.currentIndex; i < urls.length && i < maxPages; i++) {
    if (!analysisState.isRunning) break;

    analysisState.currentIndex = i;
    const url = urls[i];
    let backgroundTabId: number | null = null;

    try {
      await sendProgressUpdate({
        type: 'analysisProgress',
        current: i + 1,
        total: Math.min(urls.length, maxPages),
        currentUrl: url,
        status: 'navigating',
      });

      // First URL uses current tab, others use background tabs
      const analyzeTabId = i === 0 ? tabId : await createBackgroundTab(url);
      if (i > 0) {
        backgroundTabId = analyzeTabId;
      }

      await sendProgressUpdate({
        type: 'analysisProgress',
        current: i + 1,
        total: Math.min(urls.length, maxPages),
        currentUrl: url,
        status: 'analyzing',
      });

      await analyzeCurrentPage(analyzeTabId);

      // Close background tab after analysis
      if (backgroundTabId) {
        await closeTab(backgroundTabId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await sendProgressUpdate({
        type: 'analysisProgress',
        current: i + 1,
        total: Math.min(urls.length, maxPages),
        currentUrl: url,
        status: 'error',
        error: errorMessage,
      });

      // Close background tab on error too
      if (backgroundTabId) {
        await closeTab(backgroundTabId);
      }
    }
  }

  await sendProgressUpdate({
    type: 'analysisProgress',
    current: Math.min(urls.length, maxPages),
    total: Math.min(urls.length, maxPages),
    currentUrl: '',
    status: 'complete',
  });

  analysisState = null;

  // Open results page automatically
  chrome.tabs.create({ url: chrome.runtime.getURL('src/results/index.html') });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'startBatchAnalysis') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }

      if (analysisState?.isRunning) {
        sendResponse({ error: 'Analysis already in progress' });
        return;
      }

      analysisState = {
        urls: request.urls,
        currentIndex: 0,
        tabId: tab.id,
        isRunning: true,
      };

      sendResponse({ success: true });
      runBatchAnalysis();
    });
    return true;
  }

  if (request.type === 'stopAnalysis') {
    if (analysisState) {
      analysisState.isRunning = false;
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'getAnalysisStatus') {
    sendResponse({
      isRunning: analysisState?.isRunning || false,
      currentIndex: analysisState?.currentIndex || 0,
      total: analysisState?.urls.length || 0,
    });
    return true;
  }

  if (request.type === 'analyzeSinglePage') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url) {
        sendResponse({ error: 'No active tab' });
        return;
      }

      try {
        const result = await analyzeCurrentPage(tab.id);
        sendResponse({ success: true, result });

        // Open results page with URL parameter to auto-expand
        const resultsUrl = chrome.runtime.getURL('src/results/index.html') +
          '?expand=' + encodeURIComponent(tab.url);
        chrome.tabs.create({ url: resultsUrl });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sendResponse({ error: errorMessage });
      }
    });
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Analyzer AI extension installed');
});
