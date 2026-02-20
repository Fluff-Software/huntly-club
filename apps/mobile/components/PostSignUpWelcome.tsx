import React, { useEffect, useMemo } from "react";
import { View, Modal, StyleSheet, Image, ImageBackground } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import ConfettiCannon from "react-native-confetti-cannon";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { useLayoutScale } from "@/hooks/useLayoutScale";

const bounceSpring = { damping: 10, stiffness: 140 };
const stepBounceSpring = { damping: 12, stiffness: 180 };

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";
const PARTY_PURPLE = "#C77DFF";

const WELCOME_IMAGE = require("@/assets/images/welcome.png");

type Step = "welcome" | "season";

interface PostSignUpWelcomeProps {
  visible: boolean;
  onDismiss: () => void;
}

export function PostSignUpWelcome({ visible, onDismiss }: PostSignUpWelcomeProps) {
  const { scaleW, width, height } = useLayoutScale();
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("welcome");
  const cardScale = useSharedValue(0);

  const imageAspectRatio = (() => {
    const resolved = Image.resolveAssetSource(WELCOME_IMAGE);
    if (resolved?.width && resolved?.height) return resolved.width / resolved.height;
    return 0.75;
  })();

  useEffect(() => {
    if (visible) {
      setStep("welcome");
      cardScale.value = 0;
      cardScale.value = withSpring(1, bounceSpring);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && step === "season") {
      cardScale.value = withSequence(
        withSpring(1.08, stepBounceSpring),
        withSpring(1, stepBounceSpring)
      );
    }
  }, [step]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handleNext = () => {
    setStep("season");
  };

  const handleGoToStory = () => {
    onDismiss();
    router.push("/(tabs)/story");
  };

  const dynamicStyles = useMemo(
    () => ({
      overlay: {
        padding: scaleW(20),
      },
      card: {
        paddingVertical: scaleW(32),
        paddingHorizontal: scaleW(28),
        borderRadius: scaleW(28),
        minWidth: scaleW(300),
        maxWidth: scaleW(360),
        shadowColor: PARTY_PURPLE,
        shadowOffset: { width: 0, height: scaleW(6) },
        shadowOpacity: 0.25,
        shadowRadius: scaleW(16),
        elevation: 12,
      },
      seasonCard: {
        paddingTop: 0,
        overflow: "hidden" as const,
      },
      seasonAccentBar: {
        height: scaleW(6),
        width: "100%" as const,
        backgroundColor: "#4B9CD2",
        marginBottom: scaleW(20),
      },
      seasonTitle: {
        fontSize: scaleW(22),
        lineHeight: scaleW(30),
        marginBottom: scaleW(24),
        textAlign: "center" as const,
        fontFamily: "Jua_400Regular",
      },
      title: {
        fontSize: scaleW(36),
        lineHeight: scaleW(48),
        marginBottom: scaleW(step === "welcome" ? 24 : 28),
        textAlign: "center" as const,
        fontFamily: "Jua_400Regular",
      },
      buttonWrap: {
        marginHorizontal: scaleW(48),
        marginTop: scaleW(8),
      },
      welcomeScreen: {
        width: scaleW(320),
        maxWidth: width - scaleW(40),
        aspectRatio: imageAspectRatio > 0 ? imageAspectRatio : 0.75,
        maxHeight: height * 0.65,
        borderRadius: scaleW(24),
        overflow: "hidden" as const,
        shadowColor: PARTY_PURPLE,
        shadowOffset: { width: 0, height: scaleW(6) },
        shadowOpacity: 0.25,
        shadowRadius: scaleW(16),
        elevation: 12,
      },
      welcomeImageFill: {
        flex: 1,
        width: "100%" as const,
        height: "100%" as const,
        justifyContent: "flex-end" as const,
      },
      welcomeButtonWrap: {
        paddingHorizontal: scaleW(24),
        paddingBottom: scaleW(28),
        paddingTop: scaleW(20),
        alignItems: "center" as const,
      },
      welcomeButtonShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
    [scaleW, step]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, dynamicStyles.overlay]}>
        {step === "welcome" && (
          <>
            <Animated.View style={[dynamicStyles.welcomeScreen, cardAnimatedStyle]}>
              <ImageBackground
                source={WELCOME_IMAGE}
                style={dynamicStyles.welcomeImageFill}
                resizeMode="cover"
              >
                <View style={dynamicStyles.welcomeButtonWrap}>
                  <Button
                    variant="white"
                    onPress={handleNext}
                    style={dynamicStyles.welcomeButtonShadow}
                  >
                    Next
                  </Button>
                </View>
              </ImageBackground>
            </Animated.View>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ConfettiCannon
                count={scaleW(200)}
                origin={{ x: width / 2, y: height / 2 - scaleW(40) }}
                explosionSpeed={scaleW(350)}
                fallSpeed={scaleW(3500)}
                fadeOut
                autoStart
                colors={[
                  "#FF1493",
                  "#00C853",
                  "#FF8C00",
                  "#FFD700",
                  "#00BCD4",
                  "#E91E8C",
                  "#FFA500",
                  "#26A69A",
                ]}
              />
            </View>
          </>
        )}
        {step === "season" && (
          <Animated.View style={[styles.card, dynamicStyles.card, dynamicStyles.seasonCard, cardAnimatedStyle]}>
            <View style={dynamicStyles.seasonAccentBar} />
            <ThemedText
              type="subtitle"
              style={dynamicStyles.seasonTitle}
              lightColor={HUNTLY_GREEN}
              darkColor={CREAM}
            >
              There's a new season!
            </ThemedText>
            <View style={dynamicStyles.buttonWrap}>
              <Button variant="secondary" onPress={handleGoToStory} style={dynamicStyles.welcomeButtonShadow}>
                Go to Story
              </Button>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: CREAM,
  },
});
