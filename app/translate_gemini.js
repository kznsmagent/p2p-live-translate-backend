/* const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "gemini_api_key";

async function translateTextWithGemini(textToTranslate) {
  if (!GEMINI_API_KEY) {
    console.error("API key not found. Please set it in your .env file.");
    return;
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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

module.exports = translateTextWithGemini; */

/* 
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Assumes the API key is set in an environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

// Utility function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Translates text using the Gemini API with Exponential Backoff Retry.
 * @param {string} text - The text to translate.
 * @param {number} maxRetries - The maximum number of times to retry on a 429 error.
 * @returns {Promise<string>} The translated text.

async function translateTextWithGemini(text, maxRetries = 3) {
  let attempt = 0;
  const initialDelay = 1000; // Start with 1 second delay

  while (attempt < maxRetries) {
    try {
      // 1. Call the Gemini API
      const model = "gemini-1.5-flash"; // Use a fast model for translation

      const response = await ai.getGenerativeModel({ model }).generateContent({
        contents: `Translate the following Burmese sentence into English: "${text}"`,
      });

      // Successful translation
      return response.text.trim();
    } catch (err) {
      // Check if the error is a rate limit error (429)
      if (
        err.message &&
        err.message.includes("429 Too Many Requests") &&
        attempt < maxRetries - 1
      ) {
        attempt++;
        // Calculate exponential backoff delay: 1s, 2s, 4s...
        const delay = initialDelay * Math.pow(2, attempt - 1);

        console.warn(
          `⚠️ Rate limit hit. Retrying in ${
            delay / 1000
          } seconds. Attempt ${attempt}/${maxRetries}.`
        );
        await sleep(delay);
      } else {
        // Log the final failure or any other type of error
        console.error(
          "Final Error translating text (after retries or a non-429 error):",
          err
        );
        // Re-throw the error so it can be caught by the calling function (in index.js)
        throw new Error(`Failed to translate text: ${err.message}`);
      }
    }
  }

  // If the loop finishes without success after maxRetries
  throw new Error(
    `Failed to translate text after ${maxRetries} attempts due to sustained rate limiting.`
  );
}

module.exports = translateTextWithGemini;
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "gemini_api_key";

// Utility function for robust translation
async function translateTextWithGemini(textToTranslate) {
  // ... (API key check remains the same)

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // 1. Define the complete prompt
  const fullPrompt = `Translate the following Burmese sentence into English: "${textToTranslate}"`;

  // 2. ⭐ FIX: Pass the content as an explicit array of Parts/Content objects
  const contents = [
    {
      role: "user", // Specify the role
      parts: [
        { text: fullPrompt }, // Pass the prompt text
      ],
    },
  ];

  try {
    // Pass the structured 'contents' array instead of the raw string
    const result = await model.generateContent({ contents }); // Use object syntax for clarity

    // Using result.text is the preferred way to get the response text in one go
    const translatedText = result.text;

    console.log(`Original: "${textToTranslate}"`);
    console.log(`Translated: "${translatedText}"`);
    return translatedText;
  } catch (error) {
    console.error("Error translating text:", error);
    // Re-throw the error so index.js can handle the final failure
    throw error;
  }
}

module.exports = translateTextWithGemini;
