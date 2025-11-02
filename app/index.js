const { Server } = require("socket.io");
const express = require("express");
const http = require("http");
const { translateSpeechFromBase64 } = require("./translation");
const translateTextWithGemini = require("./translate_gemini");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
const server = http.createServer(app);
app.use(express.json());

//-------------------------------LIVEKIT-------------------
// TODO: replace with your LiveKit API Key/Secret from dashboard
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "livekit_api_key";
const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET || "livekit_secret_key";

console.log(`🔑 Debug Key: ${LIVEKIT_API_KEY}`);
console.log(`🤫 Debug Secret: ${LIVEKIT_API_SECRET.substring(0, 4)}...`);
// Generate LiveKit token endpoint
app.post("/getToken", async (req, res) => {
  const { identity, roomName } = req.body;

  if (!identity || !roomName) {
    return res
      .status(400)
      .json({ error: "identity and roomName are required" });
  }

  // Create new token
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  console.log(`🔥 LIVEKIT TOKEN: ${JSON.stringify(token)}`);
  res.json({ token });
});

// Health check
app.get("/", (req, res) => {
  res.send("LiveKit Node.js server running in get('/') ✅");
});
//-------------------------------END LIVEKIT--------------

const IO = new Server(server, {
  cors: {
    origin: "*",
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

      const resultPayload = {
        text: recognizedText,
        translated: translatedText,
        from: socket.user,
        to: data.to,
      };
      // Send result to the peer
      if (data.to) socket.to(data.to).emit("sttResult", resultPayload);
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
