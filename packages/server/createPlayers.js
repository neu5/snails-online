import { Vec2, Box } from "planck-js";

export const COLORS = [
  {
    name: "red",
    hex: "#ff0000",
  },
  {
    name: "blue",
    hex: "#0000ff",
  },
  {
    name: "green",
    hex: "#00ff00",
  },
];

const WORM_SIZE = { x: 0.3, y: 0.5 };

const STARTING_POSITIONS = [
  {
    isTaken: false,
    position: [-8, 2],
  },
  {
    isTaken: false,
    position: [-6, 2],
  },
  {
    isTaken: false,
    position: [-4, 2],
  },
  {
    isTaken: false,
    position: [-2, 2],
  },
  {
    isTaken: false,
    position: [0, 2],
  },
  {
    isTaken: false,
    position: [2, 2],
  },
  {
    isTaken: false,
    position: [4, 2],
  },
  {
    isTaken: false,
    position: [6, 2],
  },
  {
    isTaken: false,
    position: [-8, 2],
  },
  {
    isTaken: false,
    position: [10, 2],
  },
];

const getStartingPosition = () => {
  const positionsNum = STARTING_POSITIONS.length;
  const rndInt = Math.floor(Math.random() * positionsNum);

  const startingPosition = STARTING_POSITIONS[rndInt];

  if (startingPosition.isTaken) {
    return getStartingPosition();
  } else {
    startingPosition.isTaken = true;
    return startingPosition.position;
  }
};

export const createPlayer = ({ client, world }) => {
  const [x, y] = getStartingPosition();
  const worm = world.createBody({
    type: "dynamic",
    position: Vec2(x, y),
    allowSleep: false,
  });
  const wormFix = worm.createFixture({
    // shape: Circle(0.3),
    // density: 2, // Heavier for more realistic movement
    // friction: 0.8, // More friction for better ground contact
    // restitution: 0.1, // Low bounce
    shape: Box(WORM_SIZE.x, WORM_SIZE.y),
    density: 0,
    friction: 0.1,
    restitution: 0, // bouncy, good for packages from the sky
  });
  worm.setUserData({
    shape: "box",
    width: WORM_SIZE.x * 2,
    height: WORM_SIZE.y * 2,
    isWorm: true,
    sessionID: client.sessionID,
    healthNum: 100,
    color: COLORS[0].hex,
  });
  wormFix.setUserData({
    type: "worm",
    sessionID: client.sessionID,
  });

  // Set linear damping to make movement more controlled
  worm.setLinearDamping(0.5);
  worm.setAngularDamping(0.8);

  client.worm = worm;

  return worm;
};
