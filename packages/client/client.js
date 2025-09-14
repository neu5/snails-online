// planck-js is loaded via CDN, so it's available globally as 'planck'
const { World, Vec2, Box, Circle } = planck;

class GameClient {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.status = document.getElementById("status");

    // Physics world for rendering (not simulation)
    this.world = new World();
    this.bodies = new Map();

    // WebSocket connection
    this.ws = null;
    this.connect();

    // Rendering
    this.scale = 30; // pixels per meter
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;

    this.render();
  }

  connect() {
    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => {
      this.updateStatus("Connected to server", "connected");
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

    // Create bodies from server data
    worldData.forEach((bodyData) => {
      const body = this.world.createBody({
        type: bodyData.type,
        position: Vec2(bodyData.position.x, bodyData.position.y),
        angle: bodyData.angle,
      });

      // Add fixtures based on shape type
      if (bodyData.fixtures && bodyData.fixtures.length > 0) {
        const fixture = bodyData.fixtures[0];
        if (fixture.shape === "box") {
          body.createFixture({
            shape: Box(0.5, 0.5), // Default size
            density: 1,
          });
        } else if (fixture.shape === "circle") {
          body.createFixture({
            shape: Circle(0.5), // Default radius
            density: 1,
          });
        }
      }

      this.bodies.set(bodyData.id, {
        body: body,
        type: bodyData.type,
        shape: bodyData.fixtures[0]?.shape || "box",
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
    const body = bodyInfo.body;
    const position = body.getPosition();
    const angle = body.getAngle();

    const x = position.x * this.scale + this.offsetX;
    const y = this.canvas.height - (position.y * this.scale + this.offsetY);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(-angle);

    if (bodyInfo.type === "static") {
      this.ctx.fillStyle = "#666";
      this.ctx.strokeStyle = "#888";
    } else {
      this.ctx.fillStyle = "#4CAF50";
      this.ctx.strokeStyle = "#66BB6A";
    }

    this.ctx.lineWidth = 2;

    if (bodyInfo.shape === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 0.5 * this.scale, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      // Box
      const halfWidth = 0.5 * this.scale;
      const halfHeight = 0.5 * this.scale;
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
