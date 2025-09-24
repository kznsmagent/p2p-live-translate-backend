const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.API_KEY || "gemini_api_key";

async function translateTextWithGemini(textToTranslate) {
  if (!API_KEY) {
    console.error("API key not found. Please set it in your .env file.");
    return;
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are an on-the-fly interpreter for caregiver, nanny, domestic worker, chef, and nurse interviews.
Produce a clear, concise English answer suitable for recruiters.
- Preserve facts precisely (names, dates, doses, experience years, tools).
- Smooth grammar and phrasing; keep first person.
- Clarify role terms once in parentheses (e.g., "thanaka (traditional cosmetic)").
- Keep sensitive or medical terms accurate; don't soften or exaggerate.
- No extra commentary—output only the refined English.

Burmese: "${textToTranslate}"
English (polished):
`;


  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();
    console.log(`Original: "${textToTranslate}"`);
    console.log(`Translated: "${translatedText}"`);
    return translatedText;
  } catch (error) {
    console.error("Error translating text:", error);
  }
}

module.exports = translateTextWithGemini;
