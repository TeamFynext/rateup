import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  AlertCircle,
  ChevronLeft,
  ChevronUp,
  Lock,
  Mic,
  Pause,
  Play,
  Trash2,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { Toast } from "@/components/common/Notice";
import { configurePlaybackAudioMode, configureRecordingAudioMode } from "@/utils/audio";
import { logger } from "@/utils/logger";

/** Speech, not music: mono AAC at 64 kbps is a quarter of the high-quality preset's size. */
const VOICE_NOTE_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};

/** How far the finger travels, in points, to cancel (left) or lock (up), as in WhatsApp. */
const CANCEL_DISTANCE = 110;
const LOCK_DISTANCE = 80;
/** A hold shorter than this was a tap: WhatsApp answers it with a tip, not a recording. */
const MIN_DURATION_MS = 1000;
const WAVE_BARS = 32;

/**
 * - `starting`: finger down, microphone opening.
 * - `holding`: recording while held; release stops, slide left cancels, slide up locks.
 * - `locked`: recording hands-free (after a tap); tap stop to review.
 * - `review`: stopped and uploading in the background; listen back, then send or delete.
 * - `sending`: waiting for the upload, then sending.
 */
type Phase = "idle" | "starting" | "holding" | "locked" | "review" | "sending";

export type VoiceNoteFile = { uri: string; durationMs: number };

/** dBFS from the recorder's meter as a bar height between 0.08 and 1. */
function levelFromDb(db?: number) {
  if (db === undefined || !Number.isFinite(db)) return 0.08;
  return Math.max(0.08, Math.min(1, (db + 55) / 55));
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Averages `levels` into `count` bars, so a long recording's whole shape fits. */
function downsample(levels: number[], count: number) {
  if (levels.length <= count) return levels;
  const size = levels.length / count;
  return Array.from({ length: count }, (_, i) => {
    const slice = levels.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    return slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length);
  });
}

/** One background upload of a recording, so Send has the S3 key ready. */
type UploadJob = {
  promise: Promise<string | null>;
  key: string | null;
  failed: boolean;
  /** Deleted or abandoned before the upload finished: its file is removed when it lands. */
  cancelled: boolean;
};

/**
 * The voice note, as state and gestures. Tap the mic to record hands-free, or hold it
 * (slide left to cancel). Stopping, by tapping stop or releasing a hold, uploads the
 * recording straight away and shows it for review; Send then sends the uploaded file.
 * `upload` returns the S3 key, `deliver` sends it, and `removeUpload` deletes an
 * uploaded file the agent threw away.
 */
export function useVoiceNote({
  upload,
  deliver,
  removeUpload,
}: {
  upload: (file: VoiceNoteFile) => Promise<string>;
  deliver: (key: string) => void;
  removeUpload: (key: string) => void;
}) {
  const recorder = useAudioRecorder(VOICE_NOTE_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 80);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [levels, setLevels] = useState<number[]>([]);
  const [review, setReview] = useState<VoiceNoteFile | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "failed">("idle");
  const phaseRef = useRef<Phase>("idle");
  const uploadRef = useRef<UploadJob | null>(null);
  const fingerDown = useRef(false);
  const slideX = useSharedValue(0);
  const slideY = useSharedValue(0);

  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  // One waveform bar per meter reading while the microphone is live.
  const recording = phase === "holding" || phase === "locked";
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      setLevels((prev) => [...prev, levelFromDb(recorder.getStatus().metering)]);
    }, 80);
    return () => clearInterval(timer);
  }, [recording, recorder]);

  const resetGesture = () => {
    slideX.value = withSpring(0);
    slideY.value = withSpring(0);
  };

  const stopRecorder = async (): Promise<VoiceNoteFile | null> => {
    const durationMs = recorderState.durationMillis;
    try {
      await recorder.stop();
    } catch (err) {
      logger.error("voice note stop failed:", err);
    }
    // Back to playback before anything else plays: a stopped recorder leaves iOS in
    // `.playAndRecord`, which silences voice-note playback.
    await configurePlaybackAudioMode();
    return recorder.uri ? { uri: recorder.uri, durationMs } : null;
  };

  const startUpload = (file: VoiceNoteFile) => {
    setUploadState("uploading");
    const job: UploadJob = {
      promise: Promise.resolve(null),
      key: null,
      failed: false,
      cancelled: false,
    };
    job.promise = upload(file).then(
      (key) => {
        if (job.cancelled) {
          removeUpload(key);
          return null;
        }
        job.key = key;
        setUploadState("done");
        return key;
      },
      (err) => {
        logger.error("voice note upload failed:", err);
        job.failed = true;
        if (!job.cancelled) setUploadState("failed");
        return null;
      },
    );
    uploadRef.current = job;
  };

  /** Throws the upload away, deleting its file if it already reached S3. */
  const dropUpload = () => {
    const job = uploadRef.current;
    uploadRef.current = null;
    if (!job) return;
    job.cancelled = true;
    if (job.key) removeUpload(job.key);
  };

  const discard = async () => {
    if (phaseRef.current === "holding" || phaseRef.current === "locked") await stopRecorder();
    dropUpload();
    setUploadState("idle");
    setReview(null);
    setLevels([]);
    resetGesture();
    setPhase("idle");
  };

  /** Stops recording, starts the upload and shows the recording for review. */
  const stop = async () => {
    if (phaseRef.current !== "holding" && phaseRef.current !== "locked") return;
    const file = await stopRecorder();
    resetGesture();
    if (!file) {
      setPhase("idle");
      return;
    }
    setReview(file);
    setPhase("review");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    startUpload(file);
  };

  const begin = async () => {
    setPhase("starting");
    try {
      // Asked for outside the hold: the system prompt takes the finger off the button,
      // so the first tap only grants access and the next one records.
      if (!(await getRecordingPermissionsAsync()).granted) {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) Toast.info("Allow microphone access in Settings to record voice notes.");
        setPhase("idle");
        return;
      }
      await configureRecordingAudioMode();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      logger.error("voice note start failed:", err);
      Toast.error("Could not start recording.");
      setPhase("idle");
      return;
    }
    setLevels([]);
    setPhase("holding");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Let go while the microphone was still opening: that was a tap.
    if (!fingerDown.current) await release();
  };

  const cancel = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await discard();
  };

  /** Recording carries on hands-free: after a tap, or a hold slid up to the lock. */
  const lock = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetGesture();
    setPhase("locked");
  };

  const release = async () => {
    if (phaseRef.current !== "holding") return;
    // A tap, not a hold: keep recording until stop is tapped.
    if (recorderState.durationMillis < MIN_DURATION_MS) {
      lock();
      return;
    }
    await stop();
  };

  /** Sends the reviewed recording, waiting for its upload, or retrying one that failed. */
  const send = async () => {
    if (phaseRef.current !== "review" || !review) return;
    setPhase("sending");
    if (!uploadRef.current || uploadRef.current.failed) startUpload(review);
    const job = uploadRef.current!;
    const key = job.key ?? (await job.promise);
    // The upload failed (its error is already shown): keep the recording to try again.
    if (!key || uploadRef.current !== job) {
      // Read after the await, when it may have moved on (TypeScript still narrows it).
      if ((phaseRef.current as Phase) === "sending") setPhase("review");
      return;
    }
    try {
      deliver(key);
    } catch (err) {
      logger.error("voice note send failed:", err);
      Toast.error("Voice note not sent. Please try again.");
      setPhase("review");
      return;
    }
    uploadRef.current = null;
    setUploadState("idle");
    setReview(null);
    setLevels([]);
    setPhase("idle");
  };

  // The gesture handlers are created once, so they reach the current closures through a ref.
  const handlers = useRef({ begin, cancel, lock, release, dropUpload });
  useLayoutEffect(() => {
    handlers.current = { begin, cancel, lock, release, dropUpload };
  });

  // `PanResponder.create` only stores these callbacks; the refs are read on touch events,
  // never during render, which the compiler cannot see through the call.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === "idle",
      onMoveShouldSetPanResponder: () => phaseRef.current === "holding",
      // A scroll or the keyboard must not take the finger away mid-recording.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        fingerDown.current = true;
        void handlers.current.begin();
      },
      onPanResponderMove: (_, g) => {
        if (phaseRef.current !== "holding") return;
        slideX.value = Math.min(0, g.dx);
        slideY.value = Math.min(0, g.dy);
        if (g.dx < -CANCEL_DISTANCE) void handlers.current.cancel();
        else if (g.dy < -LOCK_DISTANCE) handlers.current.lock();
      },
      onPanResponderRelease: () => {
        fingerDown.current = false;
        void handlers.current.release();
      },
      onPanResponderTerminate: () => {
        fingerDown.current = false;
        void handlers.current.release();
      },
    }),
  );

  // Leaving the chat drops an unsent recording: the mic is given back, and a file already
  // uploaded for it is deleted.
  useEffect(
    () => () => {
      if (phaseRef.current === "holding" || phaseRef.current === "locked") {
        void configurePlaybackAudioMode();
      }
      handlers.current.dropUpload();
    },
    [],
  );

  return {
    phase,
    levels,
    review,
    uploading: uploadState === "uploading",
    uploadFailed: uploadState === "failed",
    durationMs:
      phase === "review" || phase === "sending"
        ? (review?.durationMs ?? 0)
        : recorderState.durationMillis,
    slideX,
    slideY,
    panHandlers: panResponder.panHandlers,
    discard,
    stop,
    send,
  };
}

export type VoiceNote = ReturnType<typeof useVoiceNote>;

/** The mic that takes the place of Send while the composer is empty. Hold it to record. */
export function VoiceNoteMic({ voice }: { voice: VoiceNote }) {
  const holding = voice.phase === "holding" || voice.phase === "starting";
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: voice.slideX.value }, { scale: withSpring(holding ? 1.5 : 1) }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: voice.slideY.value * 0.6 }],
    opacity: holding ? withTiming(1) : withTiming(0),
  }));

  return (
    <View style={{ width: 42, height: 42 }}>
      <Animated.View
        pointerEvents="none"
        className="absolute items-center rounded-full py-2"
        style={[
          { bottom: 64, left: 5, width: 32, backgroundColor: "rgba(0,0,0,0.6)", gap: 2 },
          lockStyle,
        ]}
      >
        <Lock size={14} color="#fff" />
        <ChevronUp size={14} color="#fff" />
      </Animated.View>
      <Animated.View
        {...voice.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Record voice note"
        accessibilityHint="Tap to record, or hold to record while held"
        style={[
          {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: holding ? "#E5484D" : Colors.brand.blue,
            alignItems: "center",
            justifyContent: "center",
          },
          micStyle,
        ]}
      >
        <Mic size={19} color="#fff" />
      </Animated.View>
    </View>
  );
}

/** What stands in for the text box while a voice note is recorded, reviewed or sent. */
export function VoiceNoteBar({ voice, isDark }: { voice: VoiceNote; isDark: boolean }) {
  const t = isDark ? Colors.dark : Colors.light;
  const box = {
    flex: 1,
    minHeight: 44,
    borderRadius: 24,
    paddingHorizontal: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: isDark ? Colors.dark.inputBg : Colors.light.inputBg,
  };

  if (voice.phase === "sending") {
    return (
      <View style={box}>
        <ActivityIndicator size="small" color={t.textMuted} />
        <Text style={{ color: t.textMuted, fontSize: 14 }}>Sending voice note…</Text>
      </View>
    );
  }

  if (voice.phase === "review" && voice.review) {
    return <ReviewBar voice={voice} isDark={isDark} box={box} />;
  }

  const locked = voice.phase === "locked";
  return (
    <View style={box}>
      {locked && (
        <Pressable onPress={voice.discard} hitSlop={8} accessibilityLabel="Delete voice note">
          <Trash2 size={19} color={t.textMuted} />
        </Pressable>
      )}
      <RecordingDot />
      <Text style={{ color: t.textPrimary, fontVariant: ["tabular-nums"], fontSize: 15 }}>
        {formatDuration(voice.durationMs)}
      </Text>
      {/* Locked: the button beside the bar is the stop button. */}
      {locked ? (
        <Waveform levels={voice.levels.slice(-WAVE_BARS)} color={t.textMuted} />
      ) : (
        <SlideToCancel voice={voice} color={t.textMuted} />
      )}
    </View>
  );
}

function ReviewBar({ voice, isDark, box }: { voice: VoiceNote; isDark: boolean; box: object }) {
  const t = isDark ? Colors.dark : Colors.light;
  const player = useAudioPlayer({ uri: voice.review!.uri });
  const status = useAudioPlayerStatus(player);
  const bars = downsample(voice.levels, WAVE_BARS);
  const progress = status.duration ? status.currentTime / status.duration : 0;

  const toggle = () => {
    if (status.playing) return player.pause();
    if (status.duration && status.currentTime >= status.duration - 0.1) player.seekTo(0);
    player.play();
  };

  return (
    <View style={box}>
      <Pressable onPress={voice.discard} hitSlop={8} accessibilityLabel="Delete voice note">
        <Trash2 size={19} color={t.textMuted} />
      </Pressable>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityLabel={status.playing ? "Pause" : "Play voice note"}
      >
        {status.playing ? (
          <Pause size={20} color={t.textPrimary} />
        ) : (
          <Play size={20} color={t.textPrimary} />
        )}
      </Pressable>
      <Waveform
        levels={bars}
        color={t.textMuted}
        activeColor={Colors.brand.blue}
        progress={progress}
      />
      <Text style={{ color: t.textMuted, fontVariant: ["tabular-nums"], fontSize: 13 }}>
        {formatDuration(status.playing ? status.currentTime * 1000 : voice.durationMs)}
      </Text>
      {/* Upload status: a spinner while it goes up to S3, a warning if it failed (Send retries). */}
      {voice.uploading ? (
        <ActivityIndicator size="small" color={t.textMuted} accessibilityLabel="Uploading" />
      ) : voice.uploadFailed ? (
        <AlertCircle
          size={16}
          color="#E5484D"
          accessibilityLabel="Upload failed, tap send to retry"
        />
      ) : null}
    </View>
  );
}

function SlideToCancel({ voice, color }: { voice: VoiceNote; color: string }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: voice.slideX.value * 0.5 }],
    opacity: 1 + voice.slideX.value / CANCEL_DISTANCE,
  }));
  return (
    <Animated.View
      style={[
        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
        style,
      ]}
    >
      <ChevronLeft size={16} color={color} />
      <Text style={{ color, fontSize: 14 }}>Slide to cancel</Text>
    </Animated.View>
  );
}

function RecordingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.2, { duration: 600 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#E5484D" }, style]}
    />
  );
}

function Waveform({
  levels,
  color,
  activeColor,
  progress = 0,
}: {
  levels: number[];
  color: string;
  activeColor?: string;
  progress?: number;
}) {
  return (
    <View style={{ flex: 1, height: 26, flexDirection: "row", alignItems: "center", gap: 2 }}>
      {levels.map((level, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            maxWidth: 3,
            height: Math.max(3, level * 26),
            borderRadius: 1.5,
            backgroundColor: activeColor && i / levels.length < progress ? activeColor : color,
          }}
        />
      ))}
    </View>
  );
}
