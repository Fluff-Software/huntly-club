import React, { useEffect } from "react";
import { View, Modal, StyleSheet, Dimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";

type Step = "welcome" | "season";

interface PostSignUpWelcomeProps {
  visible: boolean;
  onDismiss: () => void;
}

export function PostSignUpWelcome({ visible, onDismiss }: PostSignUpWelcomeProps) {
  const { scaleW } = useLayoutScale();
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("welcome");

  useEffect(() => {
    if (visible) setStep("welcome");
  }, [visible]);

  const handleNext = () => {
    setStep("season");
  };

  const handleGoToStory = () => {
    onDismiss();
    router.push("/(tabs)/story");
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {step === "welcome" && (
          <>
            <ConfettiCannon
              count={200}
              origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 - scaleW(40) }}
              explosionSpeed={350}
              fallSpeed={3500}
              fadeOut
              autoStart
              colors={["#4F6F52", "#F7A676", "#4B9CD2", "#F4F0EB", "#D4A05A"]}
            />
            <View style={[styles.card, { padding: scaleW(24) }]}>
              <ThemedText
                type="title"
                style={[styles.title, { marginBottom: scaleW(16) }]}
                lightColor={HUNTLY_GREEN}
                darkColor={CREAM}
              >
                Welcome!
              </ThemedText>
              <Button variant="secondary" onPress={handleNext}>
                Next
              </Button>
            </View>
          </>
        )}
        {step === "season" && (
          <View style={[styles.card, { padding: scaleW(24) }]}>
            <ThemedText
              type="title"
              style={[styles.title, { marginBottom: scaleW(24) }]}
              lightColor={HUNTLY_GREEN}
              darkColor={CREAM}
            >
              There's a new season
            </ThemedText>
            <Button variant="secondary" onPress={handleGoToStory}>
              Go to Story
            </Button>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: 24,
    minWidth: 280,
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    textAlign: "center",
    fontFamily: "Jua_400Regular",
  },
});
