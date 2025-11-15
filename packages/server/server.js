import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomBytes } from "crypto";
import { InMemorySessionStore } from "./sessionsStore.js";
import { startGame, emitWorldState } from "./game.js";

const app = express();
const httpServer = createServer(app);

const randomId = () => randomBytes(8).toString("hex");
const sessionStore = new InMemorySessionStore();

const io = new Server(httpServer, {
  cors: true,
});

let world = null;
let bodies = [];
let gameLoop;

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

  socket.on("client:start-game", () => {
    // const usersInRooms = io.sockets.adapter.rooms.get("the game room");

    if (clients.size > 0) {
      const game = startGame({ clients, io, gameLoop, socket });
      // FIX: add error handling
      bodies = game.bodies;
      gameLoop = game.gameLoop;
      world = game.world;
    } else {
      socket.emit(
        "server:error:start game",
        "Cannot start a game. Not enough players connected."
      );
    }
  });

  socket.on("client:stop-game", () => {
    clearInterval(gameLoop);
    gameLoop = null;

    for (let i = 0; i < bodies.length; i++) {
      world.destroyBody(bodies[i]);
    }

    bodies = [];

    emitWorldState(bodies, socket);
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
