import { spawn } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

/**
 * Runs the bundled ffmpeg binary on one input and one output.
 *
 * Replaces fluent-ffmpeg (deprecated, unmaintained): the uploads only ever run a few fixed
 * conversions, so the arguments are written out by the caller. They go to `spawn` as an
 * array with no shell, so nothing in a path or option can be read as a command.
 */

export class FfmpegError extends Error {
  constructor(
    message: string,
    /** The last lines ffmpeg wrote to stderr, for the log. */
    readonly stderr: string,
  ) {
    super(message);
    this.name = "FfmpegError";
  }
}

/** Keeps the end of stderr only: ffmpeg's error is the last thing it prints. */
const STDERR_TAIL = 4000;

export function runFfmpeg({
  input,
  output,
  args,
  timeoutSeconds,
}: {
  input: string;
  output: string;
  /** Codec, filter and format options, placed between the input and the output. */
  args: string[];
  timeoutSeconds: number;
}): Promise<void> {
  const argv = [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-y",
    "-i",
    input,
    ...args,
    output,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegInstaller.path, argv, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let timedOut = false;

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-STDERR_TAIL);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutSeconds * 1000);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new FfmpegError(`ffmpeg could not start: ${err.message}`, stderr));
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      const why = timedOut
        ? `timed out after ${timeoutSeconds}s`
        : signal
          ? `was killed by ${signal}`
          : `exited with code ${code}`;
      reject(new FfmpegError(`ffmpeg ${why}`, stderr.trim()));
    });
  });
}
