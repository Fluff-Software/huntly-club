/**
 * Field kit motion: calm and quick. Things ease into place and stop; nothing
 * overshoots, springs or bounces. Reward moments (pack reveals, badge spins) are
 * the only place for anything livelier.
 */
import { Easing, FadeIn, Keyframe, SlideInDown } from "react-native-reanimated";

export const EASE_OUT = Easing.out(Easing.cubic);

/** Moving a highlight or indicator from one place to another. */
export const MOVE = { duration: 240, easing: EASE_OUT };

/** Bottom sheets rising into view. */
export const sheetIn = SlideInDown.duration(280).easing(EASE_OUT);

/** Backdrops and overlays. */
export const fadeIn = FadeIn.duration(200);

/**
 * A hero element (portrait, badge, tick) arriving: fades up from 94% size.
 * Replaces ZoomIn, which grows from nothing and reads as a bounce.
 */
export function settleIn(delay = 0, duration = 360) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
  })
    .duration(duration)
    .delay(delay);
}
