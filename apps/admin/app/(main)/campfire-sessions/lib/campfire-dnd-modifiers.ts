import type { Modifier } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

/** Only timeline blocks slide horizontally; palette items can move freely to tracks. */
export const restrictTimelineBlocksToHorizontalAxis: Modifier = (args) => {
  if (args.active?.data.current?.kind === "block") {
    return restrictToHorizontalAxis(args);
  }
  return args.transform;
};
