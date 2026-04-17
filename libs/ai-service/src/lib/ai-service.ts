import { Word, AIWordResponse } from '@game-engine/shared-types';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

let cachedModelName: string | null = null;
const blacklistedModels = new Set<string>();

/**
 * Discovers the best available model for the given API key.
 * This avoids 404 errors by asking the API what is actually available.
 */
async function discoverBestModel(apiKey: string): Promise<string> {
  // If we already have a discovered model that isn't blacklisted, use it
  if (cachedModelName && !blacklistedModels.has(cachedModelName)) {
    return cachedModelName;
  }

  console.log('[AI SERVICE] Discovering available models via v1beta...');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Model Discovery failed (${response.status}). Key status might be restricted.`);
    }

    const data = await response.json();
    const models: any[] = data.models || [];
    
    // Preference: prioritize fast, high-quota models that aren't blacklisted
    const preferred = [
      'models/gemini-1.5-flash-8b', // Ultra fast
      'models/gemini-1.5-flash', 
      'models/gemini-2.0-flash-exp',
      'models/gemini-1.5-pro',
      'models/gemini-pro',
      'models/gemini-2.0-flash'
    ];
    
    let bestModel = '';
    for (const p of preferred) {
      const match = models.find(m => 
        m.name === p && 
        m.supportedMethodNames?.includes('generateContent') &&
        !blacklistedModels.has(m.name)
      );
      if (match) {
        bestModel = match.name;
        break;
      }
    }

    // Secondary search for any non-blacklisted supporting name
    if (!bestModel && models.length > 0) {
      const anySupporting = models.find(m => 
        m.supportedMethodNames?.includes('generateContent') && 
        !blacklistedModels.has(m.name)
      );
      if (anySupporting) bestModel = anySupporting.name;
    }

    if (!bestModel) {
      // Final hard fallback ONLY if not blacklisted
      const fallback = 'models/gemini-1.5-flash';
      if (!blacklistedModels.has(fallback)) return fallback;
      
      // If even the fallback is blacklisted, try something else or throw
      const emergency = models.find(m => !blacklistedModels.has(m.name))?.name;
      if (emergency) return emergency;
      
      throw new Error('All discovered Gemini models are currently restricted (Quota/Not Found).');
    }

    console.log(`[AI SERVICE] Selected model for session: ${bestModel}`);
    cachedModelName = bestModel;
    return bestModel;
  } catch (error: any) {
    console.warn('[AI SERVICE] Discovery failure, using default 1.5-flash.');
    return 'models/gemini-1.5-flash';
  }
}

/**
 * Validates and filters words from the AI response.
 * Filters out: spaces, symbols, duplicates, and invalid lengths.
 */
function validateWords(words: AIWordResponse[]): AIWordResponse[] {
  const seen = new Set<string>();
  return words.filter(item => {
    const word = item.word.toUpperCase().trim();
    // Rules: No spaces, 3-15 chars (technical words can be long), letters only, no duplicates
    const isValid = /^[A-Z]{3,15}$/.test(word) && !seen.has(word);
    if (isValid) seen.add(word);
    return isValid;
  });
}

/**
 * Generates a set of crossword words and clues from a given topic using Gemini AI.
 * @param topic The topic to generate the puzzle about.
 * @param apiKey The Gemini API key.
 */
// Simple in-memory cache to prevent abusive quota burning for identical generations
const generateCache = new Map<string, AIWordResponse[]>();

export async function generateCrosswordFromText(
  topic: string,
  apiKey: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<AIWordResponse[]> {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please provide a valid API key.');
  }

  // Check cache hit
  const cacheKey = `${topic.toLowerCase()}_${difficulty}`;
  if (generateCache.has(cacheKey)) {
    console.log(`[AI SERVICE] Cache HIT for key: ${cacheKey}`);
    return generateCache.get(cacheKey)!;
  }

  let attempts = 0;
  const maxAttempts = 3;
  let lastErrorReason = '';

  const difficultyInstruction = difficulty === 'hard'
    ? 'Use highly obscure, complex, and professional-level terminology.'
    : difficulty === 'easy'
    ? 'Use extremely common, elementary-school level vocabulary. Very simple.'
    : 'Use standard, moderately challenging vocabulary.';

  while (attempts < maxAttempts) {
    // Auto-discover the model name inside the loop to allow failover between attempts
    const modelName = await discoverBestModel(apiKey);
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;

    try {
      const isDocument = topic.length > 500;
      
      const fullPrompt = isDocument 
        ? `
        Given the following document content:
        "${topic}"

        Extract 12–15 important single-word terms from this document that would make good crossword answers.
        ${difficultyInstruction}
        Each word must be 3–15 letters long.
        IMPORTANT: Use single words whenever possible (no spaces or hyphens).

        For each word, generate a crossword clue that is:
        - Contextual to the document
        - Creative and not just a dictionary definition
        - Refers to how the word is used in the text

        Return strict JSON array of objects:
        [
          { "word": "WORD", "clue": "Relevant clue here..." }
        ]

        ONLY return the JSON array.
        `
        : `
        Given the topic: "${topic}"

        Generate 12–15 important single-word terms related to this topic.
        ${difficultyInstruction}
        Each word must be 3–15 letters long.
        IMPORTANT: Use single words whenever possible (no spaces or hyphens).

        For each word, generate a crossword clue that is:
        - Contextual to the topic
        - Not a dictionary definition
        - Refers to how the word is used in the topic/context

        Return strict JSON array of objects:
        [
          { "word": "WORD", "clue": "Relevant clue here..." }
        ]

        ONLY return the JSON array.
        `;

      const response = await fetch(`${baseUrl}?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7 + (attempts * 0.1),
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  word: {
                    type: "STRING",
                    description: "A single word related to the topic, uppercase, 3-15 letters, no spaces."
                  },
                  clue: {
                    type: "STRING",
                    description: "A witty or contextual clue for the word."
                  }
                },
                required: ["word", "clue"]
              }
            }
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
           const err = new Error('Rate Limit (429) - You have exceeded your Gemini free tier usage quota. Please wait a minute before generating more puzzles.');
           err.name = 'RateLimitError';
           throw err;
        }

        // Failover on Not Found (404/403), OR High Demand (503)
        if (response.status === 404 || response.status === 403 || response.status === 503) {
          const reason = response.status === 503 ? 'High Demand (503)' : 
                         response.status === 403 ? 'Permission Denied / Region Restricted (403)' : 'Not Found (404)';
          console.warn(`[AI SERVICE] Model ${modelName} failed (${reason}). Blacklisting and failing over...`);
          
          lastErrorReason = reason;
          blacklistedModels.add(modelName);
          cachedModelName = null;
          
          // Adaptive delay: 1.5s for 503 to let server breathe, 0.5s for others
          const delay = response.status === 503 ? 1500 : 500;
          await new Promise(r => setTimeout(r, delay));
          
          attempts++;
          continue; 
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(`API Error ${response.status}: ${errData?.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as GeminiResponse;
      let rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log(`[AI SERVICE] Raw response received (Attempt ${attempts + 1})`);

      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) rawContent = jsonMatch[0];

      const parsed: { word: string; clue: string }[] = JSON.parse(rawContent);
      
      const result: AIWordResponse[] = parsed.map(p => {
        // Clean word: remove spaces, hyphens, and symbols for the grid
        const cleaned = p.word.toUpperCase().replace(/[^A-Z]/g, '');
        return {
          word: cleaned,
          clue: p.clue,
          row: 0,
          col: 0,
          direction: 'across',
          length: cleaned.length
        };
      });

      const validated = validateWords(result);
      console.log(`[AI SERVICE] Validated words: ${validated.length}`);
      
      // Technical topics often yield fewer words, so we accept 5+ if necessary
      if (validated.length >= 5) {
        console.log(`[AI SERVICE] Successfully generated ${validated.length} contextual clues.`);
        generateCache.set(cacheKey, validated);
        return validated;
      }
      
      console.warn(`[AI SERVICE] Attempt ${attempts + 1} yielding only ${validated.length} words. Retrying...`);
    } catch (error: any) {
      console.error(`[AI SERVICE] Attempt ${attempts + 1} failed:`, error);
      lastErrorReason = error.message;
      if (error.name === 'RateLimitError') {
        throw error;
      }
      if (attempts === maxAttempts - 1) {
        throw new Error(`AI Generation for "${topic}" failed after ${maxAttempts} attempts. Detail: ${lastErrorReason}`);
      }
    }
    attempts++;
  }

  throw new Error(
    `Could not generate a valid puzzle for topic: "${topic}". ` + 
    (lastErrorReason ? `Latest API Error: ${lastErrorReason}. ` : '') + 
    `Please try a more specific or common topic.`
  );
}

/**
 * Requests a contextual hint for a specific word without revealing the answer.
 * @param word The word for which a hint is required.
 * @param apiKey The Gemini API key.
 */
export async function getClueHint(word: Word, apiKey?: string): Promise<string> {
  if (!apiKey) {
    return `Hint: The first letter is "${word.word.charAt(0)}".`;
  }

  // Auto-discover the model name to avoid 404s
  const modelName = await discoverBestModel(apiKey);
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;

  const prompt = `
    Context: You are a helpful crossword assistant.
    The user is stuck on this clue: "${word.clue}" (Answer: "${word.word}", ${word.length} letters).
    Provide a witty, short hint (max 15 words) that helps the user without giving away the answer.
  `;

  try {
    const response = await fetch(`${baseUrl}?key=${apiKey.trim()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) return `Think about a word starting with "${word.word.charAt(0)}".`;

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No hint available.';
  } catch (error) {
    return `The word begins with "${word.word.charAt(0)}"...`;
  }
}
