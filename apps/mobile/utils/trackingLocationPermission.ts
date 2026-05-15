import { Platform } from "react-native";

export type TrackingLocationIssue =
  | "foreground_denied"
  | "background_denied"
  | "location_services_disabled";

export class TrackingPermissionError extends Error {
  readonly issue: TrackingLocationIssue;

  constructor(issue: TrackingLocationIssue, message?: string) {
    super(message ?? trackingLocationIssueMessage(issue));
    this.name = "TrackingPermissionError";
    this.issue = issue;
  }
}

export function trackingLocationIssueMessage(issue: TrackingLocationIssue): string {
  switch (issue) {
    case "foreground_denied":
      return "Location access is needed to track your walk or cycle.";
    case "background_denied":
      return "Background location is needed so your route keeps recording when the app is in the background.";
    case "location_services_disabled":
      return "Location services are turned off on this device.";
  }
}

const MESSAGE_PATTERNS: ReadonlyArray<[RegExp, TrackingLocationIssue]> = [
  [/background location/i, "background_denied"],
  [/location permission is needed/i, "foreground_denied"],
  [/not authorized to use location services/i, "location_services_disabled"],
  [/location services are disabled/i, "location_services_disabled"],
  [/location services disabled/i, "location_services_disabled"],
  [/enable location services/i, "location_services_disabled"],
];

export function resolveTrackingLocationIssue(error: unknown): TrackingLocationIssue | null {
  if (error instanceof TrackingPermissionError) return error.issue;

  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return null;

  for (const [pattern, issue] of MESSAGE_PATTERNS) {
    if (pattern.test(message)) return issue;
  }

  if (/permission/i.test(message) && !/background location/i.test(message)) {
    return "foreground_denied";
  }

  return null;
}

export function isTrackingLocationAccessIssue(error: unknown): boolean {
  return resolveTrackingLocationIssue(error) != null;
}

export function describeTrackingLocationFailure(
  error: unknown,
  fallbackMessage: string
): {
  issue: TrackingLocationIssue | null;
  status: "denied" | "error";
  errorMessage: string | null;
} {
  const issue = resolveTrackingLocationIssue(error);
  if (issue) {
    return { issue, status: "denied", errorMessage: null };
  }
  return {
    issue: null,
    status: "error",
    errorMessage: error instanceof Error ? error.message : fallbackMessage,
  };
}

export type TrackingLocationGuidance = {
  title: string;
  steps: string[];
};

export function getTrackingLocationGuidance(issue: TrackingLocationIssue): TrackingLocationGuidance {
  if (Platform.OS === "ios") {
    return getIosTrackingLocationGuidance(issue);
  }
  return getAndroidTrackingLocationGuidance(issue);
}

function getIosTrackingLocationGuidance(issue: TrackingLocationIssue): TrackingLocationGuidance {
  switch (issue) {
    case "foreground_denied":
      return {
        title: "Allow location while using the app",
        steps: [
          "Tap Settings below.",
          "Open Location for Huntly World.",
          'Choose "While Using the App".',
          "Return to Huntly World and tap Try again.",
        ],
      };
    case "background_denied":
      return {
        title: "Allow location all the time",
        steps: [
          "Tap Settings below.",
          "Open Location for Huntly World.",
          'Choose "Always" so your route keeps recording if you lock your phone or switch apps.',
          "Return to Huntly World and tap Try again.",
        ],
      };
    case "location_services_disabled":
      return {
        title: "Turn on Location Services",
        steps: [
          "Open the Settings app on your iPhone.",
          "Go to Privacy & Security → Location Services.",
          "Turn on Location Services.",
          "Return to Huntly World and tap Try again.",
        ],
      };
  }
}

function getAndroidTrackingLocationGuidance(issue: TrackingLocationIssue): TrackingLocationGuidance {
  switch (issue) {
    case "foreground_denied":
      return {
        title: "Allow location for Huntly World",
        steps: [
          "Tap Settings below.",
          "Open Permissions → Location.",
          'Choose "Allow only while using the app".',
          "Return to Huntly World and tap Try again.",
        ],
      };
    case "background_denied":
      return {
        title: 'Select "Allow all the time"',
        steps: [
          "Tap Settings below.",
          "Open Permissions → Location.",
          'Select "Allow all the time".',
          'Do not select "Allow only while using the app" or "Ask every time".',
          "Your route needs this so it keeps recording if you lock your phone or switch apps.",
          "Return to Huntly World and tap Try again.",
        ],
      };
    case "location_services_disabled":
      return {
        title: "Turn on device location",
        steps: [
          "Swipe down and turn on Location (or open Settings → Location).",
          "Open Huntly World → Permissions → Location.",
          'Select "Allow all the time".',
          "Return to Huntly World and tap Try again.",
        ],
      };
  }
}
