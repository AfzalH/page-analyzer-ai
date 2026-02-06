import type { AnalysisResult } from '../lib/types';
import { getResults, clearResults, exportResults } from '../lib/storage';

const elements = {
  resultsContainer: document.getElementById('resultsContainer') as HTMLDivElement,
  emptyState: document.getElementById('emptyState') as HTMLDivElement,
  exportBtn: document.getElementById('exportBtn') as HTMLButtonElement,
  clearBtn: document.getElementById('clearBtn') as HTMLButtonElement,
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseMarkdownTable(tableText: string): string {
  const lines = tableText.trim().split('\n');
  if (lines.length < 2) return tableText;

  const parseRow = (row: string): string[] => {
    return row
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1 || arr.length === 1);
  };

  const headerCells = parseRow(lines[0]);
  if (headerCells.length === 0) return tableText;

  // Check if second line is separator (|---|---|)
  const separatorLine = lines[1];
  if (!separatorLine || !/^[\s|:-]+$/.test(separatorLine)) return tableText;

  const headerRow = headerCells
    .map((cell) => `<th class="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">${cell}</th>`)
    .join('');

  const bodyRows = lines
    .slice(2)
    .filter((line) => line.includes('|'))
    .map((line) => {
      const cells = parseRow(line);
      const cellsHtml = cells
        .map((cell) => `<td class="border border-gray-300 px-3 py-2">${cell}</td>`)
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  return `<div class="table-wrapper"><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

function renderAnalysis(analysis: string): string {
  // First, handle tables before escaping HTML
  // Match markdown tables: lines starting with | and containing |
  const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n?)+)/g;
  let processedAnalysis = analysis.replace(tableRegex, (match, tableBlock) => {
    const lines = tableBlock.trim().split('\n');
    // Verify it's a valid table (has header separator line with dashes)
    if (lines.length >= 2 && /^[\s|:-]+$/.test(lines[1])) {
      return '\n{{TABLE:' + btoa(encodeURIComponent(tableBlock)) + '}}\n';
    }
    return match;
  });

  let html = escapeHtml(processedAnalysis);

  // Restore and parse tables
  html = html.replace(/\{\{TABLE:([^}]+)\}\}/g, (_match, encoded) => {
    try {
      const tableText = decodeURIComponent(atob(encoded));
      return parseMarkdownTable(tableText);
    } catch {
      return '';
    }
  });

  // Code blocks (```code```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="bg-gray-800 text-gray-100 p-3 rounded my-2 overflow-x-auto text-xs"><code>${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-purple-700 px-1 rounded text-xs">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-gray-800 mt-4 mb-2">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-gray-800 text-base mt-4 mb-2">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="font-bold text-gray-900 text-lg mt-4 mb-2">$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet points
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Wrap consecutive list items
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');

  // Line breaks for remaining text
  html = html.replace(/\n\n/g, '</p><p class="my-2">');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = `<p class="my-2">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2"><\/p>/g, '');
  html = html.replace(/<p class="my-2">(<h[234])/g, '$1');
  html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
  html = html.replace(/<p class="my-2">(<pre)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p class="my-2">(<ul)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p class="my-2">(<div class="table-wrapper">)/g, '$1');
  html = html.replace(/(<\/table><\/div>)<\/p>/g, '$1');

  return html;
}

function renderResult(result: AnalysisResult, index: number): string {
  const path = new URL(result.url).pathname;
  const id = `result-${index}`;

  return `
    <div class="card">
      <div class="result-header flex items-start justify-between cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-t-lg" data-target="${id}" data-url="${escapeHtml(result.url)}">
        <div class="flex-1 min-w-0">
          <h3 class="font-medium text-gray-900 truncate">${escapeHtml(result.title || path)}</h3>
          <div class="text-sm text-gray-500 truncate">${escapeHtml(result.url)}</div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
            <span>Analyzed: ${formatDate(result.analyzedAt)}</span>
            <span>Provider: ${escapeHtml(result.provider)}</span>
            <span>Model: ${escapeHtml(result.model)}</span>
          </div>
        </div>
        <span class="toggle-icon text-gray-400 ml-4 text-lg" data-target="${id}">&#9662;</span>
      </div>
      <div id="${id}" class="hidden mt-4 pt-4 border-t">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-sm text-gray-600">Source:</span>
          <a href="${escapeHtml(result.url)}" target="_blank" class="text-sm text-purple-600 hover:underline truncate">
            ${escapeHtml(result.url)}
          </a>
        </div>
        <div class="text-sm text-gray-600 mb-2">Analysis:</div>
        <div class="bg-purple-50 p-4 rounded analysis-content">
          ${renderAnalysis(result.analysis)}
        </div>
      </div>
    </div>
  `;
}

function renderDomainGroup(domain: string, results: AnalysisResult[]): string {
  const sortedResults = [...results].sort((a, b) => b.analyzedAt - a.analyzedAt);

  return `
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span class="w-2 h-2 bg-purple-600 rounded-full"></span>
        ${escapeHtml(domain)}
        <span class="text-sm font-normal text-gray-400">(${results.length} page${results.length === 1 ? '' : 's'})</span>
      </h2>
      <div class="space-y-4">
        ${sortedResults.map((result, index) => renderResult(result, index)).join('')}
      </div>
    </div>
  `;
}

async function renderResults(): Promise<void> {
  const results = await getResults();
  const domains = Object.keys(results).sort();

  if (domains.length === 0) {
    elements.emptyState.classList.remove('hidden');
    elements.resultsContainer.innerHTML = '';
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.resultsContainer.innerHTML = domains
    .map((domain) => renderDomainGroup(domain, results[domain]))
    .join('');

  setupToggleListeners();
  autoExpandFromUrl();
}

function autoExpandFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const expandUrl = params.get('expand');

  if (!expandUrl) return;

  // Find the result header with matching URL
  const header = document.querySelector<HTMLElement>(`.result-header[data-url="${CSS.escape(expandUrl)}"]`);
  if (!header) return;

  const targetId = header.dataset.target;
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  // Expand the result
  target.classList.remove('hidden');
  const icon = header.querySelector('.toggle-icon');
  if (icon) {
    icon.innerHTML = '&#9652;';
  }

  // Scroll to the result
  header.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupToggleListeners(): void {
  document.querySelectorAll<HTMLElement>('.result-header').forEach((header) => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target;
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      const icon = header.querySelector('.toggle-icon');
      const isHidden = target.classList.contains('hidden');
      target.classList.toggle('hidden');

      if (icon) {
        icon.innerHTML = isHidden ? '&#9652;' : '&#9662;';
      }
    });
  });
}

async function handleExport(): Promise<void> {
  const data = await exportResults();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `page-analyzer-results-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

async function handleClear(): Promise<void> {
  if (confirm('Are you sure you want to clear all analysis results? This cannot be undone.')) {
    await clearResults();
    await renderResults();
  }
}

elements.exportBtn.addEventListener('click', handleExport);
elements.clearBtn.addEventListener('click', handleClear);

renderResults();
