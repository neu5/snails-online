import { io } from "socket.io-client";
import { World, Vec2 } from "planck";
import { createBodies, createBullet } from "./factory";

const sessionID = localStorage.getItem("sessionID");

const socket = io("localhost:3000", {
  autoConnect: false,
});

class GameClient {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.usernameInput = document.getElementById("username");
    this.usernameInputError = document.getElementById("username-error");
    this.joinRoomButton = document.getElementById("join");
    this.startGameButton = document.getElementById("start-game");
    this.stopGameButton = document.getElementById("stop-game");
    this.startGameError = document.getElementById("start-game-error");
    this.status = document.getElementById("status");

    // Debug flag to run local physics
    const params = new URLSearchParams(window.location.search);
    this.debugLocalPhysics = params.get("debug") !== null;

    // Store world data for rendering (no physics simulation on client)
    this.bodies = new Map();

    // Local physics (debug) state
    this.world = null;
    this.players = new Map();
    this.debugBodies = [];
    this.debugWorm = null;
    this.weaponSightPos = { x: 0, y: 0 };
    this.bullet = null;
    this.shouldBeBulletDestroyed = false;
    this.shouldDecreaseHealth = false;
    this.isBulletFired = false;
    this.bulletPos = { x: 0, y: 0 };
    this.bulletDirection = null;

    // Input handling
    this.keys = {
      arrowup: false,
      arrowleft: false,
      arrowdown: false,
      arrowright: false,
      space: false,
      enter: false,
    };
    this.setupInputHandlers();

    if (!this.debugLocalPhysics) {
      this.connect();
    } else {
      this.updateStatus("Debug mode: local physics (no server)", "connected");
      this.initDebugWorld();
    }

    // Rendering
    this.scale = 30; // pixels per meter
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;

    this.render();
  }

  setupInputHandlers() {
    document.addEventListener("keydown", (event) => {
      if (!event.code) return;
      switch (event.code.toLowerCase()) {
        case "arrowup":
          event.preventDefault();
          this.keys.arrowup = true;
          break;
        case "arrowleft":
          this.keys.arrowleft = true;
          break;
        case "arrowdown":
          event.preventDefault();
          this.keys.arrowdown = true;
          break;
        case "arrowright":
          this.keys.arrowright = true;
          break;
        case "space":
          event.preventDefault();
          this.keys.space = true;
          break;
        case "enter":
          event.preventDefault();
          this.keys.enter = true;
          break;
      }
      if (!this.debugLocalPhysics) this.sendInput();
    });

    document.addEventListener("keyup", (event) => {
      if (!event.code) return;
      switch (event.code.toLowerCase()) {
        case "arrowup":
          this.keys.arrowup = false;
          break;
        case "arrowleft":
          this.keys.arrowleft = false;
          break;
        case "arrowdown":
          this.keys.arrowdown = false;
          break;
        case "arrowright":
          this.keys.arrowright = false;
          break;
        case "space":
          this.keys.space = false;
          break;
        case "enter":
          this.keys.enter = false;
          break;
      }
      if (!this.debugLocalPhysics) this.sendInput();
    });
  }

  // === Debug local physics world (mirrors server) ===
  initDebugWorld() {
    this.world = new World({ gravity: Vec2(0, -10) });

    this.world.on("begin-contact", (contact) => {
      const fixA = contact.getFixtureA();
      const fixB = contact.getFixtureB();

      const udA = fixA.getUserData && fixA.getUserData();
      const udB = fixB.getUserData && fixB.getUserData();

      if (udB.type === "bullet") {
        this.shouldBeBulletDestroyed = true;

        if (udA.isNPC) {
          this.shouldDecreaseHealth = true;
        }
      }
    });

    createBodies(this);

    // this.debugBodies = [floor];
  }

  applyDebugInput() {
    if (!this.debugWorm) return;
    const worm = this.debugWorm;
    const velocity = worm.getLinearVelocity();

    const superSpeed = 3;

    const walkSpeed = 2 * superSpeed;
    const jumpForce = 4;
    const maxWalkSpeed = 3;

    // Walk only when roughly on ground
    if (this.keys.arrowleft && Math.abs(velocity.y) < 0.5) {
      if (velocity.x > -maxWalkSpeed) {
        this.wormFacing = "left";
        worm.applyForce(Vec2(-walkSpeed, 0), worm.getWorldCenter());
      }
    }
    if (this.keys.arrowright && Math.abs(velocity.y) < 0.5) {
      if (velocity.x < maxWalkSpeed) {
        this.wormFacing = "right";
        worm.applyForce(Vec2(walkSpeed, 0), worm.getWorldCenter());
      }
    }

    if (this.keys.enter && velocity.y === 0) {
      const sideJumpForce = 12;
      if (this.wormFacing === "left") {
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

    if (this.keys.space) {
      createBullet(this.world, this.isBulletFired);
      const wormPos = this.debugWorm.getPosition();
      const weaponSightPos = this.weaponSight.getPosition();
      let bulletStartingPos;
      if (this.wormFacing === "left") {
        bulletStartingPos = Vec2(wormPos.x - 0.6, wormPos.y + 0.2);
      } else {
        bulletStartingPos = Vec2(wormPos.x + 0.6, wormPos.y + 0.2);
      }

      this.bulletDirection = {
        x: weaponSightPos.x - wormPos.x,
        y: weaponSightPos.y - wormPos.y,
      };
      this.bulletPos = bulletStartingPos;
      this.isBulletFired = true;
    }

    if (this.keys.arrowup) {
      if (this.weaponSightPos.y < 2) {
        this.weaponSightPos.y += 0.1;
      }
    }

    if (this.keys.arrowdown) {
      if (this.weaponSightPos.y > -6) {
        this.weaponSightPos.y -= 0.1;
      }
    }

    // Friction when idle
    if (!this.keys.arrowleft && !this.keys.arrowright) {
      const friction = 0.8;
      worm.setLinearVelocity(Vec2(velocity.x * friction, velocity.y));
    }
  }

  sendInput() {
    if (this.debugLocalPhysics) return;

    if (socket && socket.connected) {
      socket.emit("input", {
        socketId: socket.id,
        keys: this.keys,
      });
    }
  }

  connect() {
    if (sessionID && sessionID !== "undefined") {
      socket.auth = { sessionID };
      socket.connect();
    } else {
      socket.connect();
    }

    socket.on("server:session", ({ sessionID }) => {
      // attach the session ID to the next reconnection attempts
      socket.auth = { sessionID };
      // store it in the localStorage
      localStorage.setItem("sessionID", sessionID);
      // save the ID of the user
      // socket.userID = userID;
    });

    socket.on("server:error:username", (message) => {
      this.usernameInputError.textContent = message;
      this.usernameInputError.classList.remove("hidden");
    });

    socket.on("server:error:start game", (message) => {
      this.startGameError.textContent = message;
      this.startGameError.classList.remove("hidden");
    });

    socket.on("disconnect", () => {
      console.log(socket.id);
    });

    socket.on("server:game:start", (message) => {
      if (message !== "game has started") return;

      this.startGameButton.classList.add("hidden");
      this.stopGameButton.classList.remove("hidden");
    });

    socket.on("server:world-state", (data) => {
      const message = JSON.parse(data);
      this.updateWorldState(message);
    });
  }

  updateStatus(message, className) {
    this.status.textContent = message;
    this.status.className = className;
  }

  updateWorldState(worldData) {
    // Skip in debug mode
    if (this.debugLocalPhysics) return;

    // Clear existing bodies
    this.bodies.clear();

    // Store world data directly for rendering (no physics simulation on client)
    worldData.forEach((bodyData) => {
      const { width, height, radius, shape, isWorm, healthNum, isWeaponSight } =
        bodyData.userData || {};

      const fixture = bodyData.fixtures[0];
      let shapeInfo = {
        shape: shape || "box",
        width: width || 1,
        height: height || 1,
        radius: radius || 0.5,
      };

      if (fixture) {
        if (fixture.shape === "box") {
          shapeInfo.width = fixture.width || 1;
          shapeInfo.height = fixture.height || 1;
        }
      }

      this.bodies.set(bodyData.id, {
        position: bodyData.position,
        angle: bodyData.angle,
        type: bodyData.type,
        shape: shapeInfo.shape,
        width: shapeInfo.width,
        height: shapeInfo.height,
        isWorm: isWorm,
        color: bodyData.userData.color || null,
        isWeaponSight: isWeaponSight || false,
        healthNum: healthNum || null,
      });
    });
  }

  // Build render list from local debug world
  getDebugRenderList() {
    const list = [];
    if (!this.world) return list;

    let id = 0;
    for (let body = this.world.getBodyList(); body; body = body.getNext()) {
      const pos = body.getPosition();
      const angle = body.getAngle();
      const type = body.getType();
      const fixture = body.getFixtureList();

      const bodyUserData = body.getUserData();

      if (bodyUserData?.isWeaponSight) {
        list.push({
          id: id++,
          position: { x: pos.x, y: pos.y },
          angle,
          type,
          shape: "box",
          width: 0.2,
          height: 0.2,
          isWeaponSight: true,
        });
      }

      if (!fixture) continue;
      const shape = fixture.getShape();
      const ud = fixture.getUserData && fixture.getUserData();

      if (ud.type === "bullet") {
        if (this.shouldBeBulletDestroyed) {
          this.world.destroyBody(body);
          this.shouldBeBulletDestroyed = false;
          this.isBulletFired = false;
          this.bulletDirection = null;
        } else {
          body.setPosition(
            Vec2(
              this.bulletPos.x + this.bulletDirection.x / 6,
              this.bulletPos.y + this.bulletDirection.y / 6
            )
          );
          this.bulletPos = body.getPosition();
        }
      }

      let currentHealthNum = null;
      const isPlayer = ud && ud.isWorm;
      const isNPC = ud && ud.isNPC;

      if (isPlayer) {
        currentHealthNum = this.players.get("player").healthNum;
      } else if (isNPC) {
        currentHealthNum = this.players.get("npc").healthNum;
      }

      function decreaseHealth(globalObj, isPlayer, isNPC) {
        let healthNum = 0;

        if (isNPC) {
          const playerData = globalObj.players.get("npc");
          healthNum = playerData.healthNum - 10;
          globalObj.players.set("npc", {
            ...playerData,
            healthNum,
          });
        } else if (isPlayer) {
          let playerData = globalObj.players.get("player");
          healthNum = playerData.healthNum - 10;
          globalObj.players.set("player", {
            ...playerData,
            healthNum,
          });
        }

        return healthNum;
      }

      if (ud.shape === "box") {
        let width = ud && ud.width;
        let height = ud && ud.height;

        list.push({
          id: id++,
          position: { x: pos.x, y: pos.y },
          angle,
          type,
          shape: "box",
          width,
          height,
          isBullet: ud.type === "bullet",
          isWorm: isPlayer,
          isNPC: isNPC,
          healthNum: this.shouldDecreaseHealth
            ? decreaseHealth(this, isPlayer, isNPC)
            : currentHealthNum,
        });
      } else if (ud.shape === "circle") {
        const radius = (ud && ud.radius) || shape.getRadius();
        list.push({
          id: id++,
          position: { x: pos.x, y: pos.y },
          angle,
          type,
          shape: "circle",
          width: 0,
          height: 0,
          radius,
        });
      }

      if (this.shouldDecreaseHealth && (isPlayer || isNPC)) {
        this.shouldDecreaseHealth = false;
      }
    }

    return list;
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    this.joinRoomButton.onclick = () => {
      const username = this.usernameInput.value;
      this.usernameInputError.classList.add("hidden");
      socket.emit("joinRoom", { socketId: socket.id, username });
    };

    this.startGameButton.onclick = () => {
      this.startGameError.classList.add("hidden");
      this.stopGameButton.classList.remove("hidden");
      socket.emit("client:start-game");
    };

    this.stopGameButton.onclick = () => {
      this.startGameButton.classList.remove("hidden");
      this.stopGameButton.classList.add("hidden");
      socket.emit("client:stop-game");
    };

    // Debug local physics step and render
    if (this.debugLocalPhysics) {
      this.applyDebugInput();
      this.world.step(1 / 60, 8, 3);
      const list = this.getDebugRenderList();

      list.forEach((bodyInfo) => this.drawBody(bodyInfo));
      requestAnimationFrame(() => this.render());
      return;
    }

    // Draw bodies from server state
    this.bodies.forEach((bodyInfo) => {
      this.drawBody(bodyInfo);
    });

    // Continue rendering
    requestAnimationFrame(() => this.render());
  }

  drawGrid() {
    this.ctx.strokeStyle = "#444";
    this.ctx.lineWidth = 1;

    const gridSize = 1 * this.scale;
    const startX = this.offsetX % gridSize;
    const startY = this.offsetY % gridSize;

    for (let x = startX; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = startY; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawBody(bodyInfo) {
    const position = bodyInfo.position;
    const angle = bodyInfo.angle;

    const x = position.x * this.scale + this.offsetX;
    const y = this.canvas.height - (position.y * this.scale + this.offsetY);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(-angle);

    if (bodyInfo.type === "static" && !bodyInfo.isWeaponSight) {
      // Simple static object rendering - make everything visible
      this.ctx.fillStyle = "#666";
      this.ctx.strokeStyle = "#333";
    } else if (bodyInfo.isWorm) {
      // Worm styling - bright green with darker outline
      this.ctx.fillStyle = bodyInfo.color;
      this.ctx.strokeStyle = bodyInfo.color;

      this.ctx.fillText(bodyInfo.healthNum, -10, -20);
    } else if (bodyInfo.isNPC) {
      this.ctx.fillStyle = "#ff00ff";
      this.ctx.strokeStyle = "#74035aff";

      this.ctx.fillText(bodyInfo.healthNum, -10, -20);
    } else if (bodyInfo.isBullet) {
      this.ctx.fillStyle = "#ff0000ff";
      this.ctx.strokeStyle = "#ff0000ff";
    } else {
      this.ctx.fillStyle = "#4CAF50";
      this.ctx.strokeStyle = "#66BB6A";
    }

    if (bodyInfo.isWeaponSight) {
      if (this.debugLocalPhysics) {
        const wormPos = this.debugWorm.getPosition();
        if (this.wormFacing === "left") {
          this.weaponSight.setPosition(
            Vec2(
              wormPos.x - 2 + this.weaponSightPos.x,
              wormPos.y + 2 + this.weaponSightPos.y
            )
          );
        } else {
          this.weaponSight.setPosition(
            Vec2(
              wormPos.x + 2 + this.weaponSightPos.x,
              wormPos.y + 2 + this.weaponSightPos.y
            )
          );
        }
      }
    }

    // Simple line width
    this.ctx.lineWidth = 3;

    if (bodyInfo.shape === "circle") {
      const radius = bodyInfo.radius * this.scale;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      // Box - draw with actual dimensions
      const halfWidth = (bodyInfo.width / 2) * this.scale;
      const halfHeight = (bodyInfo.height / 2) * this.scale;

      this.ctx.fillRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
      this.ctx.strokeRect(
        -halfWidth,
        -halfHeight,
        halfWidth * 2,
        halfHeight * 2
      );
    }

    this.ctx.restore();
  }
}

// Start the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new GameClient();
});
