import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { app } from 'electron';
import { settingsManager } from './settings';

// ffmpeg-static / ffprobe-static paths inside asar must be rewritten to unpacked.
function resolveBundled(p: string | null | undefined): string {
  if (!p) throw new Error('ffmpeg binary path not resolved');
  if (app.isPackaged) {
    return p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

export function ffmpegPath(): string {
  const override = settingsManager.get('ffmpegPath');
  if (override) return override;
  return resolveBundled(ffmpegStatic as unknown as string);
}

export function ffprobePath(): string {
  return resolveBundled(ffprobeStatic.path);
}

export type VideoMeta = {
  sourceFps: number;
  totalSourceFrames: number;
  duration: number;
  width: number;
  height: number;
};

function runCapture(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} exited with code ${code}\n${stderr}`));
    });
  });
}

export async function probeVideo(filePath: string): Promise<VideoMeta> {
  const { stdout } = await runCapture(ffprobePath(), [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate,nb_frames,duration,width,height',
    '-of', 'json',
    filePath,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{
      r_frame_rate?: string;
      nb_frames?: string;
      duration?: string;
      width?: number;
      height?: number;
    }>;
  };
  const s = parsed.streams?.[0];
  if (!s) throw new Error('No video stream found');

  const [num, den] = (s.r_frame_rate ?? '0/1').split('/').map(Number);
  const sourceFps = den ? num / den : 0;
  const duration = s.duration ? parseFloat(s.duration) : 0;
  let totalSourceFrames = s.nb_frames ? parseInt(s.nb_frames, 10) : 0;
  if (!totalSourceFrames && sourceFps && duration) {
    totalSourceFrames = Math.round(sourceFps * duration);
  }
  return {
    sourceFps,
    totalSourceFrames,
    duration,
    width: s.width ?? 0,
    height: s.height ?? 0,
  };
}

export type ExportOpts = {
  inputPath: string;
  outputPath: string;
  startSec: number;
  endSec: number;
  targetFps: number;
  sourceFps: number;
  isClipped: boolean;
  onProgress?: (percent: number) => void;
};

type H264Encoder = 'h264_nvenc' | 'h264_qsv' | 'h264_amf' | 'libx264';

const ENCODER_PRIORITY: H264Encoder[] = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'libx264'];

let cachedEncoderPromise: Promise<H264Encoder> | null = null;

async function detectH264Encoder(): Promise<H264Encoder> {
  if (cachedEncoderPromise) return cachedEncoderPromise;
  cachedEncoderPromise = (async () => {
    try {
      const { stdout } = await runCapture(ffmpegPath(), ['-hide_banner', '-encoders']);
      for (const enc of ENCODER_PRIORITY) {
        // Encoder lines look like: " V....D h264_nvenc            NVIDIA NVENC H.264 encoder"
        const re = new RegExp(`^\\s*V\\S*\\s+${enc}\\b`, 'm');
        if (re.test(stdout)) {
          console.log(`[ffmpeg] selected video encoder: ${enc}`);
          return enc;
        }
      }
    } catch (err) {
      console.warn('[ffmpeg] encoder detection failed, falling back to libx264:', err);
    }
    return 'libx264';
  })();
  return cachedEncoderPromise;
}

function buildVideoEncoderArgs(encoder: H264Encoder): string[] {
  switch (encoder) {
    case 'h264_nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-tune', 'hq', '-rc', 'vbr', '-cq', '23', '-b:v', '0'];
    case 'h264_qsv':
      return ['-c:v', 'h264_qsv', '-preset', 'medium', '-global_quality', '23'];
    case 'h264_amf':
      return ['-c:v', 'h264_amf', '-quality', 'balanced', '-rc', 'cqp', '-qp_i', '22', '-qp_p', '24'];
    case 'libx264':
    default:
      return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23'];
  }
}

function runFfmpegEncode(
  args: string[],
  durationSec: number,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), args, { windowsHide: true });
    let stderr = '';
    let buf = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        const m = line.match(/^out_time_ms=(\d+)/);
        if (m && onProgress) {
          const sec = parseInt(m[1], 10) / 1_000_000;
          const pct = Math.min(99, Math.round((sec / durationSec) * 100));
          onProgress(pct);
        }
      }
    });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

function buildArgs(opts: ExportOpts, encoder: H264Encoder | null): string[] {
  const { inputPath, outputPath, startSec, endSec, targetFps, isClipped } = opts;
  const args: string[] = ['-y'];

  // Input -ss does a fast seek (keyframe-snap, then -accurate_seek decodes &
  // discards up to position). After that, output timestamps are reset to 0 —
  // so the output-side -ss / -to below must be RELATIVE to the input seek
  // point, not the original timeline. Without this compensation the wrong
  // section of the video gets exported.
  const inputSs = isClipped ? Math.max(0, startSec - 2) : 0;
  const outSs = startSec - inputSs;
  const outTo = endSec - inputSs;

  if (isClipped) {
    args.push('-ss', inputSs.toString());
  }
  args.push('-i', inputPath);

  if (isClipped) {
    args.push('-ss', outSs.toString(), '-to', outTo.toString());
  }

  if (encoder === null) {
    args.push('-c', 'copy');
  } else {
    args.push('-r', targetFps.toString());
    args.push(...buildVideoEncoderArgs(encoder));
    args.push('-c:a', 'aac', '-ac', '2');
  }
  args.push('-progress', 'pipe:1', '-nostats');
  args.push(outputPath);
  return args;
}

export async function exportMp4(opts: ExportOpts): Promise<void> {
  const { startSec, endSec, targetFps, sourceFps, isClipped, onProgress } = opts;
  const durationSec = Math.max(0.001, endSec - startSec);
  const noReencode = Math.abs(targetFps - sourceFps) < 0.001 && !isClipped;

  if (noReencode) {
    await runFfmpegEncode(buildArgs(opts, null), durationSec, onProgress);
    onProgress?.(100);
    return;
  }

  const encoder = await detectH264Encoder();
  try {
    await runFfmpegEncode(buildArgs(opts, encoder), durationSec, onProgress);
  } catch (err) {
    if (encoder !== 'libx264') {
      console.warn(`[ffmpeg] ${encoder} failed, retrying with libx264:`, err);
      cachedEncoderPromise = Promise.resolve('libx264');
      await runFfmpegEncode(buildArgs(opts, 'libx264'), durationSec, onProgress);
    } else {
      throw err;
    }
  }
  onProgress?.(100);
}
