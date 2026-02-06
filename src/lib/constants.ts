export const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B' },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
];

export const ANALYSIS_PROMPT = `Review this web page HTML and identify only the TOP 5 most important text issues.

Page URL: {url}

HTML Content:
{content}

Rules:
- List exactly 5 issues maximum (or fewer if the content is good) preferably in a markdown table format.
- Focus on: typos, spelling errors, grammar issues in the visible text
- Ignore HTML tags/attributes - only analyze the human-readable text content
- Be concise - one/two sentences per issue
- Include the original text and suggested fix
- Skip minor stylistic preferences

Format each issue as:
**Issue N:** "original text" → "suggested fix" (reason)`;

export const DEFAULT_SETTINGS = {
  groqApiKey: '',
  geminiApiKey: '',
  groqModel: GROQ_MODELS[0].id,
  geminiModel: GEMINI_MODELS[0].id,
  preferredProvider: 'groq' as const,
  maxPages: 10,
};

export const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
