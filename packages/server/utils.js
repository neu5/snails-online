export const decreaseHealth = (healthNum) => {
  let newHealthNum = healthNum - 60;

  return newHealthNum <= 0 ? 0 : newHealthNum;
};
