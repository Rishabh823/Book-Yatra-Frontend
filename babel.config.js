module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // hermes-v0 profile transforms classes to ES5, which the macOS hermesc binary requires
      ["babel-preset-expo", { unstable_transformProfile: "hermes-v0" }],
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
