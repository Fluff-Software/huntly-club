import ActivityKit
import Foundation

// Identical copy compiled into the widget extension target.
// Must match the definition in the main app target exactly.
struct HuntlyActivityAttributes: ActivityAttributes {
  public typealias ContentState = ActivityData

  struct ActivityData: Codable, Hashable {
    var distanceMeters: Double
    var steps: Int?
  }

  let isWalk: Bool
  let startedAt: Date
}
