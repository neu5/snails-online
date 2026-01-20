import { World, Vec2 } from "planck-js";
import { createMap } from "./createMap.js";
import { createPlayer } from "./createPlayers.js";
import { createBullet } from "./createBullet.js";
import { decreaseHealth } from "./utils.js";

const BULLET_TIMEOUT = 2;

let gameLoop = null;
let roundTimer = null;
let bulletTimer = null;

const TEAMS = [
  { name: "team1", color: "red" },
  { name: "team2", color: "blue" },
  {
    name: "team3",
    color: "green",
  },
];

const PLAYERS_NUM = 2;

const endRound = ({ clients, gameState, io }) => {
  // this works only for two players
  clients.forEach((client) => {
    client.keys = {
      arrowup: false,
      arrowleft: false,
      arrowdown: false,
      arrowright: false,
    };
    client.canMove = !client.canMove;
  });
  gameState.remainingRoundDuration = gameState.roundDuration;
  gameState.shouldRoundBeFinished = false;
  gameState.isBulletFired = false;

  let players = [];

  clients.forEach(({ username, isActive, canMove }) => {
    players.push({ username, isActive, canMove });
  });

  io.to("the game room").emit("server:players", players);
};

const endGame = ({ clients, gameState, socket, world }) => {
  clients.forEach((client) => {
    client.keys = {
      arrowup: false,
      arrowleft: false,
      arrowdown: false,
      arrowright: false,
    };
    client.canMove = false;
  });

  clearInterval(gameLoop);
  clearInterval(roundTimer);

  gameState.isBulletFired = false;
  gameState.bulletDirection = {};
  gameState.bulletPos = {};
  gameState.shouldRoundBeFinished = false;
  gameState.shouldGameBeFinished = false;

  emitWorldState(gameState, socket, world);
};

const getWorldState = (gameState, world) => {
  const list = [];
  if (!world) return list;

  let id = 0;
  let ud = {};
  for (let body = world.getBodyList(); body; body = body.getNext()) {
    const position = body.getPosition();
    const angle = body.getAngle();
    const type = body.getType();
    const fixture = body.getFixtureList();
    ud = body.getUserData();

    let shapeData = {};
    if (fixture) {
      const shape = fixture.getShape();
      const shapeType = shape.getType();

      if (ud.type === "bullet") {
        const ms = Date.now() - bulletTimer;

        if (
          gameState.shouldBeBulletDestroyed ||
          Math.floor(ms / 1000) > BULLET_TIMEOUT
        ) {
          world.destroyBody(body);
          gameState.shouldBeBulletDestroyed = false;
          gameState.bulletDirection = null;
          gameState.shouldRoundBeFinished = true;
        } else {
          body.setPosition(
            Vec2(
              gameState.bulletPos.x + gameState.bulletDirection.x / 6,
              gameState.bulletPos.y + gameState.bulletDirection.y / 6,
            ),
          );
          gameState.bulletPos = body.getPosition();
        }
      } else {
        shapeData = {
          shape: shapeType,
        };
      }

      if (ud.sessionID === gameState?.playerToDecreaseHealth) {
        gameState.playerToDecreaseHealth = null;
        gameState.shouldRoundBeFinished = true;
        const healthNum = decreaseHealth(ud.healthNum);
        body.setUserData({ ...ud, healthNum });

        if (healthNum === 0) {
          gameState.shouldGameBeFinished = true;
        }
      }
    }

    list.push({
      id: id++,
      type,
      position: { x: position.x, y: position.y },
      userData: body.getUserData(),
      angle: angle,
      fixtures: fixture ? [shapeData] : [],
    });
  }

  return list;
};

export const emitWorldState = (gameState, socket, world) => {
  const worldState = getWorldState(gameState, world);
  socket.emit("server:world-state", JSON.stringify(worldState));
};

export const startGame = ({ clients, io, gameState, socket }) => {
  // Create physics world
  const world = new World({
    gravity: Vec2(0, -10),
  });

  const mapBodies = createMap(world);

  world.on("begin-contact", (contact) => {
    const fixA = contact.getFixtureA();
    const fixB = contact.getFixtureB();

    const udA = fixA.getUserData && fixA.getUserData();
    const udB = fixB.getUserData && fixB.getUserData();

    if (udB.type === "bullet") {
      gameState.shouldBeBulletDestroyed = true;
      bulletTimer = null;

      if (udA?.type === "worm") {
        gameState.playerToDecreaseHealth = udA.sessionID;
      }
    }
  });

  let wormFacing = "left";
  let weaponSightPos = { x: 0, y: 0 };

  const weaponSight = world.createBody({
    type: "static",
    position: Vec2(10, 10),
  });
  weaponSight.setUserData({ isWeaponSight: true, width: 0.2, height: 0.2 });

  // Store all bodies for serialization
  const bodies = [...mapBodies, weaponSight];

  clients.forEach((client, idx) => {
    for (let i = 0; i < PLAYERS_NUM; i++) {
      const snail = createPlayer({ client, world, teamID: idx });
      // Add worm to bodies array
      bodies.push(snail);
    }
  });

  emitWorldState(gameState, socket, world);

  io.emit("server:game:start", "game has started");

  // make the first client be able to move
  let i = 0;
  let players = [];
  clients.forEach((client) => {
    if (i === 0) {
      client.canMove = true;
      i = 1;
    }
    const { username, isActive, canMove } = client;
    players.push({ username, isActive, canMove });
  });
  io.to("the game room").emit("server:players", players);

  roundTimer = setInterval(() => {
    if (gameState.shouldGameBeFinished) {
      endGame({ clients, gameState, socket, world });
    }

    if (gameState.shouldRoundBeFinished) {
      endRound({ clients, gameState, io });
    }

    if (gameState.remainingRoundDuration > 0) {
      gameState.remainingRoundDuration--;
    } else if (
      Number.isInteger(gameState.remainingRoundDuration) &&
      gameState.remainingRoundDuration < 1
    ) {
      endRound({ clients, gameState, io });
    }
  }, 1000);

  gameLoop = setInterval(() => {
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
            worm.getWorldCenter(),
          );
        } else {
          worm.applyLinearImpulse(
            Vec2(sideJumpForce, jumpForce),
            worm.getWorldCenter(),
          );
        }
      }

      if (client.canMove) {
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
            Vec2(
              wormPos.x - 2 + weaponSightPos.x,
              wormPos.y + 2 + weaponSightPos.y,
            ),
          );
        } else {
          weaponSight.setPosition(
            Vec2(
              wormPos.x + 2 + weaponSightPos.x,
              wormPos.y + 2 + weaponSightPos.y,
            ),
          );
        }

        if (keys.space) {
          if (gameState.isBulletFired) return;
          gameState.isBulletFired = true;
          gameState.remainingRoundDuration = null;

          const bullet = createBullet(world);

          bodies.push(bullet);

          const weaponSightPos = weaponSight.getPosition();
          let bulletStartingPos;
          if (wormFacing === "left") {
            bulletStartingPos = Vec2(wormPos.x - 0.6, wormPos.y + 0.2);
          } else {
            bulletStartingPos = Vec2(wormPos.x + 0.6, wormPos.y + 0.2);
          }

          gameState.bulletDirection = {
            x: weaponSightPos.x - wormPos.x,
            y: weaponSightPos.y - wormPos.y,
          };
          gameState.bulletPos = bulletStartingPos;
          bulletTimer = Date.now();
        }
      }

      // Apply friction to slow down when not pressing keys
      if (!keys.arrowleft && !keys.arrowright) {
        const friction = 0.8;
        worm.setLinearVelocity(Vec2(velocity.x * friction, velocity.y));
      }
    });

    world.step(1 / 60, 8, 3);

    // Broadcast world state to all connected clients
    const worldState = getWorldState(gameState, world);
    const message = JSON.stringify(worldState);

    clients.forEach((client) => {
      io.emit("server:world-state", message);
      io.to("the game room").emit(
        "server:game:timer",
        gameState.remainingRoundDuration,
      );
    });
  }, 1000 / 60);

  socket.on("client:stop-game", () => {
    endGame({ clients, gameState, socket, world });
    // for (let i = 0; i < bodies.length; i++) {
    //   world.destroyBody(bodies[i]);
    // }
    // bodies = [];
  });
};
