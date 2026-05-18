const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const LOCATION_TASK_SERVICE =
  "node_modules/expo-location/android/src/main/java/expo/modules/location/services/LocationTaskService.kt";

const COLORIZED_BLOCK = `    color?.let {
      builder.setColorized(true).setColor(color)
    } ?: run {
      builder.setColorized(false)
    }`;

const LIGHT_SURFACE_BLOCK = `    // Huntly: default light notification surface; accent color tints the icon only.
    builder.setColorized(false)
    color?.let { builder.setColor(it) }`;

const ICON_RESOLUTION_BLOCK = `      if (ai.metaData?.containsKey(META_DATA_FOREGROUND_SERVICE_ICON_KEY) == true) {
        ai.metaData.getInt(META_DATA_FOREGROUND_SERVICE_ICON_KEY)
      } else {
        applicationInfo.icon
      }`;

const ICON_RESOLUTION_WITH_NOTIFICATION_FALLBACK = `      when {
        ai.metaData?.containsKey(META_DATA_FOREGROUND_SERVICE_ICON_KEY) == true ->
          ai.metaData.getInt(META_DATA_FOREGROUND_SERVICE_ICON_KEY)
        else -> {
          val notificationIcon =
            mParentContext.resources.getIdentifier("notification_icon", "drawable", mParentContext.packageName)
          if (notificationIcon != 0) notificationIcon else applicationInfo.icon
        }
      }`;

/**
 * expo-location colorizes the whole notification when notificationColor is set.
 * Match iOS live activity: light surface + Huntly green accent on the icon.
 */
function withAndroidLocationNotification(config) {
  return withDangerousMod(config, ["android", async (cfg) => {
    const kotlinPath = path.join(cfg.modRequest.projectRoot, LOCATION_TASK_SERVICE);
    if (!fs.existsSync(kotlinPath)) {
      console.warn("[withAndroidLocationNotification] expo-location sources not found; skipping patch.");
      return cfg;
    }

    let source = fs.readFileSync(kotlinPath, "utf8");
    if (source.includes("Huntly: default light notification surface")) {
      return cfg;
    }

    if (source.includes(COLORIZED_BLOCK)) {
      source = source.replace(COLORIZED_BLOCK, LIGHT_SURFACE_BLOCK);
    } else {
      console.warn("[withAndroidLocationNotification] colorized notification block not found; skipping patch.");
      return cfg;
    }

    if (source.includes(ICON_RESOLUTION_BLOCK)) {
      source = source.replace(ICON_RESOLUTION_BLOCK, ICON_RESOLUTION_WITH_NOTIFICATION_FALLBACK);
    }

    fs.writeFileSync(kotlinPath, source);
    return cfg;
  }]);
}

module.exports = withAndroidLocationNotification;
