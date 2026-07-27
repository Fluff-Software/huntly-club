import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct ActivityLiveActivity: Widget {
  let name: String = "ActivityLiveActivity"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Active Adventure")
    .description("Shows the current walk or cycle while tracking is active")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}