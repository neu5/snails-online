// planck-js is loaded via CDN, so it's available globally as 'planck'
const { World, Vec2, Box, Circle } = planck;

class GameClient {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.status = document.getElementById("status");

    // Store world data for rendering (no physics simulation on client)
    this.bodies = new Map();

    // Input handling
    this.keys = { w: false, a: false, s: false, d: false };
    this.setupInputHandlers();

    // WebSocket connection
    this.ws = null;
    this.connect();

    // Rendering
    this.scale = 30; // pixels per meter
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;

    this.render();
  }

  setupInputHandlers() {
    document.addEventListener("keydown", (event) => {
      switch (event.key.toLowerCase()) {
        case "w":
          this.keys.w = true;
          break;
        case "a":
          this.keys.a = true;
          break;
        case "s":
          this.keys.s = true;
          break;
        case "d":
          this.keys.d = true;
          break;
      }
      this.sendInput();
    });

    document.addEventListener("keyup", (event) => {
      switch (event.key.toLowerCase()) {
        case "w":
          this.keys.w = false;
          break;
        case "a":
          this.keys.a = false;
          break;
        case "s":
          this.keys.s = false;
          break;
        case "d":
          this.keys.d = false;
          break;
      }
      this.sendInput();
    });
  }

  sendInput() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "input",
          keys: this.keys,
        })
      );
    }
  }

  connect() {
    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => {
      this.updateStatus("Connected to server - Use WASD to move!", "connected");
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "worldState") {
        this.updateWorldState(message.data);
      }
    };

    this.ws.onclose = () => {
      this.updateStatus("Disconnected from server", "disconnected");
      // Try to reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.updateStatus("Connection error", "disconnected");
    };
  }

  updateStatus(message, className) {
    this.status.textContent = message;
    this.status.className = className;
  }

  updateWorldState(worldData) {
    // Clear existing bodies
    this.bodies.clear();

    // Store world data directly for rendering (no physics simulation on client)
    worldData.forEach((bodyData, index) => {
      // Check if this is a worm (appears after all static objects)
      const isWorm = index >= 4; // First 4 objects are floor, leftWall, rightWall, ceiling

      const fixture = bodyData.fixtures[0];
      let shapeInfo = {
        shape: fixture?.shape || "box",
        width: 1,
        height: 1,
        radius: 0.5,
      };

      if (fixture) {
        if (fixture.shape === "box") {
          shapeInfo.width = fixture.width || 1;
          shapeInfo.height = fixture.height || 1;
        } else if (fixture.shape === "circle") {
          shapeInfo.radius = fixture.radius || 0.5;
        }
      }

      this.bodies.set(bodyData.id, {
        position: bodyData.position,
        angle: bodyData.angle,
        type: bodyData.type,
        shape: shapeInfo.shape,
        width: shapeInfo.width,
        height: shapeInfo.height,
        radius: isWorm ? 0.3 : shapeInfo.radius,
        isWorm: isWorm,
      });
    });
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw bodies
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

    if (bodyInfo.type === "static") {
      // Simple static object rendering - make everything visible
      this.ctx.fillStyle = "#666";
      this.ctx.strokeStyle = "#333";
    } else if (bodyInfo.isWorm) {
      // Worm styling - bright green with darker outline
      this.ctx.fillStyle = "#00FF00";
      this.ctx.strokeStyle = "#00AA00";
    } else {
      this.ctx.fillStyle = "#4CAF50";
      this.ctx.strokeStyle = "#66BB6A";
    }

    // Simple line width
    this.ctx.lineWidth = 3;

    if (bodyInfo.shape === "circle") {
      const radius = bodyInfo.radius * this.scale;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();

      // Add worm eyes
      if (bodyInfo.isWorm) {
        this.ctx.fillStyle = "#000";
        this.ctx.beginPath();
        this.ctx.arc(
          -radius * 0.3,
          -radius * 0.3,
          radius * 0.15,
          0,
          2 * Math.PI
        );
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(
          radius * 0.3,
          -radius * 0.3,
          radius * 0.15,
          0,
          2 * Math.PI
        );
        this.ctx.fill();
      }
    } else {
      // Box - draw with actual dimensions
      const halfWidth = (bodyInfo.width / 2) * this.scale;
      const halfHeight = (bodyInfo.height / 2) * this.scale;

      // Add some visual details for platforms
      if (bodyInfo.type === "static" && halfHeight < halfWidth) {
        // Platform - add some texture
        this.ctx.fillRect(
          -halfWidth,
          -halfHeight,
          halfWidth * 2,
          halfHeight * 2
        );
        this.ctx.strokeRect(
          -halfWidth,
          -halfHeight,
          halfWidth * 2,
          halfHeight * 2
        );

        // Add platform lines
        this.ctx.strokeStyle = "#A0522D";
        this.ctx.lineWidth = 1;
        for (let i = -halfWidth + 5; i < halfWidth; i += 10) {
          this.ctx.beginPath();
          this.ctx.moveTo(i, -halfHeight);
          this.ctx.lineTo(i, halfHeight);
          this.ctx.stroke();
        }
      } else {
        // Regular box
        this.ctx.fillRect(
          -halfWidth,
          -halfHeight,
          halfWidth * 2,
          halfHeight * 2
        );
        this.ctx.strokeRect(
          -halfWidth,
          -halfHeight,
          halfWidth * 2,
          halfHeight * 2
        );
      }
    }

    this.ctx.restore();
  }
}

// Start the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new GameClient();
});
