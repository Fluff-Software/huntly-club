import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { usePlayer } from "@/contexts/PlayerContext";

const TEXT_SECONDARY = "#2F3336";
const LIGHT_GREEN = "#7FAF8A";
const CREAM = "#F6F5F1";
const CARD_BAR_BLUE = "#87CEEB";
const CARD_BAR_GREEN = "#98D8A8";

const GALLERY_ICON = require("@/assets/images/gallery.png");
const CAMERA_ICON = require("@/assets/images/camera.png");

export default function CompletionScreen() {
  const router = useRouter();
  const { scaleW, scaleH } = useLayoutScale();
  const { profiles } = usePlayer();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [hardestText, setHardestText] = useState("");

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const displayProfiles = useMemo(() => {
    const colours = [CARD_BAR_BLUE, CARD_BAR_GREEN];
    return profiles.map((p, i) => ({
      id: p.id,
      name: p.name ?? "Player",
      nickname: p.nickname ?? "",
      colour: colours[i % colours.length],
    }));
  }, [profiles]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: LIGHT_GREEN },
        scroll: {
          flex: 1,
          paddingHorizontal: scaleW(24),
          paddingTop: scaleW(60),
          paddingBottom: scaleW(32),
        },
        title: {
          fontSize: scaleW(20),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(32),
        },
        subtitle: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(12),
        },
        photoUploadBox: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(24),
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "#000",
          marginBottom: scaleW(32),
        },
        photoUploadRow: { flexDirection: "row" },
        photoOption: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: scaleW(72),
          paddingHorizontal: scaleW(16),
        },
        photoOptionDivider: {
          borderStyle: "dashed",
          borderColor: "#C7C7C7",
          borderWidth: 1,
        },
        photoOptionIcon: {
          width: scaleW(24),
          height: scaleW(24),
          marginBottom: scaleW(12),
        },
        photoOptionLabel: {
          fontSize: scaleW(14),
          fontWeight: "500",
          color: TEXT_SECONDARY,
        },
        hardestHeading: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(12),
        },
        hardestInput: {
          backgroundColor: "#FFF",
          borderRadius: scaleW(24),
          borderWidth: 2,
          borderColor: TEXT_SECONDARY,
          paddingHorizontal: scaleW(16),
          paddingVertical: scaleW(14),
          fontSize: scaleW(15),
          color: TEXT_SECONDARY,
          minHeight: scaleW(150),
          textAlignVertical: "top",
          marginBottom: scaleW(32),
        },
        whoHeading: {
          fontSize: scaleW(16),
          fontWeight: "600",
          color: TEXT_SECONDARY,
          textAlign: "center",
          marginBottom: scaleW(16),
        },
        playerCardContainer: { gap: scaleW(12), marginBottom: scaleW(24) },
        playerCard: {
          flexDirection: "row",
          backgroundColor: "#FFF",
          borderRadius: scaleW(12),
          borderWidth: 1,
          borderColor: "#D0D0D0",
          overflow: "hidden",
        },
        playerCardBar: { width: scaleW(6), alignSelf: "stretch" },
        playerCardContent: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: scaleW(14),
          paddingHorizontal: scaleW(16),
        },
        playerCardNames: { flex: 1 },
        playerCardName: {
          fontSize: scaleW(16),
          fontWeight: "700",
          color: TEXT_SECONDARY,
        },
        playerCardNickname: {
          fontSize: scaleW(14),
          color: TEXT_SECONDARY,
          marginTop: 2,
        },
        checkbox: {
          width: scaleW(24),
          height: scaleW(24),
          borderWidth: 2,
          borderColor: TEXT_SECONDARY,
          borderRadius: scaleW(4),
          alignItems: "center",
          justifyContent: "center",
        },
        checkboxChecked: { backgroundColor: TEXT_SECONDARY },
        nextButton: {
          backgroundColor: CREAM,
          paddingVertical: scaleW(16),
          borderRadius: scaleW(32),
          alignItems: "center",
          marginTop: scaleW(24),
          marginBottom: scaleW(64),
          marginHorizontal: scaleW(52),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
        nextButtonText: { fontSize: scaleW(17), fontWeight: "600" },
      }),
    [scaleW, scaleH]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scaleW(24) }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="heading" style={styles.title}>
          Build a laser fortress
        </ThemedText>
        <ThemedText type="heading" style={styles.subtitle}>
          Add your photo of this activity
        </ThemedText>

        <View style={styles.photoUploadBox}>
          <View style={styles.photoUploadRow}>
            <Pressable style={styles.photoOption}>
              <Image
                source={CAMERA_ICON}
                style={styles.photoOptionIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.photoOptionLabel}>Take a photo</ThemedText>
            </Pressable>
            <View style={styles.photoOptionDivider} />
            <Pressable style={styles.photoOption}>
              <Image
                source={GALLERY_ICON}
                style={styles.photoOptionIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.photoOptionLabel}>Pick an image</ThemedText>
            </Pressable>
          </View>
        </View>

        <ThemedText type="heading" style={styles.hardestHeading}>
          What did you find the hardest?
        </ThemedText>
        <TextInput
          style={styles.hardestInput}
          placeholder="Write a few words..."
          placeholderTextColor="#9E9E9E"
          value={hardestText}
          onChangeText={setHardestText}
          multiline
        />

        <ThemedText type="heading" style={styles.whoHeading}>
          Who did this activity?
        </ThemedText>
        <View style={styles.playerCardContainer}>
          {displayProfiles.map((profile) => {
            const isSelected = selectedPlayerIds.includes(profile.id);
            return (
              <Pressable
                key={profile.id}
                style={styles.playerCard}
                onPress={() => togglePlayerSelection(profile.id)}
              >
                <View
                  style={[styles.playerCardBar, { backgroundColor: profile.colour }]}
                />
                <View style={styles.playerCardContent}>
                  <View style={styles.playerCardNames}>
                    <ThemedText type="heading" style={styles.playerCardName}>
                      {profile.name}
                    </ThemedText>
                    <ThemedText style={styles.playerCardNickname}>
                      {profile.nickname}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.checkbox, isSelected && styles.checkboxChecked]}
                  >
                    {isSelected && (
                      <ThemedText style={{ color: "#FFF", fontSize: scaleW(14) }}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.nextButton}
          onPress={() => router.push("/(tabs)/activity/mission/reward")}
        >
          <ThemedText type="heading" style={styles.nextButtonText}>
            Next
          </ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}
