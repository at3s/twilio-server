const express = require("express");
const app = express();
// const path = require('path');
const server = require("http").createServer(app);
const socket = require("socket.io");
const io = socket(server);

const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const Twilio = require("twilio");
require("dotenv").config();

const MAX_ALLOWED_SESSION_DURATION = 14400;
const MAX_ALLOWED_SESSION_DURATION = 14400;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKeySID = process.env.TWILIO_API_KEY_SID;
const twilioApiKeySecret = process.env.TWILIO_API_KEY_SECRET;

// app.use(express.static(path.join(__dirname, 'build')));

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  console.log(req.originalURL);
  res.setHeader("Access-Control-Allow-Origin", `*`);

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

io.on("connection", (socket) => {
  console.log("a user connected with socket id :", socket.id);
  socket.on("send-gift", (data) => {
    io.emit("data-gift-from-server", data);
  });
});

async function getConnectedParticipants(roomName) {
  const client = new Twilio(twilioApiKeySID, twilioApiKeySecret, {
    accountSid: twilioAccountSid,
  });

  let list = await client.video
    .rooms(roomName)
    .participants.list({ status: "connected" });

  return list;
}

app.get("/token", async (req, res) => {
  const { identity, roomName } = req.query;
  let connectedParticipants = await getConnectedParticipants(roomName);
  // if first user connect . connectedParticipants.length = 0;
  if (
    connectedParticipants.length + 1 >
    parseInt(process.env.REACT_APP_CLIENT_LIMIT)
  ) {
    res.send(null);
    return;
  }
  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKeySID,
    twilioApiKeySecret,
    {
      ttl: MAX_ALLOWED_SESSION_DURATION,
    }
  );
  token.identity = identity;
  const videoGrant = new VideoGrant({ room: roomName });
  token.addGrant(videoGrant);
  res.send(token.toJwt());
  console.log(`issued token for ${identity} in room ${roomName}`);
});

// app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'build/index.html')));

app.get("/participants", async (req, res) => {
  let { roomName } = req.query;
  let connectedParticipants = await getConnectedParticipants(roomName);
  res.status(200).json({ participants: connectedParticipants });
});

app.get("/", (req, res) => {
  res.send("server is running");
});

server.listen(8081, () => {
  console.log("token server running on 8081");
});
