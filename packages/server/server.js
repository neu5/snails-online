import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomBytes } from "crypto";
import { InMemorySessionStore } from "./sessionsStore.js";
import { startGame } from "./game.js";

const app = express();
const httpServer = createServer(app);

const randomId = () => randomBytes(8).toString("hex");
const sessionStore = new InMemorySessionStore();

const io = new Server(httpServer, {
  cors: true,
});

// Store connected clients and their worms
const clients = new Map();

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  const session = sessionStore.findSession(sessionID);

  if (!sessionID || !session) {
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
    const { username } = message;

    if (username === "") {
      socket.emit("server:error:username", "Username cannot be empty.");
      return;
    }

    clients.set(socket.id, {
      socketId: socket.id,
      keys: {
        arrowup: false,
        arrowleft: false,
        arrowdown: false,
        arrowright: false,
      },
    });

    socket.join("the game room");
  });

  socket.on("startGame", () => {
    // const usersInRooms = io.sockets.adapter.rooms.get("the game room");

    if (clients.size > 0) {
      startGame({ clients, io, socket });
    } else {
      socket.emit(
        "server:error:start game",
        "Cannot start a game. Not enough players connected."
      );
    }
  });

  socket.on("input", (message) => {
    const client = clients.get(message.socketId);
    if (client) {
      client.keys = message.keys;
    }
  });
});

httpServer.listen(3000);
console.log("Server running at port 3000");
