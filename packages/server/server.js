import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomBytes } from "crypto";
import { World, Vec2, Box, Circle, Edge } from "planck-js";
import { InMemorySessionStore } from "./sessionsStore.js";

const app = express();
const httpServer = createServer(app);

const randomId = () => randomBytes(8).toString("hex");
const sessionStore = new InMemorySessionStore();

const io = new Server(httpServer, {
  cors: true,
});

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  const session = sessionStore.findSession(sessionID);

  if (!sessionID) {
    socket.data.sessionID = randomId();

    return next();
  } else {
    socket.data.sessionID = sessionID;
  }

  next();
});

io.on("connection", (socket) => {
  if (
    !sessionStore.findSession(socket.data.sessionID) &&
    socket.data.sessionID
  ) {
    sessionStore.saveSession(socket.data.sessionID, {
      connected: true,
      // userID: socket.data.userID,
      username: socket.data.username,
    });
  }

  socket.emit("server:session", {
    sessionID: socket.data.sessionID,
    // userID: socket.data.userID,
  });

  socket.on("joinRoom", (message) => {
    console.log("joinRoom", message);
    // const client = clients.get(message.socketId);
    // client.username = message.username;
  });
});

httpServer.listen(3000);
console.log("Server running at port 3000");
