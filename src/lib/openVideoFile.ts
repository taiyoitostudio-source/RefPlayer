import { usePlayerStore } from '@/stores/playerStore';

/**
 * Load a video by absolute file path. Reads basic metadata via HTML5 video
 * element first (fast), then refines FPS via ffprobe (accurate). Falls back
 * to 30 fps if ffprobe fails.
 *
 * Used by both the "Open file" button (TopBar) and the "Open with"
 * file-association path (App.tsx).
 */
export async function openVideoFile(
  path: string,
  onWarning?: (msg: string) => void,
): Promise<void> {
  const fileUrl = window.refplayer.pathToFileURL(path);

  const htmlMeta = await new Promise<{ duration: number; width: number; height: number }>(
    (resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = fileUrl;
      const done = () =>
        resolve({
          duration: isFinite(v.duration) ? v.duration : 0,
          width: v.videoWidth || 1920,
          height: v.videoHeight || 1080,
        });
      v.addEventListener('loadedmetadata', done, { once: true });
      v.addEventListener('error', done, { once: true });
      setTimeout(done, 3000);
    },
  );

  let meta = {
    sourceFps: 30,
    totalSourceFrames: Math.round(htmlMeta.duration * 30),
    ...htmlMeta,
  };
  try {
    meta = await window.refplayer.probeVideo(path);
  } catch (err) {
    console.warn('[openVideoFile] ffprobe failed, using 30fps fallback:', err);
    onWarning?.('FPS取得に失敗しました。30FPSで動作します。');
  }

  usePlayerStore.getState().loadVideo(path, meta);
}
