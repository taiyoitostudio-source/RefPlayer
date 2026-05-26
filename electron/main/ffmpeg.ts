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

export async function exportMp4(opts: ExportOpts): Promise<void> {
  const { inputPath, outputPath, startSec, endSec, targetFps, sourceFps, isClipped, onProgress } = opts;
  const durationSec = Math.max(0.001, endSec - startSec);

  const noReencode = Math.abs(targetFps - sourceFps) < 0.001 && !isClipped;

  const args: string[] = ['-y'];
  if (isClipped) {
    args.push('-ss', startSec.toString(), '-to', endSec.toString());
  }
  args.push('-i', inputPath);

  if (noReencode) {
    args.push('-c', 'copy');
  } else {
    args.push('-r', targetFps.toString());
    args.push('-threads', '2');
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23');
    args.push('-c:a', 'aac', '-ac', '2');
  }
  args.push('-progress', 'pipe:1', '-nostats');
  args.push(outputPath);

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
      if (code === 0) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
      }
    });
  });
}
