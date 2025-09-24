const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const os = require("os");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "openai_api_key",
});

async function transcribeAudioFromBase64(base64Audio, options = {}) {
  let tempFilePath = null;

  try {
    // Remove data URL prefix if present
    let cleanBase64 = base64Audio;
    if (base64Audio.includes(",")) {
      cleanBase64 = base64Audio.split(",")[1];
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(cleanBase64, "base64");

    // Create temporary file
    tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Create file stream for OpenAI
    const audioFile = fs.createReadStream(tempFilePath);

    const transcription = await client.audio.transcriptions.create({
      model: options.model || "gpt-4o-transcribe",
      file: audioFile,
      response_format: options.response_format || "json",
      language: options.language,
      prompt: options.prompt,
      temperature: options.temperature || 0,
    });

    return transcription;
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn("Could not delete temp file:", cleanupError.message);
      }
    }
  }
}
module.exports = { transcribeAudioFromBase64 };
