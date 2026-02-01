# Page Analyzer AI

A Chrome extension that analyzes web pages for typos, grammar issues, and content improvements using LLM APIs (Groq/Gemini).

## Features

- Analyze current page or batch analyze multiple internal pages
- Support for Groq and Gemini AI providers
- Bring your own API keys
- View and export analysis results
- Background tab processing (doesn't interrupt your browsing)

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Watch mode (development)

```bash
npm run dev
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

## Publishing to Chrome Web Store

### Create package

```bash
npm run package
```

This will:
1. Generate icons
2. Build the extension
3. Create a zip file in `releases/`

### Submit to Chrome Web Store

1. Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer fee (if not already done)
3. Click "New Item"
4. Upload the zip file from `releases/`
5. Fill in the store listing:
   - Detailed description
   - Screenshots (1280x800 or 640x400)
   - Promotional images (optional)
   - Category: Productivity
   - Language: English
6. Fill in Privacy practices:
   - Single purpose: "Analyzes web page content for typos and grammar issues"
   - Permissions justification
   - Data usage disclosure
7. Submit for review

### Store Listing Description (suggested)

```
Page Analyzer AI helps you find typos, grammar issues, and content problems on any web page using advanced AI models.

Features:
• Analyze any web page with one click
• Batch analyze multiple pages from the same site
• Choose between Groq or Gemini AI providers
• Use your own API keys (no subscription required)
• View detailed analysis with suggested fixes
• Export results as JSON

How to use:
1. Get a free API key from Groq (console.groq.com) or Gemini (aistudio.google.com)
2. Open extension settings and enter your API key
3. Navigate to any website
4. Click the extension icon and start analyzing

Perfect for:
• Content writers and editors
• Website owners and developers
• QA testers
• Anyone who wants error-free web content

Privacy: All analysis is done directly between your browser and the AI provider. No data is stored on external servers.
```

## Project Structure

```
page-analyzer-ai/
├── src/
│   ├── popup/          # Extension popup UI
│   ├── options/        # Settings page
│   ├── results/        # Results page
│   ├── background/     # Service worker
│   ├── content/        # Content script
│   ├── lib/            # Shared utilities
│   └── styles/         # Tailwind CSS
├── public/
│   ├── manifest.json   # Extension manifest
│   └── icons/          # Extension icons
├── scripts/            # Build scripts
└── dist/               # Built extension
```

## License

MIT
