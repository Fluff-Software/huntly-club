/**
 * Expo config plugin that wires up iOS Live Activity support for Huntly.
 *
 * What this does during `expo prebuild` / EAS Build:
 *  1. Adds NSSupportsLiveActivities + NSSupportsLiveActivitiesFrequentUpdates
 *     to the main app's Info.plist so iOS 16.2+ exposes the Live Activity API.
 *  2. Copies the HuntlyLiveActivity widget extension source files into the
 *     generated ios/ directory.
 *  3. Adds a new "HuntlyLiveActivity" app-extension Xcode target that compiles
 *     those files, links WidgetKit/SwiftUI/ActivityKit, and is embedded into
 *     the main app bundle.
 *  4. Sets the minimum deployment target for the extension to iOS 16.2.
 */

import {
  ConfigPlugin,
  withXcodeProject,
  withInfoPlist,
  IOSConfig,
} from "@expo/config-plugins";
import * as path from "path";
import * as fs from "fs";

// ─── constants ───────────────────────────────────────────────────────────────

const EXTENSION_NAME = "HuntlyLiveActivity";
const DEPLOYMENT_TARGET = "16.2";

// Swift source files that belong in the widget extension target.
const EXTENSION_SWIFT_FILES = [
  "HuntlyActivityAttributes.swift",
  "HuntlyLiveActivityWidget.swift",
  "HuntlyLiveActivityBundle.swift",
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function generateUUID(): string {
  const hex = () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
  return `${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}`;
}

// ─── plugin ──────────────────────────────────────────────────────────────────

const withLiveActivities: ConfigPlugin = (config) => {
  // Step 1 – Info.plist: declare Live Activity support
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    cfg.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return cfg;
  });

  // Step 2 + 3 – Xcode project: copy files and add extension target
  config = withXcodeProject(config, (cfg) => {
    const xcodeProject = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const iosDir = path.join(projectRoot, "ios");
    const extensionDir = path.join(iosDir, EXTENSION_NAME);

    // ── Copy source files ──────────────────────────────────────────────────
    const sourceDir = path.join(
      projectRoot,
      "modules",
      "expo-live-activity",
      "ios",
      "HuntlyLiveActivity"
    );

    if (!fs.existsSync(extensionDir)) {
      fs.mkdirSync(extensionDir, { recursive: true });
    }

    for (const file of [...EXTENSION_SWIFT_FILES, "Info.plist"]) {
      const src = path.join(sourceDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(extensionDir, file));
      }
    }

    // ── Bail if target already exists (idempotent) ─────────────────────────
    const existingTargets: Record<string, { firstTarget?: { name?: string } }> =
      xcodeProject.pbxNativeTargetSection();
    const alreadyAdded = Object.values(existingTargets).some(
      (t) => t.firstTarget?.name === EXTENSION_NAME || (t as any).name === EXTENSION_NAME
    );
    if (alreadyAdded) return cfg;

    // ── Determine bundle IDs ───────────────────────────────────────────────
    const mainBundleId =
      cfg.ios?.bundleIdentifier ?? "software.fluff.huntly-club";
    const extensionBundleId = `${mainBundleId}.liveactivity`;

    // ── Add the extension target via the xcode project API ────────────────
    // `addTarget` creates the native target plus default Sources / Resources /
    // Frameworks build phases and returns { uuid, pbxNativeTarget }.
    const extTarget = xcodeProject.addTarget(
      EXTENSION_NAME,
      "app_extension",
      EXTENSION_NAME,
      extensionBundleId
    );

    // ── Add Swift source files to the Sources build phase ─────────────────
    for (const swiftFile of EXTENSION_SWIFT_FILES) {
      xcodeProject.addSourceFile(
        `${EXTENSION_NAME}/${swiftFile}`,
        { target: extTarget.uuid },
        extTarget.uuid
      );
    }

    // ── Add Info.plist as a resource ───────────────────────────────────────
    xcodeProject.addResourceFile(
      `${EXTENSION_NAME}/Info.plist`,
      { target: extTarget.uuid },
      extTarget.uuid
    );

    // ── Link required system frameworks ───────────────────────────────────
    const frameworkOpts = { target: extTarget.uuid };
    xcodeProject.addFramework("WidgetKit.framework", frameworkOpts);
    xcodeProject.addFramework("SwiftUI.framework", frameworkOpts);

    // ActivityKit is only available from iOS 16.1 – add as weak-linked so
    // the binary still runs on older OS (the isSupported check handles it).
    xcodeProject.addFramework("ActivityKit.framework", {
      ...frameworkOpts,
      weak: true,
    });

    // ── Build settings per configuration ──────────────────────────────────
    const buildConfigs: Record<string, any> = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(buildConfigs)) {
      const bc = buildConfigs[key];
      if (
        typeof bc !== "object" ||
        bc._id === undefined ||
        bc.buildSettings === undefined
      )
        continue;

      // Only touch configurations that belong to our extension target.
      const configListKey = extTarget.pbxNativeTarget.buildConfigurationList;
      const configList = xcodeProject.pbxXCConfigurationList()[configListKey];
      if (!configList) continue;

      const configRefs: Array<{ value: string }> =
        configList.buildConfigurations ?? [];
      const configUuids = configRefs.map((r) => r.value);

      if (!configUuids.includes(key)) continue;

      const s = bc.buildSettings;
      s.SWIFT_VERSION = '"5.0"';
      s.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
      s.INFOPLIST_FILE = `"${EXTENSION_NAME}/Info.plist"`;
      s.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
      s.SKIP_INSTALL = "YES";
      s.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = "NO";
      s.MARKETING_VERSION = '"1.0"';
      s.CURRENT_PROJECT_VERSION = '"1"';
    }

    // ── Embed the extension .appex into the main app ───────────────────────
    // Find the first (and only) main native target
    const mainTarget = xcodeProject.getFirstTarget().firstTarget;

    xcodeProject.addTargetDependency(mainTarget.uuid, [extTarget.uuid]);

    // "Embed App Extensions" copy-files phase (dstSubfolderSpec = 13 → PlugIns)
    xcodeProject.addBuildPhase(
      [`${EXTENSION_NAME}.appex`],
      "PBXCopyFilesBuildPhase",
      "Embed App Extensions",
      mainTarget.uuid,
      undefined,
      "13" // PlugIns destination
    );

    return cfg;
  });

  return config;
};

export default withLiveActivities;
