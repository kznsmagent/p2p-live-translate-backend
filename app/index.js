const { Server } = require("socket.io");
const express = require("express");
const http = require("http");
const speech = require("@google-cloud/speech");
const { TranslationServiceClient } = require("@google-cloud/translate").v3;
const { translateSpeechFromBase64 } = require("./translation");
const translateTextWithGemini = require("./translate_gemini");

// --- 1. INITIALIZE CLIENTS ---
// No key file logic needed. This works automatically in Cloud Run.
const speechClient = new speech.SpeechClient();
const translationClient = new TranslationServiceClient();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "speech-text-472808"; // Fallback for local
const location = "global";

const app = express();
const server = http.createServer(app);
let adaptationResourceNames = [];

const IO = new Server(server, {
  cors: {
    origin: "*", // TODO: For production, change this to your frontend URL
    methods: ["GET", "POST"],
  },
});

IO.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.callerId) {
    socket.user = socket.handshake.query.callerId;
    next();
  } else {
    next(new Error("callerId is required"));
  }
});

IO.on("connection", (socket) => {
  console.log(socket.user, "Connected");
  socket.join(socket.user);

  // --- Call signaling (No changes needed) ---
  socket.on("makeCall", (data) => {
    socket.to(data.calleeId).emit("newCall", {
      callerId: socket.user,
      sdpOffer: data.sdpOffer,
    });
  });

  // ... other signaling events ...
  socket.on("answerCall", (data) => {
    socket.to(data.callerId).emit("callAnswered", {
      callee: socket.user,
      sdpAnswer: data.sdpAnswer,
    });
  });

  socket.on("IceCandidate", (data) => {
    socket.to(data.calleeId).emit("IceCandidate", {
      sender: socket.user,
      iceCandidate: data.iceCandidate,
    });
  });

  socket.on("endCall", (data) => {
    socket.to(data.calleeId).emit("callEnded", { from: socket.user });
  });

  socket.on("audioRecording", async (data) => {
    const sttLocale = data.language || "my-MM";

    console.log(`Received audio from ${socket.user} for language ${sttLocale}`);

    try {
      const isBurmeseSpeaker = sttLocale === "my-MM";
      const translateSource = isBurmeseSpeaker ? "my-MM" : "en-US";
      const translateTarget = isBurmeseSpeaker ? "en" : "my";

      var { recognizedText, translatedText } = await translateSpeechFromBase64(
        data.audio.toString("base64"),
        translateSource,
        translateTarget
      );

      if (isBurmeseSpeaker) {
        translatedText = await translateTextWithGemini(recognizedText);
      }
      console.log(
        `🔥 Recognized Text: ${recognizedText}\n✅Translated Text: ${translatedText}`
      );
      /*  if (!transcription) {
        console.log(`[${socket.user}]: Empty transcription result.`);
        return;
      }

      console.log(`Transcription [${socket.user}]: ${transcription}`);
 */
      // Map STT locale -> Translation ISO codes
      // If the speaker spoke Burmese, translate Burmese ("my") -> English ("en")
      // If the speaker spoke English, translate English ("en") -> Burmese ("my")
      /* const isBurmeseSpeaker = sttLocale.toLowerCase().startsWith("my");
      const translateSource = isBurmeseSpeaker ? "my" : "en";
      const translateTarget = isBurmeseSpeaker ? "en" : "my";

      const translateRequest = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [transcription],
        mimeType: "text/plain",
        sourceLanguageCode: translateSource,
        targetLanguageCode: translateTarget,
      };

      const [translationResponse] = await translationClient.translateText(
        translateRequest
      );
      const translatedText =
        translationResponse.translations?.[0]?.translatedText || "";

      if (!translatedText) {
        console.log(`[${socket.user}]: Empty translation result.`);
        return;
      }

      console.log(`Translated [${socket.user}]: ${translatedText}`);

      const resultPayload = {
        text: transcription, // original in speaker's language
        translated: translatedText, // translated for the other side
        from: translateSource,
        to: translateTarget,
      };
 */
      const resultPayload = {
        text: recognizedText, // original in speaker's language
        translated: translatedText, // translated for the other side
        from: socket.user,
        to: data.to,
      };
      // Send result to the peer
      if (data.to) socket.to(data.to).emit("sttResult", resultPayload);
      // Optionally also send back to the sender so they can see what was heard
      //socket.emit("sttResult", resultPayload);
    } catch (err) {
      console.error("Google Cloud API Error:", err);
      socket.emit("sttError", { message: "Failed to process audio." });
    }
  });

  socket.on("disconnect", () => {
    console.log(socket.user, "Disconnected");
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 8080;
// ADDED: Host '0.0.0.0' is required for Cloud Run
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
