/** Read duration from a hosted audio URL (browser metadata). */
export function getAudioDurationMsFromUrl(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();

    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    audio.addEventListener("loadedmetadata", () => {
      const ms = Math.round(audio.duration * 1000);
      cleanup();
      if (Number.isFinite(ms) && ms > 0) {
        resolve(ms);
      } else {
        reject(new Error("Could not read audio duration"));
      }
    });

    audio.addEventListener("error", () => {
      cleanup();
      reject(new Error("Could not load audio"));
    });

    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audio.src = url;
  });
}

/** Read duration from a local audio file (browser metadata). */
export function getAudioDurationMsFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      audio.load();
    };

    audio.addEventListener("loadedmetadata", () => {
      const ms = Math.round(audio.duration * 1000);
      cleanup();
      if (Number.isFinite(ms) && ms > 0) {
        resolve(ms);
      } else {
        reject(new Error("Could not read audio duration"));
      }
    });

    audio.addEventListener("error", () => {
      cleanup();
      reject(new Error("Could not load audio file"));
    });

    audio.preload = "metadata";
    audio.src = url;
  });
}
