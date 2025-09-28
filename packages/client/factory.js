import { Vec2, Box } from "planck";

export function createBodies(thisObj) {
  // Floor
  const floor = thisObj.world.createBody({
    name: "floor",
    type: "static",
    position: Vec2(0, -13),
  });

  const floorSize = { x: 17, y: 0.25 };
  const floorFix = floor.createFixture({
    shape: Box(floorSize.x, floorSize.y),
    density: 0,
    friction: 0.6,
  });
  floorFix.setUserData({
    shape: "box",
    width: floorSize.x * 2,
    height: floorSize.y * 2,
  });

  // Left wall
  const leftWall = thisObj.world.createBody({
    name: "leftWall",
    type: "static",
    position: Vec2(-17, 0),
  });
  const leftWallSize = { x: 0.25, y: 20 };
  const leftFix = leftWall.createFixture({
    shape: Box(leftWallSize.x, leftWallSize.y),
    density: 0,
    friction: 0.6,
  });
  leftFix.setUserData({
    shape: "box",
    width: leftWallSize.x * 2,
    height: leftWallSize.y * 2,
  });

  // Right wall
  const rightWall = thisObj.world.createBody({
    name: "rightWall",
    type: "static",
    position: Vec2(17, 0),
  });
  const rightWallSize = { x: 0.25, y: 20 };
  const rightFix = rightWall.createFixture({
    shape: Box(rightWallSize.x, rightWallSize.y),
    density: 0,
    friction: 0.6,
  });
  rightFix.setUserData({
    shape: "box",
    width: rightWallSize.x * 2,
    height: rightWallSize.y * 2,
  });

  // Worm (dynamic)
  const worm = thisObj.world.createBody({
    type: "dynamic",
    position: Vec2(0, 2),
    allowSleep: false,
  });
  const wormSize = { x: 0.3, y: 0.5 };
  const wormFix = worm.createFixture({
    shape: Box(wormSize.x, wormSize.y),
    density: 0,
    friction: 0.1,
    restitution: 0, // bouncy, good for packages from the sky
  });
  wormFix.setUserData({
    shape: "box",
    width: wormSize.x * 2,
    height: wormSize.y * 2,
    isWorm: true,
    healthNum: 100,
  });
  worm.setLinearDamping(0.5);
  worm.setAngularDamping(0.8);
  thisObj.players.set("player", {
    healthNum: 100,
  });

  const weaponSight = thisObj.world.createBody({
    type: "static",
    position: Vec2(10, 10),
  });
  weaponSight.setUserData({ isWeaponSight: true });

  // NPM worm
  const npc = thisObj.world.createBody({
    type: "dynamic",
    position: Vec2(2, 2),
    allowSleep: false,
  });
  const npcSize = { x: 0.3, y: 0.5 };
  const npcFix = npc.createFixture({
    shape: Box(npcSize.x, npcSize.y),
    density: 0,
    friction: 0.1,
    restitution: 0, // bouncy, good for packages from the sky
  });
  npcFix.setUserData({
    shape: "box",
    width: npcSize.x * 2,
    height: npcSize.y * 2,
    healthNum: 100,
    isNPC: true,
  });
  npc.setLinearDamping(0.5);
  npc.setAngularDamping(0.8);
  thisObj.players.set("npc", {
    healthNum: 100,
  });

  thisObj.weaponSight = weaponSight;
  thisObj.debugWorm = worm;
  thisObj.wormFacing = "left";

  const platform = thisObj.world.createBody({
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
  platformFix.setUserData({
    shape: "box",
    width: platformSize.x * 2,
    height: platformSize.y * 2,
  });

  const platform2 = thisObj.world.createBody({
    type: "static",
    position: Vec2(-8, -3),
  });
  const platformSize2 = { x: 5, y: 0.2 };
  const platformFix2 = platform2.createFixture({
    shape: Box(platformSize2.x, platformSize2.y),
    density: 0,
    friction: 1,
  });
  platformFix2.setUserData({
    shape: "box",
    width: platformSize2.x * 2,
    height: platformSize2.y * 2,
  });
}

export function createBullet(world, isBulletFired) {
  if (isBulletFired) return;

  const bullet = world.createBody({
    type: "kinematic",
    position: Vec2(0, 0),
  });
  const bulletSize = { x: 0.02, y: 0.02 };
  const bulletFix = bullet.createFixture({
    shape: Box(bulletSize.x, bulletSize.y),
    density: 1,
    friction: 0,
    type: "bullet",
  });
  bulletFix.setUserData({
    shape: "box",
    type: "bullet",
    width: bulletSize.x * 2,
    height: bulletSize.y * 2,
  });

  return bullet;
}
