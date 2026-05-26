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
 * Responsibilities:
 *  - On play/pause toggle, call video.play()/pause()
 *  - On currentFrame change initiated by stepFrame/seek, set video.currentTime
 *  - During playback, use requestVideoFrameCallback to update currentFrame
 *  - Handle repeat / clip range end behavior
 */
export function useFrameAccuratePlayback(videoRef: React.RefObject<HTMLVideoElement>) {
  const lastCommittedFrameRef = useRef<number>(-1);
  const seekingRef = useRef<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelHandle: number | null = null;

    const onFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      const s = usePlayerStore.getState();
      if (s.sourceFps > 0) {
        const sourceFrame = timeToFrame(metadata.mediaTime, s.sourceFps);
        const displayFrame = sourceToDisplayFrame(
          sourceFrame,
          s.sourceFps,
          s.displayFps,
        );
        const start = s.getEffectiveStartFrame();
        const end = s.getEffectiveEndFrame();

        // Handle range end
        if (s.isPlaying && displayFrame >= end) {
          if (s.repeat) {
            s.seekToFrame(start);
            video.currentTime = displayFrameToTime(start, s.sourceFps, s.displayFps);
          } else {
            video.pause();
            s.setIsPlaying(false);
            s.setCurrentFrame(end);
          }
        } else if (s.isPlaying && displayFrame < start) {
          // Should not occur during normal playback but clamp anyway
          s.seekToFrame(start);
        } else if (displayFrame !== lastCommittedFrameRef.current) {
          lastCommittedFrameRef.current = displayFrame;
          s.setCurrentFrame(displayFrame);
        }
      }
      cancelHandle = video.requestVideoFrameCallback(onFrame);
    };

    cancelHandle = video.requestVideoFrameCallback(onFrame);

    return () => {
      if (cancelHandle != null) video.cancelVideoFrameCallback(cancelHandle);
    };
  }, [videoRef]);

  // React to play/pause state changes
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      const video = videoRef.current;
      if (!video) return;

      if (state.isPlaying !== prev.isPlaying) {
        if (state.isPlaying) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }

      // External seek (user clicked timeline, used shortcut, etc.)
      if (
        state.currentFrame !== prev.currentFrame &&
        state.currentFrame !== lastCommittedFrameRef.current &&
        state.sourceFps > 0
      ) {
        seekingRef.current = true;
        const target = displayFrameToTime(state.currentFrame, state.sourceFps, state.displayFps);
        video.currentTime = target;
        lastCommittedFrameRef.current = state.currentFrame;
      }

      // File load
      if (state.fileUrl !== prev.fileUrl) {
        lastCommittedFrameRef.current = 0;
      }
    });
    return unsub;
  }, [videoRef]);
}
