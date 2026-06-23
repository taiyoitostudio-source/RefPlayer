/**
 * Capture the current video frame to a PNG and prompt the user for a save
 * destination. Returns the saved file path, or null if the user cancelled.
 */
export async function saveCurrentFrame(
  video: HTMLVideoElement,
  baseFilePath: string | null,
  displayFrameNumber: number,
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('動画がまだ読み込まれていません');
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(video, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('PNG エンコードに失敗しました');

  const stem = (baseFilePath ?? 'frame')
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[^.]+$/, '');
  const defaultName = `${stem}_frame${displayFrameNumber}.png`;

  const outPath = await window.refplayer.savePngDialog(defaultName);
  if (!outPath) return null;

  const buf = new Uint8Array(await blob.arrayBuffer());
  await window.refplayer.writePngFile(outPath, buf);
  return outPath;
}
