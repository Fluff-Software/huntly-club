import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FK, FONT, RADIUS, TYPE } from "@/constants/fieldKit";
import {
  type AdventurePlanDraft,
  DEFAULT_WEEKLY_TIME,
  friendlyTime,
  parseHm,
  slotDate,
  slotOptions,
  type SlotOption,
} from "@/services/adventurePlanService";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
/** Display order Monday-first; stored as 0 = Sunday … 6 = Saturday. */
const DISPLAY_TO_DAY = [1, 2, 3, 4, 5, 6, 0];
const CUSTOM_TIMES = ["07:30", "09:00", "10:00", "12:00", "15:30", "16:30", "17:30", "18:30"];
const WEEKLY_TIMES = ["08:00", "10:00", "15:30", "16:30", "17:30"];

function nextDays(count: number, now = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function dayLabel(d: Date, now = new Date()): string {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function tap() {
  void Haptics.selectionAsync().catch(() => undefined);
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && { borderColor: FK.sunbeam }]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

export function SlotPicker({
  value,
  onChange,
  showFirst = true,
  showWeekly = true,
}: {
  value: AdventurePlanDraft;
  onChange: (next: AdventurePlanDraft) => void;
  showFirst?: boolean;
  showWeekly?: boolean;
}) {
  const now = useMemo(() => new Date(), []);
  const options = useMemo(() => slotOptions(now), [now]);
  const days = useMemo(() => nextDays(7, now), [now]);
  const initialCustom = value.choice === "custom" && value.firstAt ? new Date(value.firstAt) : null;
  const [customDay, setCustomDay] = useState<Date>(() => {
    if (initialCustom) {
      const d = new Date(initialCustom);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return days[1];
  });
  const [customTime, setCustomTime] = useState<string>(() =>
    initialCustom ? `${String(initialCustom.getHours()).padStart(2, "0")}:${String(initialCustom.getMinutes()).padStart(2, "0")}` : "10:00"
  );

  const choose = (opt: SlotOption) => {
    tap();
    const at = slotDate(opt.choice, now);
    const weeklyTime = value.weeklyTime ?? opt.time;
    // Pre-select the matching weekday for the weekly slot so one tap does both.
    const weeklyDays = value.weeklyDays.length ? value.weeklyDays : [at.getDay()];
    onChange({ choice: opt.choice, firstAt: at.toISOString(), weeklyDays, weeklyTime });
  };

  const applyCustom = (day: Date, time: string) => {
    const { h, m } = parseHm(time);
    const at = new Date(day);
    at.setHours(h, m, 0, 0);
    const weeklyDays = value.weeklyDays.length ? value.weeklyDays : [at.getDay()];
    onChange({ ...value, choice: "custom", firstAt: at.toISOString(), weeklyDays, weeklyTime: value.weeklyTime ?? time });
  };

  const toggleDay = (day: number) => {
    tap();
    const set = new Set(value.weeklyDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange({ ...value, weeklyDays: [...set].sort(), weeklyTime: value.weeklyTime ?? DEFAULT_WEEKLY_TIME });
  };

  const isPast = (day: Date, time: string) => {
    const { h, m } = parseHm(time);
    const at = new Date(day);
    at.setHours(h, m, 0, 0);
    return at.getTime() < now.getTime() + 30 * 60 * 1000;
  };

  return (
    <View>
      {showFirst
        ? options.map((opt, i) => {
            const selected = value.choice === opt.choice;
            return (
              <Animated.View key={opt.choice} entering={FadeInDown.duration(300).delay(i * 50)}>
                <Pressable
                  onPress={() => choose(opt)}
                  style={[styles.option, selected && styles.optionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`slot-${opt.choice}`}
                >
                  <Radio selected={selected} />
                  <Text style={[styles.optionLabel, selected && { color: FK.white }]}>{opt.label}</Text>
                  <Text style={[styles.optionTime, selected && { color: "#C9D6C3" }]}>{opt.time}</Text>
                </Pressable>
              </Animated.View>
            );
          })
        : null}

      {showFirst ? (
        <Animated.View entering={FadeInDown.duration(300).delay(options.length * 50)}>
          <Pressable
            onPress={() => {
              tap();
              applyCustom(customDay, isPast(customDay, customTime) ? "18:30" : customTime);
            }}
            style={[styles.option, value.choice === "custom" && styles.optionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: value.choice === "custom" }}
            testID="slot-custom"
          >
            <Radio selected={value.choice === "custom"} />
            <Text style={[styles.optionLabel, value.choice === "custom" && { color: FK.white }]}>Pick a time</Text>
            {value.choice === "custom" && value.firstAt ? (
              <Text style={[styles.optionTime, { color: "#C9D6C3" }]}>
                {dayLabel(new Date(value.firstAt), now)} {friendlyTime(new Date(value.firstAt))}
              </Text>
            ) : null}
          </Pressable>
          {value.choice === "custom" ? (
            <View style={styles.customBox}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {days.map((d) => {
                  const sel = d.getTime() === customDay.getTime();
                  return (
                    <Pressable
                      key={d.toISOString()}
                      onPress={() => {
                        tap();
                        setCustomDay(d);
                        applyCustom(d, isPast(d, customTime) ? "18:30" : customTime);
                      }}
                      style={[styles.chip, sel && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{dayLabel(d, now)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.timeGrid}>
                {CUSTOM_TIMES.map((t) => {
                  const past = isPast(customDay, t);
                  const sel = t === customTime;
                  return (
                    <Pressable
                      key={t}
                      disabled={past}
                      onPress={() => {
                        tap();
                        setCustomTime(t);
                        applyCustom(customDay, t);
                      }}
                      style={[styles.chip, sel && styles.chipSelected, past && { opacity: 0.35 }]}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {showWeekly ? (
        <View style={{ marginTop: showFirst ? 22 : 0 }}>
          <View style={styles.weeklyHeader}>
            <Text style={TYPE.heading}>{showFirst ? "And every week?" : "Pick a day and time"}</Text>
            <Text style={styles.weeklyTime}>{value.weeklyTime ?? DEFAULT_WEEKLY_TIME}</Text>
          </View>
          <View style={styles.dayRow}>
            {DISPLAY_TO_DAY.map((day, i) => {
              const sel = value.weeklyDays.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[styles.day, sel && { backgroundColor: FK.sunbeam }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: sel }}
                  testID={`weekly-day-${day}`}
                >
                  <Text style={styles.dayText}>{DAY_LETTERS[i]}</Text>
                </Pressable>
              );
            })}
          </View>
          {value.weeklyDays.length > 0 ? (
            <View style={[styles.timeGrid, { marginTop: 10 }]}>
              {WEEKLY_TIMES.map((t) => {
                const sel = (value.weeklyTime ?? DEFAULT_WEEKLY_TIME) === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      tap();
                      onChange({ ...value, weeklyTime: t });
                    }}
                    style={[styles.chip, sel && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FK.paper,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    minHeight: 62,
    marginBottom: 10,
    gap: 14,
  },
  optionSelected: { backgroundColor: FK.ink },
  optionLabel: { flex: 1, fontFamily: FONT.display, fontSize: 18, color: FK.ink },
  optionTime: { fontFamily: FONT.displayBold, fontSize: 16, color: FK.muted },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#9AA79C",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: FK.sunbeam },
  customBox: { backgroundColor: FK.paper, borderRadius: RADIUS.md, padding: 12, marginTop: -4, marginBottom: 10 },
  chipRow: { gap: 8, paddingBottom: 10 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#E8ECDF", borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  chipSelected: { backgroundColor: FK.ink },
  chipText: { fontFamily: FONT.displayBold, fontSize: 15, color: FK.ink },
  chipTextSelected: { color: FK.sunbeam },
  weeklyHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  weeklyTime: { fontFamily: FONT.display, fontSize: 18, color: FK.ink },
  dayRow: { flexDirection: "row", gap: 6 },
  day: {
    flex: 1,
    aspectRatio: 0.95,
    borderRadius: 14,
    backgroundColor: FK.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontFamily: FONT.display, fontSize: 17, color: FK.ink },
});
