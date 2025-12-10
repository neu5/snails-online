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
let timer = null;
let gameState = {
  isBulletFired: false,
  bulletDirection: {},
  bulletPos: {},
  roundDuration: 5,
};

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
  const session = sessionStore.findSession(socket.data.sessionID);
  if (!session && socket.data.sessionID) {
    sessionStore.saveSession(socket.data.sessionID, {
      connected: true,
      // userID: socket.data.userID,
      username: socket.data.username,
    });
  } else {
    if (session.username) {
      clients.set(socket.data.sessionID, {
        username: session.username,
        sessionID: socket.data.sessionID,
        socketId: socket.id,
        isActive: true,
        keys: {
          arrowup: false,
          arrowleft: false,
          arrowdown: false,
          arrowright: false,
        },
      });

      socket.emit("server:room:joined", "Username joined the room");
      socket.join("the game room");

      let players = [];

      clients.forEach(({ username, isActive }) => {
        players.push({ username, isActive });
      });
      io.to("the game room").emit("server:players", players);
    }
  }

  socket.emit("server:session", {
    sessionID: socket.data.sessionID,
    // userID: socket.data.userID,
  });

  socket.on("client:room:join", (message) => {
    const { username } = message;

    if (username === "") {
      socket.emit("server:error:username", "Username cannot be empty.");
      return;
    }

    const sessionID = socket.data.sessionID;

    clients.set(sessionID, {
      username,
      sessionID,
      socketId: socket.id,
      isActive: true,
      keys: {
        arrowup: false,
        arrowleft: false,
        arrowdown: false,
        arrowright: false,
      },
    });

    const session = sessionStore.findSession(sessionID);
    session.username = username;

    socket.emit("server:room:joined", "Username joined the room");
    socket.join("the game room");

    let players = [];

    clients.forEach(({ username, isActive }) => {
      players.push({ username, isActive });
    });
    io.to("the game room").emit("server:players", players);
  });

  socket.on("client:room:leave", ({ sessionID }) => {
    // user shouldn't be able to leave the room if the game is running
    const client = clients.get(sessionID);
    if (!client) return;

    clients.delete(sessionID);

    let players = [];

    clients.forEach(({ username, isActive }) => {
      players.push({ username, isActive });
    });

    socket.leave("the game room");
    socket.emit("server:room:leaved", "Username leaved the room");
    io.to("the game room").emit("server:players", players);
  });

  socket.on("client:start-game", () => {
    // const usersInRooms = io.sockets.adapter.rooms.get("the game room");
    if (clients.size > 1) {
      const game = startGame({ clients, io, gameLoop, gameState, socket });
      // FIX: add error handling
      bodies = game.bodies;
      gameLoop = game.gameLoop;
      world = game.world;

      timer = setInterval(() => {
        if (gameState.roundDuration > 0) {
          gameState.roundDuration = gameState.roundDuration - 1;
        }
      }, 1000);
    } else {
      socket.emit(
        "server:error:start-game",
        "Cannot start a game. Not enough players."
      );
    }
  });

  socket.on("client:stop-game", () => {
    clearInterval(gameLoop);
    gameLoop = null;
    timer = null;

    for (let i = 0; i < bodies.length; i++) {
      world.destroyBody(bodies[i]);
    }

    bodies = [];

    emitWorldState(world, gameState, socket, world);
  });

  socket.on("client:input", (message) => {
    const client = clients.get(message.sessionID);
    if (client) {
      client.keys = message.keys;
    }
  });

  socket.on("disconnect", () => {
    // console.log("disconnect", socket);
  });
});

httpServer.listen(3000);
console.log("Server running at port 3000");
