import { World, Vec2, Box, Circle, Edge } from "planck-js";
import { WebSocketServer } from "ws";

// Create physics world
const world = new World({
  gravity: Vec2(0, -10),
});

// Create floor - simple and visible
const floor = world.createBody({
  type: "static",
  position: Vec2(0, -5),
});

floor.createFixture({
  shape: Box(20, 1),
  density: 0,
  friction: 0.6,
});

// Create left wall - simple and visible
const leftWall = world.createBody({
  type: "static",
  position: Vec2(-10, 0),
});

leftWall.createFixture({
  shape: Box(1, 20),
  density: 0,
  friction: 0.6,
});

// Create right wall - simple and visible
const rightWall = world.createBody({
  type: "static",
  position: Vec2(10, 0),
});

rightWall.createFixture({
  shape: Box(1, 20),
  density: 0,
  friction: 0.6,
});

// Create ceiling - simple and visible
const ceiling = world.createBody({
  type: "static",
  position: Vec2(0, 10),
});

ceiling.createFixture({
  shape: Box(20, 1),
  density: 0,
  friction: 0.6,
});

// Store all bodies for serialization
const bodies = [floor, leftWall, rightWall, ceiling];

// Store connected clients and their worms
const clients = new Map();
let nextWormId = 0;

// WebSocket server
const wss = new WebSocketServer({ port: 8080 });

console.log("Server running on ws://localhost:8080");

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Create a worm for this client
  const wormId = nextWormId++;
  const worm = world.createBody({
    type: "dynamic",
    position: Vec2(0, 2),
  });

  worm.createFixture({
    shape: Circle(0.3),
    density: 2, // Heavier for more realistic movement
    friction: 0.8, // More friction for better ground contact
    restitution: 0.1, // Low bounce
  });

  // Set linear damping to make movement more controlled
  worm.setLinearDamping(0.5);
  worm.setAngularDamping(0.8);

  // Store client info
  clients.set(ws, {
    wormId: wormId,
    worm: worm,
    keys: { w: false, a: false, s: false, d: false },
  });

  // Add worm to bodies array
  bodies.push(worm);

  // Send initial world state
  const worldState = getWorldState();
  ws.send(
    JSON.stringify({
      type: "worldState",
      data: worldState,
    })
  );

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === "input") {
        const client = clients.get(ws);
        if (client) {
          client.keys = message.keys;
        }
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    const client = clients.get(ws);
    if (client) {
      // Remove worm from world
      world.destroyBody(client.worm);
      // Remove from bodies array
      const index = bodies.indexOf(client.worm);
      if (index > -1) {
        bodies.splice(index, 1);
      }
      clients.delete(ws);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Game loop
setInterval(() => {
  // Handle worm movement
  clients.forEach((client) => {
    const worm = client.worm;
    const keys = client.keys;
    const velocity = worm.getLinearVelocity();

    // Worm-like movement - slower and more controlled
    const walkSpeed = 2; // Much slower walking
    const jumpForce = 3; // Moderate jump
    const maxWalkSpeed = 3; // Cap walking speed

    // Horizontal movement - only if on ground or moving slowly
    if (keys.a && Math.abs(velocity.y) < 0.5) {
      // Only walk if not moving too fast horizontally
      if (velocity.x > -maxWalkSpeed) {
        worm.applyForce(Vec2(-walkSpeed, 0), worm.getWorldCenter());
      }
    }
    if (keys.d && Math.abs(velocity.y) < 0.5) {
      // Only walk if not moving too fast horizontally
      if (velocity.x < maxWalkSpeed) {
        worm.applyForce(Vec2(walkSpeed, 0), worm.getWorldCenter());
      }
    }

    // Jump (only if on ground)
    if (keys.w) {
      if (Math.abs(velocity.y) < 0.1) {
        // Only jump if not already moving vertically much
        worm.applyLinearImpulse(Vec2(0, jumpForce), worm.getWorldCenter());
      }
    }

    // Apply slight downward force when S is pressed (for faster falling)
    if (keys.s) {
      worm.applyForce(Vec2(0, -1), worm.getWorldCenter());
    }

    // Apply friction to slow down when not pressing keys
    if (!keys.a && !keys.d) {
      const friction = 0.8;
      worm.setLinearVelocity(Vec2(velocity.x * friction, velocity.y));
    }
  });

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

    let shapeData = {};
    if (fixtures) {
      const shape = fixtures.getShape();
      const shapeType = shape.getType();

      if (shapeType === "box") {
        const boxShape = shape;
        shapeData = {
          shape: "box",
          width: boxShape.getWidth() * 2, // Box width
          height: boxShape.getHeight() * 2, // Box height
        };
      } else if (shapeType === "circle") {
        const circleShape = shape;
        shapeData = {
          shape: "circle",
          radius: circleShape.getRadius(),
        };
      } else {
        shapeData = {
          shape: shapeType,
        };
      }
    }

    return {
      id: index,
      type: body.getType(),
      position: { x: position.x, y: position.y },
      angle: angle,
      fixtures: fixtures ? [shapeData] : [],
    };
  });
}
