import SwiftUI
import WidgetKit

@main
struct HuntlyLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.2, *) {
      HuntlyLiveActivityWidget()
    }
  }
}
