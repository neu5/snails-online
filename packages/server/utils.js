export const decreaseHealth = (healthNum) => {
  let newHealthNum = healthNum - 60;

  return newHealthNum <= 0 ? 0 : newHealthNum;
};

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
