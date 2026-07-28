import { Platform } from "react-native";
import { QuestItemsMap as QuestItemsMapAndroid } from "./QuestItemsMap.android";
import { QuestItemsMap as QuestItemsMapIos } from "./QuestItemsMap.ios";

export const QuestItemsMap = Platform.OS === "ios" ? QuestItemsMapIos : QuestItemsMapAndroid;
