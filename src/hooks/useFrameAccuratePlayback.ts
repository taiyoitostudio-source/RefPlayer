import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import {
  displayFrameToTime,
  sourceToDisplayFrame,
  timeToFrame,
} from '@/utils/frameMath';

/**
 * Wires an HTMLVideoElement to the player store.
 *
 * Re-runs whenever fileUrl changes so the requestVideoFrameCallback chain
 * always targets the currently-mounted <video> element.
 */
export function useFrameAccuratePlayback(
  videoRef: React.RefObject<HTMLVideoElement>,
  fileUrl: string | null,
) {
  const lastCommittedFrameRef = useRef<number>(-1);

  // Frame-by-frame currentFrame updates during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fileUrl) return;

    lastCommittedFrameRef.current = -1;
    let cancelHandle: number | null = null;

    const onFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      const s = usePlayerStore.getState();
      if (s.sourceFps > 0) {
        const sourceFrame = timeToFrame(metadata.mediaTime, s.sourceFps);
        const displayFrame = sourceToDisplayFrame(sourceFrame, s.sourceFps, s.displayFps);
        const start = s.getEffectiveStartFrame();
        const end = s.getEffectiveEndFrame();

        if (s.isPlaying && displayFrame >= end) {
          if (s.repeat) {
            lastCommittedFrameRef.current = start;
            s.seekToFrame(start);
            video.currentTime = displayFrameToTime(start, s.sourceFps, s.displayFps);
          } else {
            video.pause();
            s.setIsPlaying(false);
            lastCommittedFrameRef.current = end;
            s.setCurrentFrame(end);
          }
        } else if (s.isPlaying && displayFrame < start) {
          lastCommittedFrameRef.current = start;
          s.seekToFrame(start);
        } else if (displayFrame !== lastCommittedFrameRef.current) {
          lastCommittedFrameRef.current = displayFrame;
          s.setCurrentFrame(displayFrame);
        }
      }
      if (videoRef.current === video) {
        cancelHandle = video.requestVideoFrameCallback(onFrame);
      }
    };

    cancelHandle = video.requestVideoFrameCallback(onFrame);

    return () => {
      if (cancelHandle != null) video.cancelVideoFrameCallback(cancelHandle);
    };
  }, [videoRef, fileUrl]);

  // Play/pause + external seek
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      const video = videoRef.current;
      if (!video) return;

      if (state.isPlaying !== prev.isPlaying) {
        if (state.isPlaying) {
          // If the video isn't ready yet, wait for canplay
          if (video.readyState >= 2) {
            video.play().catch(() => {});
          } else {
            const onReady = () => {
              if (usePlayerStore.getState().isPlaying) video.play().catch(() => {});
            };
            video.addEventListener('canplay', onReady, { once: true });
          }
        } else {
          video.pause();
        }
      }

      // External seek (timeline click, shortcut, FPS change, etc.)
      if (
        state.currentFrame !== prev.currentFrame &&
        state.currentFrame !== lastCommittedFrameRef.current &&
        state.sourceFps > 0
      ) {
        const target = displayFrameToTime(state.currentFrame, state.sourceFps, state.displayFps);
        video.currentTime = target;
        lastCommittedFrameRef.current = state.currentFrame;
      }

      // File reload
      if (state.fileUrl !== prev.fileUrl) {
        lastCommittedFrameRef.current = -1;
      }
    });
    return unsub;
  }, [videoRef]);
}
