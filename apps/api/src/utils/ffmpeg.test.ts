import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { FfmpegError, runFfmpeg } from "./ffmpeg.js";

/** Runs the real bundled binary on a short silent WAV made here, so no fixture is needed. */

let dir: string;
let wav: string;

/** 16-bit mono PCM silence: a 44-byte header and zeroed samples. */
function silentWav(seconds: number, rate = 8000) {
  const data = Buffer.alloc(seconds * rate * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "rateup-ffmpeg-"));
  wav = path.join(dir, "in.wav");
  fs.writeFileSync(wav, silentWav(1));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("runFfmpeg", () => {
  test("converts audio to an OGG/Opus voice note", async () => {
    const out = path.join(dir, "voice.ogg");
    await runFfmpeg({
      input: wav,
      output: out,
      args: ["-c:a", "libopus", "-ac", "1", "-ar", "48000", "-b:a", "32k", "-f", "ogg"],
      timeoutSeconds: 30,
    });
    expect(fs.readFileSync(out).subarray(0, 4).toString()).toBe("OggS");
  });

  test("converts audio to AAC in M4A", async () => {
    const out = path.join(dir, "audio.m4a");
    await runFfmpeg({
      input: wav,
      output: out,
      args: ["-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart"],
      timeoutSeconds: 30,
    });
    expect(fs.readFileSync(out).subarray(4, 8).toString()).toBe("ftyp");
  });

  test("a bad input is an FfmpegError carrying ffmpeg's message", async () => {
    const err = await runFfmpeg({
      input: path.join(dir, "missing.wav"),
      output: path.join(dir, "never.ogg"),
      args: [],
      timeoutSeconds: 30,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FfmpegError);
    expect((err as FfmpegError).message).toMatch(/exited with code/);
    expect((err as FfmpegError).stderr).toMatch(/No such file/i);
  });
});
