import ExpoModulesCore
import ActivityKit

public class ExpoLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoLiveActivity")

    // Returns true when the device + OS support Live Activities and the user
    // has not disabled them in Settings.
    Function("isSupported") -> Bool {
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // Start a new Live Activity. Returns the activity ID on success, nil otherwise.
    AsyncFunction("startActivity") { (isWalk: Bool, distanceMeters: Double, steps: Int?, promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(nil as String?)
        return
      }

      let attributes = HuntlyActivityAttributes(isWalk: isWalk, startedAt: Date())
      let contentState = HuntlyActivityAttributes.ActivityData(
        distanceMeters: distanceMeters,
        steps: steps
      )

      do {
        let activity = try Activity<HuntlyActivityAttributes>.request(
          attributes: attributes,
          content: ActivityContent(state: contentState, staleDate: nil),
          pushType: nil
        )
        promise.resolve(activity.id)
      } catch {
        promise.reject("START_FAILED", error.localizedDescription)
      }
    }

    // Update the stats shown in an existing Live Activity.
    AsyncFunction("updateActivity") { (activityId: String, distanceMeters: Double, steps: Int?, promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(nil as String?)
        return
      }

      Task {
        for activity in Activity<HuntlyActivityAttributes>.activities where activity.id == activityId {
          let newState = HuntlyActivityAttributes.ActivityData(
            distanceMeters: distanceMeters,
            steps: steps
          )
          await activity.update(ActivityContent(state: newState, staleDate: nil))
        }
        promise.resolve(nil as String?)
      }
    }

    // End the Live Activity and display final stats briefly before it dismisses.
    AsyncFunction("endActivity") { (activityId: String, distanceMeters: Double, steps: Int?, promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(nil as String?)
        return
      }

      Task {
        for activity in Activity<HuntlyActivityAttributes>.activities where activity.id == activityId {
          let finalState = HuntlyActivityAttributes.ActivityData(
            distanceMeters: distanceMeters,
            steps: steps
          )
          await activity.end(
            ActivityContent(state: finalState, staleDate: nil),
            dismissalPolicy: .default
          )
        }
        promise.resolve(nil as String?)
      }
    }
  }
}
