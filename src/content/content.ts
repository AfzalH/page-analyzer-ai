import type { PageContent, MessageRequest } from '../lib/types';

function extractTextContent(): string {
  const excludedTags = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'IFRAME',
    'NAV',
    'HEADER',
    'FOOTER',
    'ASIDE',
    'SVG',
  ]);

  function getTextFromNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim() || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;

      if (excludedTags.has(element.tagName)) {
        return '';
      }

      if (element.getAttribute('aria-hidden') === 'true') {
        return '';
      }

      if (element.getAttribute('role') === 'navigation') {
        return '';
      }

      const texts: string[] = [];
      for (const child of node.childNodes) {
        const text = getTextFromNode(child);
        if (text) {
          texts.push(text);
        }
      }
      return texts.join(' ');
    }

    return '';
  }

  const mainContent =
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.body;

  let text = getTextFromNode(mainContent);
  text = text.replace(/\s+/g, ' ').trim();

  const maxLength = 50000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '... [truncated]';
  }

  return text;
}

function extractInternalLinks(): string[] {
  const currentHost = window.location.hostname;
  const currentOrigin = window.location.origin;
  const links = new Set<string>();

  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href, currentOrigin);

      if (url.hostname !== currentHost) return;

      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

      const ext = url.pathname.split('.').pop()?.toLowerCase();
      const excludedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'zip', 'mp4', 'mp3'];
      if (ext && excludedExtensions.includes(ext)) return;

      url.hash = '';

      const normalizedUrl = url.href;
      if (normalizedUrl !== window.location.href.split('#')[0]) {
        links.add(normalizedUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return Array.from(links).sort();
}

function getPageContent(): PageContent {
  return {
    url: window.location.href,
    title: document.title,
    content: extractTextContent(),
    internalLinks: extractInternalLinks(),
  };
}

chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (request.type === 'getContent') {
      const content = getPageContent();
      sendResponse(content);
    } else if (request.type === 'getLinks') {
      const links = extractInternalLinks();
      sendResponse({ links });
    }
    return true;
  }
);
