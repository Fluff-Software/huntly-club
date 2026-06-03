import type { VideoPlayer } from "expo-video";

/** True when the native VideoPlayer has not been released. */
export function isVideoPlayerAlive(player: VideoPlayer): boolean {
  try {
    void player.status;
    return true;
  } catch {
    return false;
  }
}

export function safePlayerCurrentTime(player: VideoPlayer): number | null {
  try {
    return player.currentTime;
  } catch {
    return null;
  }
}

export function safePlayerSeek(player: VideoPlayer, timeSec: number): boolean {
  try {
    player.currentTime = timeSec;
    return true;
  } catch {
    return false;
  }
}

export function safePlayerPause(player: VideoPlayer): void {
  try {
    player.pause();
  } catch {
    // ignore
  }
}

export function safePlayerPlay(player: VideoPlayer): void {
  try {
    player.play();
  } catch {
    // ignore
  }
}
