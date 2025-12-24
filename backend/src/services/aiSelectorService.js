/**
 * AI Selector Service
 * LLM kullanarak DOM'dan en uygun elementi bul
 * OpenAI veya Google Gemini destekli
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Hangi provider'ı kullanacağız?
const AI_PROVIDER = OPENAI_API_KEY ? 'openai' : GEMINI_API_KEY ? 'gemini' : null;

let openai = null;
let gemini = null;

if (AI_PROVIDER === 'openai') {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('[AISelectorService] OpenAI provider aktif');
} else if (AI_PROVIDER === 'gemini') {
  gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('[AISelectorService] Gemini provider aktif');
} else {
  console.warn('[AISelectorService] ⚠️ AI provider bulunamadı! OPENAI_API_KEY veya GEMINI_API_KEY .env dosyasına eklenmeli.');
}

/**
 * DOM yapısını ve kullanıcı adımını analiz edip en uygun elementi bul
 * @param {string} domJson - Simplified DOM (JSON string)
 * @param {string} userStep - Kullanıcı adımı ("Click Hesapla button" gibi)
 * @returns {Promise<Object>} - { tempId, action, value, elementText, reason, confidence }
 */
export async function generatePlaywrightSelector(domJson, userStep) {
  if (!AI_PROVIDER) {
    throw new Error('AI Selector Service: API key bulunamadı. OPENAI_API_KEY veya GEMINI_API_KEY gerekli.');
  }

  const prompt = `You are an expert QA Automation Engineer specializing in Playwright test automation.

I will provide:
1. A list of visible, interactive UI elements on a web page (JSON format)
2. A user action step in natural language

Your task:
Find the BEST matching element for the given user action. Consider:
- Exact text matches are preferred (highest priority)
- **POPUP/MODAL CONTEXT**:
  * If user action mentions "popup", "modal", "dialog", "açılan popup/modal", ONLY consider elements where isInModal=true
  * Ignore elements with isInModal=false when user explicitly mentions popup/modal context
  * If no popup context in action, prioritize elements with isInModal=false (main page content)
- Semantic meaning (e.g., "login" matches "sign in", but be careful - "kıyaslama" and "karşılaştırma" are similar but may refer to different elements)
- Element type must match action (buttons for clicks, inputs for typing)
- Visibility and position on page

User Action Step: "${userStep}"

Visible Elements (JSON):
${domJson}

Return a JSON object with this exact structure:
{
  "tempId": "The 'id' field from the element list above (number)",
  "action": "click | fill | select | check | hover",
  "value": "text to type (only if action is 'fill')",
  "elementText": "the text of the matched element",
  "reason": "short explanation why this element was chosen (max 50 chars)",
  "confidence": "0-100 confidence score"
}

IMPORTANT:
- **PAGE NAVIGATION**: If the action is about navigating to a different PAGE or URL (e.g., "go to login page", "navigate to homepage", "Ana sayfaya git"), return:
  { "tempId": null, "action": "navigate", "confidence": 100, "reason": "Navigation action, no element needed" }
- **TAB/SECTION SWITCHING**: If action mentions switching TABS or SECTIONS within the same page (e.g., "go to Profile tab", "Kıyaslama tabına git", "switch to Settings tab"), this is a CLICK action. Find and click the tab element.
- Return ONLY valid JSON, no markdown or explanation
- If no good match found, return { "tempId": null, "confidence": 0, "reason": "No matching element found" }
- For fill actions, extract the value from the user step (e.g., "Type '150000'" → value: "150000")`;

  try {
    let responseText;

    if (AI_PROVIDER === 'openai') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Hızlı ve ekonomik, karmaşık durumlarda gpt-4o kullanılabilir
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1 // Deterministik sonuçlar için düşük
      });
      responseText = response.choices[0].message.content;
    } else if (AI_PROVIDER === 'gemini') {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Hızlı model
      const result = await model.generateContent(prompt);
      responseText = result.response.text();

      // Gemini bazen markdown ile JSON döndürür, temizle
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const aiDecision = JSON.parse(responseText);

    console.log(`[AISelectorService] AI Kararı:`, aiDecision);
    return aiDecision;

  } catch (error) {
    console.error('[AISelectorService] Hata:', error.message);
    throw new Error(`AI Selector Service hatası: ${error.message}`);
  }
}

/**
 * Vision-based selector bulma (Ekran görüntüsü + DOM analizi)
 * İleri seviye: Sadece DOM yetmezse kullanılır
 * @param {Buffer} screenshot - PNG screenshot buffer
 * @param {string} userStep - Kullanıcı adımı
 * @returns {Promise<Object>} - Koordinat veya selector
 */
export async function generateSelectorWithVision(screenshot, userStep) {
  if (AI_PROVIDER !== 'openai') {
    throw new Error('Vision API sadece OpenAI (GPT-4o) ile desteklenir');
  }

  const base64Image = screenshot.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Find the UI element for this action: "${userStep}"\n\nReturn JSON: { "description": "element description", "coordinates": { "x": 0, "y": 0 }, "confidence": 0-100 }`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500
  });

  return JSON.parse(response.choices[0].message.content);
}

export default {
  generatePlaywrightSelector,
  generateSelectorWithVision
};
