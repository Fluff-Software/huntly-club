/** Walk/cycle maps on Android use MapLibre only — keep react-native-maps (Apple Maps) on iOS. */
module.exports = {
  dependencies: {
    "react-native-maps": {
      platforms: {
        android: null,
      },
    },
  },
};
