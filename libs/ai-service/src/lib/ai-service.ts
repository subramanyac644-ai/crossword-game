import { Word, AIWordResponse } from '@game-engine/shared-types';

/**
 * Validates and filters words from the AI response.
 * Filters out: spaces, symbols, duplicates, and invalid lengths.
 */
function validateWords(words: AIWordResponse[]): AIWordResponse[] {
  const seen = new Set<string>();
  return words.filter(item => {
    const word = item.word.toUpperCase().trim();
    // Rules: No spaces, 3-15 chars, letters only, no duplicates
    const isValid = /^[A-Z]{3,15}$/.test(word) && !seen.has(word);
    if (isValid) seen.add(word);
    return isValid;
  });
}

/**
 * Generates a set of crossword words and clues from a given topic using OpenRouter (GPT-4o mini).
 */
const generateCache = new Map<string, AIWordResponse[]>();

export async function generateCrosswordFromText(
  topic: string,
  apiKey: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<AIWordResponse[]> {
  if (!apiKey) {
    throw new Error('OpenRouter API Key is missing. Please provide a valid API key.');
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

        Return ONLY a strict JSON array of objects:
        [
          { "word": "WORD", "clue": "Relevant clue here..." }
        ]
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

        Return ONLY a strict JSON array of objects:
        [
          { "word": "WORD", "clue": "Relevant clue here..." }
        ]
        `;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:4200',
          'X-Title': 'Crossword Game'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          temperature: 0.7 + (attempts * 0.1),
        }),
      });

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}));
        throw new Error(`API Error ${response.status}: ${errData?.error?.message || response.statusText}`);
      }

      const data: any = await response.json();
      let rawContent = data.choices?.[0]?.message?.content || '';
      
      console.log(`[AI SERVICE] Raw response received (Attempt ${attempts + 1})`);

      // Extract JSON if model wrapped it in code blocks
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) rawContent = jsonMatch[0];

      const parsed: { word: string; clue: string }[] = JSON.parse(rawContent.trim());
      
      const result: AIWordResponse[] = parsed.map(p => {
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
      
      if (validated.length >= 5) {
        console.log(`[AI SERVICE] Successfully generated ${validated.length} contextual clues.`);
        generateCache.set(cacheKey, validated);
        return validated;
      }
      
      throw new Error(`Only ${validated.length} valid words generated.`);
    } catch (error: any) {
      console.error(`[AI SERVICE] Attempt ${attempts + 1} failed:`, error);
      lastErrorReason = error.message;
      if (attempts === maxAttempts - 1) {
        throw new Error(`OpenRouter AI Generation failed after ${maxAttempts} attempts. Detail: ${lastErrorReason}`);
      }
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000));
    }
    attempts++;
  }

  throw new Error(`Could not generate a valid puzzle for topic: "${topic}".`);
}

/**
 * Requests a contextual hint for a specific word using OpenRouter.
 */
export async function getClueHint(word: Word, apiKey?: string): Promise<string> {
  if (!apiKey) {
    return `Hint: The first letter is "${word.word.charAt(0)}".`;
  }

  const prompt = `
    Context: You are a helpful crossword assistant.
    The user is stuck on this clue: "${word.clue}" (Answer: "${word.word}", ${word.length} letters).
    Provide a witty, short hint (max 15 words) that helps the user without giving away the answer.
  `;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4200',
        'X-Title': 'Crossword Game'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8
      }),
    });

    if (!response.ok) return `Think about a word starting with "${word.word.charAt(0)}".`;

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || 'No hint available.';
  } catch (error) {
    return `The word begins with "${word.word.charAt(0)}"...`;
  }
}
