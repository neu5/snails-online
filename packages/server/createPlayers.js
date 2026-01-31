import { Vec2, Box } from "planck-js";

const COLORS = [
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

const TEAMS = [
  { name: "team1", color: "red" },
  { name: "team2", color: "blue" },
  {
    name: "team3",
    color: "green",
  },
];

const getColor = (id) =>
  COLORS.find(({ name }) => name === TEAMS[id].color).hex;

const PLAYER_CHARACTER_SIZE = { x: 0.3, y: 0.5 };

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

export const createPlayer = ({ client, snailNum, teamID, world }) => {
  const [x, y] = getStartingPosition();
  const playerCharacter = world.createBody({
    type: "dynamic",
    position: Vec2(x, y),
    allowSleep: false,
  });
  const snailName = `Snail_${snailNum}`;
  const playerCharacterFix = playerCharacter.createFixture({
    // shape: Circle(0.3),
    // density: 2, // Heavier for more realistic movement
    // friction: 0.8, // More friction for better ground contact
    // restitution: 0.1, // Low bounce
    shape: Box(PLAYER_CHARACTER_SIZE.x, PLAYER_CHARACTER_SIZE.y),
    density: 0,
    friction: 0.1,
    restitution: 0, // bouncy, good for packages from the sky
  });
  playerCharacter.setUserData({
    shape: "box",
    name: snailName,
    width: PLAYER_CHARACTER_SIZE.x * 2,
    height: PLAYER_CHARACTER_SIZE.y * 2,
    isPlayerCharacter: true,
    sessionID: client.sessionID,
    healthNum: 100,
    color: getColor(teamID),
  });
  playerCharacterFix.setUserData({
    type: "worm",
    sessionID: client.sessionID,
  });

  // Set linear damping to make movement more controlled
  playerCharacter.setLinearDamping(0.5);
  playerCharacter.setAngularDamping(0.8);

  return {
    teamID,
    playerCharacter,
    sessionID: client.sessionID,
    name: snailName,
  };
};
