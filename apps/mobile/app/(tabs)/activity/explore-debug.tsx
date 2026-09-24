/** Legacy route — redirects to the player Explore map. */
import { Redirect } from "expo-router";

export default function ExploreDebugRedirect() {
  return <Redirect href="/(tabs)/activity/explore" />;
}
