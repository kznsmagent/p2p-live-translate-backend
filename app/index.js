/* const dotenv = require("dotenv");
dotenv.config();
 */
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
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "livekit-api-key";
const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET || "livekit-api-secret";

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
  res.send("test LiveKit Node.js server running in get('/') ✅");
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

  socket.on("voice", async (data) => {
    const { to, voice } = data;
    socket.to(to).emit("playVoice", {
      voice: voice,
    });
  });
  socket.on("audioRecording", async (data) => {
    const { language, to, audio: base64Audio } = data;

    try {
      const audioBuffer = Buffer.from(base64Audio, "base64");
      console.log(`Received audio bytes`);
      //------for-recognize-translate-----
      const result = await translateSpeechFromBase64(
        audioBuffer,
        language === "my-MM" ? "my-MM" : "en-US",
        language === "my-MM" ? "en" : "my"
      );
      const geminiText = await translateTextWithGemini(
        result.recognizedText,
        language === "my-MM" ? "Burmese" : "English",
        language === "my-MM" ? "English" : "Burmese"
      );

      socket.to(to).emit("sttResult", {
        text: result.recognizedText,
        translated: geminiText, //result.translatedText,
        from: socket.user,
        to,
      });
    } catch (err) {
      console.error("STT Error:", err.message);
      socket.emit("sttError", { message: err.message });
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
