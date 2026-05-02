import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Helpers

private let huntlyGreen = Color(red: 0.31, green: 0.44, blue: 0.32)
private let lightGreenBg = Color(red: 0.93, green: 0.96, blue: 0.93)

private func formatDistance(_ meters: Double) -> String {
  if meters < 1000 { return "\(Int(meters)) m" }
  return String(format: "%.2f km", meters / 1000)
}

// MARK: - Lock Screen View

struct HuntlyLockScreenView: View {
  let context: ActivityViewContext<HuntlyActivityAttributes>

  private var activityIcon: String {
    context.attributes.isWalk ? "figure.walk" : "figure.outdoor.cycle"
  }

  private var activityLabel: String {
    context.attributes.isWalk ? "Walking" : "Cycling"
  }

  var body: some View {
    HStack(spacing: 14) {
      ZStack {
        Circle()
          .fill(huntlyGreen)
          .frame(width: 48, height: 48)
        Image(systemName: activityIcon)
          .foregroundColor(.white)
          .font(.system(size: 24, weight: .medium))
      }

      VStack(alignment: .leading, spacing: 5) {
        Text(activityLabel)
          .font(.headline)
          .foregroundColor(.primary)

        HStack(spacing: 14) {
          Label(
            formatDistance(context.state.distanceMeters),
            systemImage: "location.fill"
          )
          .font(.caption)
          .fontWeight(.semibold)

          // Auto-updating elapsed timer — no app update needed
          Label(
            timerInterval: context.attributes.startedAt ..< Date.distantFuture,
            countsDown: false
          )
          .font(.caption)
          .fontWeight(.semibold)
          .monospacedDigit()

          if context.attributes.isWalk, let steps = context.state.steps {
            Label("\(steps)", systemImage: "shoeprints.fill")
              .font(.caption)
              .fontWeight(.semibold)
          }
        }
        .foregroundColor(.secondary)
      }

      Spacer()

      Text("Huntly")
        .font(.caption2)
        .foregroundColor(huntlyGreen)
        .fontWeight(.bold)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .background(lightGreenBg)
  }
}

// MARK: - Widget

@available(iOS 16.2, *)
struct HuntlyLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: HuntlyActivityAttributes.self) { context in
      HuntlyLockScreenView(context: context)
    } dynamicIsland: { context in
      let icon = context.attributes.isWalk ? "figure.walk" : "figure.outdoor.cycle"

      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            Image(systemName: icon)
              .font(.title3)
              .foregroundColor(huntlyGreen)
            VStack(alignment: .leading, spacing: 2) {
              Text(context.attributes.isWalk ? "Walking" : "Cycling")
                .font(.caption).fontWeight(.bold)
              Text(formatDistance(context.state.distanceMeters))
                .font(.caption2).foregroundColor(.secondary)
            }
          }
          .padding(.leading, 4)
        }

        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            Label(
              timerInterval: context.attributes.startedAt ..< Date.distantFuture,
              countsDown: false
            )
            .font(.caption).fontWeight(.bold)
            .monospacedDigit()

            if context.attributes.isWalk, let steps = context.state.steps {
              Text("\(steps) steps")
                .font(.caption2).foregroundColor(.secondary)
            }
          }
          .padding(.trailing, 4)
        }

        DynamicIslandExpandedRegion(.center) {}
        DynamicIslandExpandedRegion(.bottom) {}
      } compactLeading: {
        Image(systemName: icon)
          .foregroundColor(huntlyGreen)
          .font(.system(size: 14, weight: .semibold))
      } compactTrailing: {
        Text(formatDistance(context.state.distanceMeters))
          .font(.caption2).fontWeight(.bold)
          .monospacedDigit()
      } minimal: {
        Image(systemName: icon)
          .foregroundColor(huntlyGreen)
      }
      .keylineTint(huntlyGreen)
    }
  }
}
