import { Vec2, Box } from "planck-js";

export const createMap = (world) => {
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
  const platformFix = platform.createFixture({
    shape: Box(platformSize.x, platformSize.y),
    density: 0,
    friction: 1,
  });
  platform.setUserData({
    shape: "box",
    width: platformSize.x * 2,
    height: platformSize.y * 2,
  });
  platformFix.setUserData({
    type: "platform",
  });

  const platform2 = world.createBody({
    type: "static",
    position: Vec2(-8, -3),
  });
  const platformSize2 = { x: 5, y: 0.2 };
  const platformFix2 = platform2.createFixture({
    shape: Box(platformSize2.x, platformSize2.y),
    density: 0,
    friction: 1,
  });
  platform2.setUserData({
    shape: "box",
    width: platformSize2.x * 2,
    height: platformSize2.y * 2,
  });
  platformFix2.setUserData({
    type: "platform",
  });

  const platform3 = world.createBody({
    type: "static",
    position: Vec2(10, -2),
    angle: -Math.PI / 48,
  });
  const platformSize3 = { x: 5, y: 0.2 };
  const platformFix3 = platform3.createFixture({
    shape: Box(platformSize3.x, platformSize3.y),
    density: 0,
    friction: 1,
  });
  platform3.setUserData({
    shape: "box",
    width: platformSize3.x * 2,
    height: platformSize3.y * 2,
  });
  platformFix3.setUserData({
    type: "platform",
  });

  return [floor, leftWall, rightWall, platform, platform2, platform3];
};
