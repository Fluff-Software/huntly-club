import React, { useState, useMemo } from "react";
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useSignUp } from "@/contexts/SignUpContext";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { generateNickname } from "@/services/nicknameGenerator";
import {
  PROFILE_COLOR_OPTIONS,
  getTailwindColorHex,
} from "@/constants/Colors";

const HUNTLY_GREEN = "#4F6F52";
const CREAM = "#F4F0EB";
const LIGHT_GREEN = "#A8D5BA";

export default function SignUpPlayersScreen() {
  const { scaleW } = useLayoutScale();
  const { players, addPlayer, removePlayer, replacePlayer } = useSignUp();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState(() => generateNickname());
  const [selectedColor, setSelectedColor] = useState(() =>
    getTailwindColorHex("bg-profile-3")
  );

  const resetForm = () => {
    setName("");
    setNickname(generateNickname());
    setSelectedColor(getTailwindColorHex("bg-profile-3"));
    setEditingIndex(null);
  };

  const handleNewNickname = () => {
    setNickname(generateNickname());
  };

  const handleEditPlayer = (index: number) => {
    if (editingIndex !== null && name.trim()) {
      replacePlayer(editingIndex, {
        name: name.trim(),
        nickname: nickname.trim() || generateNickname(),
        colour: selectedColor,
      });
    } else if (editingIndex === null && name.trim()) {
      addPlayer({
        name: name.trim(),
        nickname: nickname.trim() || generateNickname(),
        colour: selectedColor,
      });
    }
    const p = players[index];
    setName(p.name);
    setNickname(p.nickname);
    setSelectedColor(p.colour);
    setEditingIndex(index);
  };

  const handleDeleteInForm = () => {
    if (editingIndex !== null) {
      removePlayer(editingIndex);
    }
    resetForm();
  };

  const handleAddPlayer = () => {
    if (!name.trim()) return;
    const playerData = {
      name: name.trim(),
      nickname: nickname.trim() || generateNickname(),
      colour: selectedColor,
    };
    if (editingIndex !== null) {
      replacePlayer(editingIndex, playerData);
    } else {
      addPlayer(playerData);
    }
    resetForm();
  };

  const handleContinue = () => {
    const currentName = name.trim();
    if (currentName) {
      const playerData = {
        name: currentName,
        nickname: nickname.trim() || generateNickname(),
        colour: selectedColor,
      };
      if (editingIndex !== null) {
        replacePlayer(editingIndex, playerData);
      } else {
        addPlayer(playerData);
      }
    }
    const totalPlayers = currentName ? players.length + 1 : players.length;
    if (totalPlayers === 0) return;
    router.push("/sign-up/team");
  };

  const canContinue = useMemo(
    () => name.trim().length > 0 || players.length > 0,
    [name, players.length]
  );

  const canAddPlayer = name.trim().length > 0;
  const showTrash = name.trim().length > 0 || editingIndex !== null;
  const hasAnyPlayers = players.length > 0;
  const showAddAnotherPlayer = hasAnyPlayers;

  const addPlayerScale = useSharedValue(1);
  const continueScale = useSharedValue(1);
  const addPlayerAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: addPlayerScale.value }] }));
  const continueAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: continueScale.value }] }));

  const containerStyle = { flex: 1, backgroundColor: HUNTLY_GREEN };
  const Wrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: "Who's playing", headerShown: false }} />
      <SafeAreaView style={containerStyle} edges={["top", "left", "right"]}>
        <Wrapper
          {...(Platform.OS === "ios" && { behavior: "padding" as const })}
          style={{ flex: 1 }}
        >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: scaleW(24),
            paddingTop: scaleW(24),
            paddingBottom: scaleW(24),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(0).springify().damping(18)}>
            <ThemedText
              type="heading"
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: scaleW(20),
              }}
            >
              Who's playing today?
            </ThemedText>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: "center",
                fontSize: scaleW(17),
                opacity: 0.95,
                marginHorizontal: scaleW(20),
                marginTop: scaleW(20),
                marginBottom: scaleW(46),
              }}
            >
              You can add more explorers anytime.
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(150).springify().damping(18)}>
          {/* Player cards: compact or expanded in place */}
          {players.map((player, index) => {
            const isExpanded = editingIndex === index;
            return (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  backgroundColor: CREAM,
                  borderRadius: scaleW(16),
                  marginBottom: scaleW(12),
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: scaleW(20),
                    alignSelf: "stretch",
                    backgroundColor: isExpanded ? selectedColor : player.colour,
                  }}
                />
                <View style={{ flex: 1 }}>
                  {isExpanded ? (
                    /* Expanded: form inline */
                    <View style={{ padding: scaleW(24) }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: scaleW(4),
                        }}
                      >
                        <View>
                          <ThemedText
                            type="heading"
                            lightColor="#36454F"
                            darkColor="#36454F"
                            style={{
                              fontWeight: "600",
                              fontSize: scaleW(16),
                            }}
                          >
                            Name
                          </ThemedText>
                          <ThemedText
                            lightColor="#36454F"
                            darkColor="#36454F"
                            style={{ fontSize: scaleW(12), marginTop: scaleW(4) }}
                          >
                            (Only visible to you)
                          </ThemedText>
                        </View>
                        <Pressable
                          onPress={handleDeleteInForm}
                          style={{ padding: scaleW(4) }}
                        >
                          <MaterialIcons
                            name="delete-outline"
                            size={scaleW(24)}
                            color="#DC2626"
                          />
                        </Pressable>
                      </View>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter name"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="words"
                        style={{
                          height: scaleW(48),
                          borderWidth: 2,
                          borderColor: LIGHT_GREEN,
                          borderRadius: scaleW(12),
                          paddingHorizontal: scaleW(16),
                          fontSize: scaleW(16),
                          color: "#36454F",
                          backgroundColor: "#FFFFFF",
                          marginTop: scaleW(8),
                          marginBottom: scaleW(20),
                        }}
                      />
                      <ThemedText
                        type="heading"
                        lightColor="#36454F"
                        darkColor="#36454F"
                        style={{
                          fontWeight: "600",
                          fontSize: scaleW(16),
                          marginBottom: scaleW(4),
                        }}
                      >
                        Explorer Nickname
                      </ThemedText>
                      <ThemedText
                        lightColor="#36454F"
                        darkColor="#36454F"
                        style={{ fontSize: scaleW(12), marginBottom: scaleW(8) }}
                      >
                        (This is how others see achievements.)
                      </ThemedText>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: scaleW(20),
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            height: scaleW(48),
                            backgroundColor: "#D9D8D4",
                            borderTopLeftRadius: scaleW(12),
                            borderBottomLeftRadius: scaleW(12),
                            justifyContent: "center",
                            paddingHorizontal: scaleW(16),
                            marginRight: scaleW(-22),
                          }}
                        >
                          <ThemedText
                            lightColor="#36454F"
                            darkColor="#36454F"
                            style={{ fontSize: scaleW(16) }}
                          >
                            {nickname}
                          </ThemedText>
                        </View>
                        <Pressable
                          onPress={handleNewNickname}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: scaleW(6),
                            height: scaleW(48),
                            paddingHorizontal: scaleW(16),
                            backgroundColor: HUNTLY_GREEN,
                            borderRadius: scaleW(24),
                          }}
                        >
                          <ThemedText
                            lightColor="#FFFFFF"
                            darkColor="#FFFFFF"
                            style={{ fontSize: scaleW(14), fontWeight: "600" }}
                          >
                            New
                          </ThemedText>
                          <MaterialIcons
                            name="refresh"
                            size={scaleW(18)}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                      <ThemedText
                        type="heading"
                        lightColor="#36454F"
                        darkColor="#36454F"
                        style={{
                          fontWeight: "600",
                          fontSize: scaleW(16),
                          marginBottom: scaleW(12),
                        }}
                      >
                        Colour
                      </ThemedText>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: scaleW(12),
                        }}
                      >
                        {PROFILE_COLOR_OPTIONS.map((opt) => {
                          const hex = getTailwindColorHex(opt.value);
                          const isSelected = selectedColor === hex;
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() => setSelectedColor(hex)}
                              style={{
                                width: scaleW(44),
                                height: scaleW(44),
                                borderRadius: scaleW(22),
                                backgroundColor: hex,
                                borderWidth: isSelected ? 3 : 0,
                                borderColor: HUNTLY_GREEN,
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    /* Compact: name, nickname, pencil */
                    <Pressable
                      onPress={() => handleEditPlayer(index)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: scaleW(16),
                        paddingHorizontal: scaleW(20),
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          type="heading"
                          lightColor="#111827"
                          darkColor="#111827"
                          style={{
                            fontWeight: "700",
                            fontSize: scaleW(18),
                          }}
                        >
                          {player.name}
                        </ThemedText>
                        <ThemedText
                          lightColor="#374151"
                          darkColor="#374151"
                          style={{
                            fontSize: scaleW(14),
                            marginTop: scaleW(2),
                          }}
                        >
                          {player.nickname}
                        </ThemedText>
                      </View>
                      <MaterialIcons
                        name="edit"
                        size={scaleW(22)}
                        color={HUNTLY_GREEN}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          </Animated.View>

          {/* Add-new form card: only when not editing any player */}
          {editingIndex === null && (
            <Animated.View
              entering={FadeInDown.duration(500).delay(280).springify().damping(18)}
              style={{
                backgroundColor: CREAM,
                borderRadius: scaleW(24),
                padding: scaleW(24),
                marginBottom: scaleW(24),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: scaleW(4),
                }}
              >
                <View>
                  <ThemedText
                    type="heading"
                    lightColor="#36454F"
                    darkColor="#36454F"
                    style={{
                      fontWeight: "600",
                      fontSize: scaleW(16),
                    }}
                  >
                    Name
                  </ThemedText>
                  <ThemedText
                    lightColor="#36454F"
                    darkColor="#36454F"
                    style={{ fontSize: scaleW(12), marginTop: scaleW(4) }}
                  >
                    (Only visible to you)
                  </ThemedText>
                </View>
                {showTrash && (
                  <Pressable
                    onPress={handleDeleteInForm}
                    style={{ padding: scaleW(4) }}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={scaleW(24)}
                      color="#DC2626"
                    />
                  </Pressable>
                )}
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                style={{
                  height: scaleW(48),
                  borderWidth: 2,
                  borderColor: LIGHT_GREEN,
                  borderRadius: scaleW(12),
                  paddingHorizontal: scaleW(16),
                  fontSize: scaleW(16),
                  color: "#36454F",
                  backgroundColor: "#FFFFFF",
                  marginTop: scaleW(8),
                  marginBottom: scaleW(20),
                }}
              />
              <ThemedText
                type="heading"
                lightColor="#36454F"
                darkColor="#36454F"
                style={{
                  fontWeight: "600",
                  fontSize: scaleW(16),
                  marginBottom: scaleW(4),
                }}
              >
                Explorer Nickname
              </ThemedText>
              <ThemedText
                lightColor="#36454F"
                darkColor="#36454F"
                style={{ fontSize: scaleW(12), marginBottom: scaleW(8) }}
              >
                (This is how others see achievements.)
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: scaleW(12),
                  marginBottom: scaleW(20),
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: scaleW(48),
                    backgroundColor: "#D9D8D4",
                    borderTopLeftRadius: scaleW(12),
                    borderBottomLeftRadius: scaleW(12),
                    justifyContent: "center",
                    paddingHorizontal: scaleW(16),
                    marginRight: scaleW(-34),
                  }}
                >
                  <ThemedText
                    lightColor="#36454F"
                    darkColor="#36454F"
                    style={{ fontSize: scaleW(16) }}
                  >
                    {nickname}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={handleNewNickname}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: scaleW(6),
                    height: scaleW(48),
                    paddingHorizontal: scaleW(16),
                    backgroundColor: HUNTLY_GREEN,
                    borderRadius: scaleW(24),
                  }}
                >
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    style={{ fontSize: scaleW(14), fontWeight: "600" }}
                  >
                    New
                  </ThemedText>
                  <MaterialIcons
                    name="refresh"
                    size={scaleW(18)}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
              <ThemedText
                type="heading"
                lightColor="#36454F"
                darkColor="#36454F"
                style={{
                  fontWeight: "600",
                  fontSize: scaleW(16),
                  marginBottom: scaleW(12),
                }}
              >
                Colour
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: scaleW(12),
                }}
              >
                {PROFILE_COLOR_OPTIONS.map((opt) => {
                  const hex = getTailwindColorHex(opt.value);
                  const isSelected = selectedColor === hex;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSelectedColor(hex)}
                      style={{
                        width: scaleW(44),
                        height: scaleW(44),
                        borderRadius: scaleW(22),
                        backgroundColor: hex,
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: HUNTLY_GREEN,
                      }}
                    />
                  );
                })}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Fixed footer: Add player / Add another player + Continue */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(380).springify().damping(18)}
          style={{
            paddingHorizontal: scaleW(24),
            paddingTop: scaleW(8),
            paddingBottom: scaleW(24),
          }}
        >
          <Animated.View style={addPlayerAnimatedStyle}>
            <Pressable
              onPress={handleAddPlayer}
              disabled={!canAddPlayer}
              onPressIn={() => {
                addPlayerScale.value = withSpring(0.96, {
                  damping: 15,
                  stiffness: 400,
                });
              }}
              onPressOut={() => {
                addPlayerScale.value = withSpring(1, {
                  damping: 15,
                  stiffness: 400,
                });
              }}
              style={{
                alignSelf: "center",
                width: "100%",
                maxWidth: scaleW(240),
                paddingVertical: scaleW(18),
                borderRadius: scaleW(50),
                backgroundColor: canAddPlayer ? CREAM : "#9CA3AF",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: canAddPlayer ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: 2,
                marginBottom: scaleW(16),
              }}
            >
              <ThemedText
                type="heading"
                lightColor={canAddPlayer ? HUNTLY_GREEN : "#FFFFFF"}
                darkColor={canAddPlayer ? HUNTLY_GREEN : "#FFFFFF"}
                style={{ fontSize: scaleW(16), fontWeight: "600" }}
              >
                {showAddAnotherPlayer ? "Add another player" : "Add player"}
              </ThemedText>
            </Pressable>
          </Animated.View>

          <Animated.View style={continueAnimatedStyle}>
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              onPressIn={() => {
                continueScale.value = withSpring(0.96, {
                  damping: 15,
                  stiffness: 400,
                });
              }}
              onPressOut={() => {
                continueScale.value = withSpring(1, {
                  damping: 15,
                  stiffness: 400,
                });
              }}
              style={{
                alignSelf: "center",
                width: "100%",
                maxWidth: scaleW(240),
                paddingVertical: scaleW(18),
                borderRadius: scaleW(50),
                backgroundColor: canContinue ? CREAM : "#9CA3AF",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: canContinue ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <ThemedText
                type="heading"
                lightColor={canContinue ? HUNTLY_GREEN : "#FFFFFF"}
                darkColor={canContinue ? HUNTLY_GREEN : "#FFFFFF"}
                style={{ fontSize: scaleW(16), fontWeight: "600" }}
              >
                Continue
              </ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>
        </Wrapper>
      </SafeAreaView>
    </>
  );
}
