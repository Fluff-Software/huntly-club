import { ImageBackground, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = require("@/assets/images/campfire-bg.jpg");

export default function CampfireScreen() {
  return (
    <View style={styles.container}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]} />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  safe: { flex: 1 },
});
