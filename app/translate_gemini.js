const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.API_KEY || "gemini_api_key";

async function translateTextWithGemini(textToTranslate) {
  if (!API_KEY) {
    console.error("API key not found. Please set it in your .env file.");
    return;
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Translate the following Burmese sentence into English: "${textToTranslate}"`;

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
