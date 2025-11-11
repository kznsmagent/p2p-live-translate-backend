const {
  SpeechTranslationConfig,
  AudioConfig,
  TranslationRecognizer,
  ResultReason,
  CancellationDetails,
} = require("microsoft-cognitiveservices-speech-sdk");

// Set your environment variables or replace with actual values
const speechKey = process.env.SPEECH_KEY || "speech_key";
const speechRegion = process.env.SPEECH_REGION || "southeastasia";

async function translateSpeechFromBase64(
  base64Audio,
  sourceLanguage = "my-MM",
  targetLanguage = "en"
) {
  try {
    // Create speech translation config
    const speechTranslationConfig = SpeechTranslationConfig.fromSubscription(
      speechKey,
      speechRegion
    );
    speechTranslationConfig.speechRecognitionLanguage = sourceLanguage; // Burmese
    speechTranslationConfig.addTargetLanguage(targetLanguage); // Translate to English

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Audio, "base64");

    // Create audio config from base64
    const pushStream =
      require("microsoft-cognitiveservices-speech-sdk").AudioInputStream.createPushStream();
    pushStream.write(audioBuffer);
    pushStream.close();

    const audioConfig = AudioConfig.fromStreamInput(pushStream);

    // Create translation recognizer
    const translationRecognizer = new TranslationRecognizer(
      speechTranslationConfig,
      audioConfig
    );

    return new Promise((resolve, reject) => {
      translationRecognizer.recognizeOnceAsync((result) => {
        switch (result.reason) {
          case ResultReason.TranslatedSpeech:
            /*  console.log(`RECOGNIZED: Text=${result.text}`);
            console.log(
              `Translated into [${targetLanguage}]: ${result.translations.get(
                targetLanguage
              )}`
            );
 */
            const translationResult = {
              recognizedText: result.text,
              translatedText: result.translations.get(targetLanguage),
              sourceLanguage: sourceLanguage,
              targetLanguage: targetLanguage,
              success: true,
            };
            resolve(translationResult);
            break;

          case ResultReason.NoMatch:
            /* console.log("NOMATCH: Speech could not be recognized."); */
            reject(new Error("Speech could not be recognized"));
            break;

          case ResultReason.Canceled:
            const cancellation = CancellationDetails.fromResult(result);
            console.log(
              `CANCELED: Reason=${cancellation.reason}, ${cancellation.errorDetails}`
            );
            if (cancellation.reason === CancellationReason.Error) {
              console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
              console.log(
                `CANCELED: ErrorDetails=${cancellation.errorDetails}`
              );
            }
            reject(
              new Error(`Translation canceled: ${cancellation.errorDetails}`)
            );
            break;
        }
        translationRecognizer.close();
      });
    });
  } catch (error) {
    console.error("Error during translation:", error);
    throw error;
  }
}

module.exports = { translateSpeechFromBase64 };
