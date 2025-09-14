import { World, Vec2, Box, Circle, Edge } from "planck-js";
import { WebSocketServer } from "ws";

// Create physics world
const world = new World({
  gravity: Vec2(0, -10),
});

// Create ground
const ground = world.createBody({
  type: "static",
  position: Vec2(0, -5),
});

ground.createFixture({
  shape: Box(20, 1),
  density: 0,
  friction: 0.6,
});

// Create some walls
const leftWall = world.createBody({
  type: "static",
  position: Vec2(-10, 0),
});

leftWall.createFixture({
  shape: Box(1, 20),
  density: 0,
  friction: 0.6,
});

const rightWall = world.createBody({
  type: "static",
  position: Vec2(10, 0),
});

rightWall.createFixture({
  shape: Box(1, 20),
  density: 0,
  friction: 0.6,
});

// Create some dynamic objects
const box1 = world.createBody({
  type: "dynamic",
  position: Vec2(-2, 5),
});

box1.createFixture({
  shape: Box(1, 1),
  density: 1,
  friction: 0.6,
});

const box2 = world.createBody({
  type: "dynamic",
  position: Vec2(2, 5),
});

box2.createFixture({
  shape: Box(1, 1),
  density: 1,
  friction: 0.6,
});

const ball = world.createBody({
  type: "dynamic",
  position: Vec2(0, 8),
});

ball.createFixture({
  shape: Circle(0.5),
  density: 1,
  friction: 0.6,
});

// Store all bodies for serialization
const bodies = [ground, leftWall, rightWall, box1, box2, ball];

// WebSocket server
const wss = new WebSocketServer({ port: 8080 });

console.log("Server running on ws://localhost:8080");

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send initial world state
  const worldState = getWorldState();
  ws.send(
    JSON.stringify({
      type: "worldState",
      data: worldState,
    })
  );

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Game loop
setInterval(() => {
  world.step(1 / 60, 8, 3);

  // Broadcast world state to all connected clients
  const worldState = getWorldState();
  const message = JSON.stringify({
    type: "worldState",
    data: worldState,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}, 1000 / 60);

function getWorldState() {
  return bodies.map((body, index) => {
    const position = body.getPosition();
    const angle = body.getAngle();
    const fixtures = body.getFixtureList();

    return {
      id: index,
      type: body.getType(),
      position: { x: position.x, y: position.y },
      angle: angle,
      fixtures: fixtures
        ? [
            {
              shape: fixtures.getShape().getType(),
              // For now, we'll just include basic shape info
              // In a real game, you'd want to serialize the actual shape data
            },
          ]
        : [],
    };
  });
}
