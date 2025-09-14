# Worms Online

A simple multiplayer physics game using planck.js and WebSockets.

## Features

- Real-time physics simulation using planck.js
- WebSocket communication between client and server
- 2D Canvas rendering
- Multi-client support

## Setup

1. Install dependencies:

```bash
yarn install
```

2. Start both client and server in development mode:

```bash
yarn dev
```

This will start:

- Server on `ws://localhost:8080`
- Client on `http://localhost:3000`

## Manual Setup

### Server Only

```bash
yarn server
```

### Client Only

```bash
yarn client
```

## How it Works

1. **Server**: Runs a planck.js physics world with static ground, walls, and dynamic objects (boxes and a ball)
2. **Client**: Connects to the server via WebSocket and renders the physics world in real-time
3. **Communication**: The server broadcasts the world state 60 times per second to all connected clients
4. **Rendering**: The client renders the physics bodies using HTML5 Canvas with a grid background

## Project Structure

```
packages/
├── client/          # Web client with Canvas rendering
│   ├── index.html   # Main HTML file
│   ├── client.js    # Client-side JavaScript
│   └── package.json # Client dependencies
└── server/          # Node.js server
    ├── index.js     # Server-side JavaScript
    └── package.json # Server dependencies
```

## Dependencies

- **planck-js**: 2D physics engine (JavaScript port of Box2D)
- **ws**: WebSocket library for Node.js
- **http-server**: Static file server for the client
- **concurrently**: Run multiple commands simultaneously
