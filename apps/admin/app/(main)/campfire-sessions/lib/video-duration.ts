/** Read duration from a hosted video URL (browser metadata). */
export function getVideoDurationMsFromUrl(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener("loadedmetadata", () => {
      const ms = Math.round(video.duration * 1000);
      cleanup();
      if (Number.isFinite(ms) && ms > 0) {
        resolve(ms);
      } else {
        reject(new Error("Could not read video duration"));
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Could not load video"));
    });

    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.src = url;
  });
}

/** Read duration from a local video file (browser metadata). */
export function getVideoDurationMsFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener("loadedmetadata", () => {
      const ms = Math.round(video.duration * 1000);
      cleanup();
      if (Number.isFinite(ms) && ms > 0) {
        resolve(ms);
      } else {
        reject(new Error("Could not read video duration"));
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Could not load video file"));
    });

    video.preload = "metadata";
    video.src = url;
  });
}
