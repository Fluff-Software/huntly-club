import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { FKButton, FKScreen } from "@/components/fieldkit";
import { FK, FONT, RADIUS } from "@/constants/fieldKit";
import type { Guide } from "@/constants/guides";
import { childNames, secretMessageText } from "@/services/secretMessageService";
import { settleIn } from "@/constants/motion";

/** "TOP SECRET — Sam, Bella has a message for you." The child's first moment in the app. */
export function SecretMessage({
  guide,
  names,
  onDone,
  onSaveForLater,
}: {
  guide: Guide;
  names: string[];
  onDone: () => void;
  onSaveForLater?: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const who = childNames(names);
  const open = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setOpened(true);
  };

  return (
    <FKScreen
      backgroundColor={FK.forest}
      footer={
        opened ? (
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <FKButton label="To the Clubhouse" onPress={onDone} testID="secret-done" />
          </Animated.View>
        ) : (
          <>
            <FKButton label="I'm ready!" icon="play" onPress={open} testID="secret-open" />
            {onSaveForLater ? (
              <FKButton label="Save it for the morning" variant="link" onDark onPress={onSaveForLater} />
            ) : null}
          </>
        )
      }
    >
      <StatusBar style="light" />
      <Animated.View entering={FadeIn.duration(500)} style={styles.badge}>
        <Ionicons name="sparkles" size={14} color={FK.ink} />
        <Text style={styles.badgeText}>TOP SECRET</Text>
      </Animated.View>
      <Text style={[styles.headline, (who?.length ?? 0) > 8 && { fontSize: 32, lineHeight: 35 }]}>
        {who ? `${who}, ` : ""}
        {guide.guideName} has a message for you
      </Text>

      <Animated.View
        entering={settleIn(150)}
        style={[styles.ring, opened && { width: 200, height: 200, borderRadius: 100, marginTop: 18 }]}
      >
        <View style={styles.circle}>
          <Image source={guide.waving} style={styles.guideImg} contentFit="contain" contentPosition="bottom" />
        </View>
      </Animated.View>

      {opened ? (
        <Animated.View entering={FadeInDown.duration(450)} style={styles.bubble}>
          <Text style={styles.bubbleText}>{secretMessageText(guide.guideName, guide.teamName, guide.teamSingular, names)}</Text>
        </Animated.View>
      ) : (
        <View style={styles.hint}>
          <Ionicons name="lock-closed-outline" size={18} color={FK.mutedOnDark} />
          <Text style={styles.hintText}>For explorers' eyes only</Text>
        </View>
      )}
    </FKScreen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: FK.sunbeam,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  badgeText: { fontFamily: FONT.display, fontSize: 14, letterSpacing: 1.4, color: FK.ink },
  headline: { fontFamily: FONT.display, fontSize: 40, lineHeight: 43, color: FK.white, letterSpacing: -1, marginTop: 16 },
  ring: {
    alignSelf: "center",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 10,
    borderColor: "#A89A3A",
    overflow: "hidden",
    marginTop: 26,
  },
  circle: { flex: 1, backgroundColor: FK.forestSoft, justifyContent: "flex-end", alignItems: "center" },
  guideImg: { width: "100%", height: "112%" },
  bubble: { backgroundColor: FK.paper, borderRadius: RADIUS.lg, padding: 20, marginTop: 22 },
  bubbleText: { fontFamily: FONT.displayBold, fontSize: 19, lineHeight: 26, color: FK.ink },
  hint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 26 },
  hintText: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.mutedOnDark },
});
