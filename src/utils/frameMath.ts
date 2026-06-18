/** Convert a source-domain frame index to a precise media-time seek target.
 *  +0.5 lands on the visual midpoint of the frame so seek precision is more robust
 *  across browser/codec edge effects. */
export const frameToTime = (frame: number, fps: number): number => (frame + 0.5) / fps;

/** Convert a media time (seconds) to the nearest source-domain frame index. */
export const timeToFrame = (time: number, fps: number): number => Math.floor(time * fps);

/** Map a display-domain frame index to the corresponding source-domain frame.
 *  Used when the user has selected a lower display FPS than the source. */
export const displayToSourceFrame = (
  displayFrame: number,
  sourceFps: number,
  displayFps: number,
): number => Math.round((displayFrame * sourceFps) / displayFps);

export const sourceToDisplayFrame = (
  sourceFrame: number,
  sourceFps: number,
  displayFps: number,
): number => Math.round((sourceFrame * displayFps) / sourceFps);

export const totalDisplayFrames = (
  totalSourceFrames: number,
  sourceFps: number,
  displayFps: number,
): number => Math.max(1, Math.round((totalSourceFrames * displayFps) / sourceFps));

export const displayFrameToTime = (
  displayFrame: number,
  sourceFps: number,
  displayFps: number,
): number => {
  const sourceFrame = displayToSourceFrame(displayFrame, sourceFps, displayFps);
  return frameToTime(sourceFrame, sourceFps);
};

export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

// Convert an absolute (0-indexed) frame to its 1-indexed display label.
// `startFrame` is the clip start when clipped, 0 otherwise.
export const displayFrameLabel = (absFrame: number, startFrame: number): number =>
  absFrame - startFrame + 1;
