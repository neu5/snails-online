import { Vec2, Box } from "planck-js";

export const createBullet = (world) => {
  const bullet = world.createBody({
    type: "dynamic",
    position: Vec2(0, 0),
    bullet: true,
  });
  const bulletSize = { x: 0.02, y: 0.02 };
  const bulletFix = bullet.createFixture({
    shape: Box(bulletSize.x, bulletSize.y),
    density: 1,
    friction: 0,
    type: "bullet",
  });

  bullet.setUserData({
    shape: "box",
    type: "bullet",
    width: bulletSize.x * 2,
    height: bulletSize.y * 2,
  });
  bulletFix.setUserData({
    type: "bullet",
  });

  return bullet;
};
