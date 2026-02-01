import type { Settings, AnalysisResult, StorageData } from './types';
import { DEFAULT_SETTINGS } from './constants';

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...data.settings };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({
    settings: { ...current, ...settings },
  });
}

export async function getResults(): Promise<Record<string, AnalysisResult[]>> {
  const data = await chrome.storage.local.get('results');
  return data.results || {};
}

export async function saveResult(result: AnalysisResult): Promise<void> {
  const results = await getResults();
  const domain = new URL(result.url).hostname;

  if (!results[domain]) {
    results[domain] = [];
  }

  const existingIndex = results[domain].findIndex((r) => r.url === result.url);
  if (existingIndex >= 0) {
    results[domain][existingIndex] = result;
  } else {
    results[domain].push(result);
  }

  await chrome.storage.local.set({ results });
}

export async function clearResults(): Promise<void> {
  await chrome.storage.local.set({ results: {} });
}

export async function clearResultsForDomain(domain: string): Promise<void> {
  const results = await getResults();
  delete results[domain];
  await chrome.storage.local.set({ results });
}

export async function exportResults(): Promise<StorageData> {
  const settings = await getSettings();
  const results = await getResults();
  return { settings, results };
}
