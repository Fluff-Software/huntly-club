import ActivityKit
import Foundation

// Shared definition — compiled into both the main app target (via autolinking)
// and the HuntlyLiveActivity widget extension target (via config plugin).
// Both copies must stay identical for ActivityKit to match them at runtime.
struct HuntlyActivityAttributes: ActivityAttributes {
  public typealias ContentState = ActivityData

  struct ActivityData: Codable, Hashable {
    var distanceMeters: Double
    var steps: Int?
  }

  let isWalk: Bool
  let startedAt: Date
}
