import type { Settings, GroqResponse, GeminiResponse } from './types';
import { GROQ_API_ENDPOINT, GEMINI_API_ENDPOINT, ANALYSIS_PROMPT } from './constants';

function buildPrompt(url: string, content: string): string {
  return ANALYSIS_PROMPT.replace('{url}', url).replace('{content}', content);
}

export async function analyzeWithGroq(
  apiKey: string,
  model: string,
  url: string,
  content: string
): Promise<string> {
  const prompt = buildPrompt(url, content);

  const response = await fetch(GROQ_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 12288,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data: GroqResponse = await response.json();
  return data.choices[0]?.message?.content || 'No analysis generated';
}

export async function analyzeWithGemini(
  apiKey: string,
  model: string,
  url: string,
  content: string
): Promise<string> {
  const prompt = buildPrompt(url, content);
  const endpoint = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 12288,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data: GeminiResponse = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'No analysis generated';
}

export async function analyzeContent(
  settings: Settings,
  url: string,
  content: string
): Promise<{ analysis: string; provider: string; model: string }> {
  const { preferredProvider, groqApiKey, geminiApiKey, groqModel, geminiModel } = settings;

  if (preferredProvider === 'groq') {
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }
    const analysis = await analyzeWithGroq(groqApiKey, groqModel, url, content);
    return { analysis, provider: 'groq', model: groqModel };
  } else {
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    const analysis = await analyzeWithGemini(geminiApiKey, geminiModel, url, content);
    return { analysis, provider: 'gemini', model: geminiModel };
  }
}
