import { Platform } from "react-native";
import { ActivityMap as ActivityMapAndroid } from "./ActivityMap.android";
import { ActivityMap as ActivityMapIos } from "./ActivityMap.ios";

export const ActivityMap = Platform.OS === "ios" ? ActivityMapIos : ActivityMapAndroid;
