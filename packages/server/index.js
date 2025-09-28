import { World, Vec2, Box, Circle, Edge } from "planck-js";
import { WebSocketServer } from "ws";

// Create physics world
const world = new World({
  gravity: Vec2(0, -10),
});

let wormFacing = "left";
let weaponSightPos = { x: 0, y: 0 };

// Create floor - simple and visible
const floor = world.createBody({
  name: "floor",
  type: "static",
  position: Vec2(0, -13),
});
const floorSize = { x: 17, y: 0.25 };
floor.createFixture({
  shape: Box(floorSize.x, floorSize.y),
  density: 0,
  friction: 0.6,
});
floor.setUserData({
  shape: "box",
  width: floorSize.x * 2,
  height: floorSize.y * 2,
});

// Create left wall - simple and visible
const leftWall = world.createBody({
  name: "leftWall",
  type: "static",
  position: Vec2(-17, 0),
});
const leftWallSize = { x: 0.25, y: 20 };
leftWall.createFixture({
  shape: Box(leftWallSize.x, leftWallSize.y),
  density: 0,
  friction: 0.6,
});
leftWall.setUserData({
  shape: "box",
  width: leftWallSize.x * 2,
  height: leftWallSize.y * 2,
});

// Create right wall - simple and visible
const rightWall = world.createBody({
  name: "rightWall",
  type: "static",
  position: Vec2(17, 0),
});
const rightWallSize = { x: 0.25, y: 20 };
rightWall.createFixture({
  shape: Box(rightWallSize.x, rightWallSize.y),
  density: 0,
  friction: 0.6,
});
rightWall.setUserData({
  shape: "box",
  width: rightWallSize.x * 2,
  height: rightWallSize.y * 2,
});

const platform = world.createBody({
  type: "static",
  position: Vec2(1, -2),
  angle: Math.PI / 24,
});
const platformSize = { x: 5, y: 0.2 };
platform.createFixture({
  shape: Box(platformSize.x, platformSize.y),
  density: 0,
  friction: 1,
});
platform.setUserData({
  shape: "box",
  width: platformSize.x * 2,
  height: platformSize.y * 2,
});

const platform2 = world.createBody({
  type: "static",
  position: Vec2(-8, -3),
});
const platformSize2 = { x: 5, y: 0.2 };
platform2.createFixture({
  shape: Box(platformSize2.x, platformSize2.y),
  density: 0,
  friction: 1,
});
platform2.setUserData({
  shape: "box",
  width: platformSize2.x * 2,
  height: platformSize2.y * 2,
});

const weaponSight = world.createBody({
  type: "static",
  position: Vec2(10, 10),
});
weaponSight.setUserData({ isWeaponSight: true, width: 0.2, height: 0.2 });

// Store all bodies for serialization
const bodies = [floor, leftWall, rightWall, platform, platform2, weaponSight];

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
    allowSleep: false,
  });
  const wormSize = { x: 0.3, y: 0.5 };
  worm.createFixture({
    // shape: Circle(0.3),
    // density: 2, // Heavier for more realistic movement
    // friction: 0.8, // More friction for better ground contact
    // restitution: 0.1, // Low bounce
    shape: Box(wormSize.x, wormSize.y),
    density: 0,
    friction: 0.1,
    restitution: 0, // bouncy, good for packages from the sky
  });
  worm.setUserData({
    shape: "box",
    width: wormSize.x * 2,
    height: wormSize.y * 2,
    isWorm: true,
    healthNum: 100,
  });

  // Set linear damping to make movement more controlled
  worm.setLinearDamping(0.5);
  worm.setAngularDamping(0.8);

  // Store client info
  clients.set(ws, {
    wormId: wormId,
    worm: worm,
    keys: {
      arrowup: false,
      arrowleft: false,
      arrowdown: false,
      arrowright: false,
    },
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

    const superSpeed = 3;

    // Worm-like movement - slower and more controlled
    const walkSpeed = 2 * superSpeed; // Much slower walking
    const jumpForce = 4; // Moderate jump
    const maxWalkSpeed = 3; // Cap walking speed

    // Horizontal movement - only if on ground or moving slowly
    if (keys.arrowleft && Math.abs(velocity.y) < 0.5) {
      // Only walk if not moving too fast horizontally
      if (velocity.x > -maxWalkSpeed) {
        wormFacing = "left";
        worm.applyForce(Vec2(-walkSpeed, 0), worm.getWorldCenter());
      }
    }
    if (keys.arrowright && Math.abs(velocity.y) < 0.5) {
      // Only walk if not moving too fast horizontally
      if (velocity.x < maxWalkSpeed) {
        wormFacing = "right";
        worm.applyForce(Vec2(walkSpeed, 0), worm.getWorldCenter());
      }
    }

    if (keys.enter && velocity.y === 0) {
      const sideJumpForce = 12;
      if (wormFacing === "left") {
        worm.applyLinearImpulse(
          Vec2(-sideJumpForce, jumpForce),
          worm.getWorldCenter()
        );
      } else {
        worm.applyLinearImpulse(
          Vec2(sideJumpForce, jumpForce),
          worm.getWorldCenter()
        );
      }
    }

    if (keys.arrowup) {
      if (weaponSightPos.y < 2) {
        weaponSightPos.y += 0.1;
      }
    }

    if (keys.arrowdown) {
      if (weaponSightPos.y > -6) {
        weaponSightPos.y -= 0.1;
      }
    }

    const wormPos = worm.getPosition();

    if (wormFacing === "left") {
      weaponSight.setPosition(
        Vec2(wormPos.x - 2 + weaponSightPos.x, wormPos.y + 2 + weaponSightPos.y)
      );
    } else {
      weaponSight.setPosition(
        Vec2(wormPos.x + 2 + weaponSightPos.x, wormPos.y + 2 + weaponSightPos.y)
      );
    }

    // Apply friction to slow down when not pressing keys
    if (!keys.arrowleft && !keys.arrowright) {
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
      userData: body.getUserData(),
      angle: angle,
      fixtures: fixtures ? [shapeData] : [],
    };
  });
}
