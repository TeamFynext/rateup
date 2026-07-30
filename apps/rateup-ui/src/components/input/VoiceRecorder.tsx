import WavesurferPlayer from "@wavesurfer/react";
import { Mic, Pause, Play, Square, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { deleteUploadedFiles, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { Button } from "../ui/button.tsx";
import CustomTooltip from "../ui/custom/CustomTooltip.tsx";

import classes from "./VoiceRecorder.module.css";

interface VoiceRecordState {
  isRecording: boolean;
  audioUrl: string | null;
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
  source: MediaStreamAudioSourceNode | null;
  chunks: Blob[];
  fileKey: string | null;
  setFileKey: (value: string | null) => void;
  setIsRecording: (value: boolean) => void;
  setAudioUrl: (value: string | null) => void;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  setStream: (stream: MediaStream | null) => void;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  setAudioContext: (context: AudioContext | null) => void;
  setSource: (source: MediaStreamAudioSourceNode | null) => void;
  setChunks: (chunks: Blob[]) => void;
  resetRecordingState: () => void;
}

const VoiceRecorder = () => {
  const {
    audioUrl,
    isRecording,
    setAudioUrl,
    setIsRecording,
    setMediaRecorder,
    setStream,
    setAnalyser,
    setAudioContext,
    setSource,
    setChunks,
    setFileKey,
    resetRecordingState,
  } = useVoiceRecordStore();

  const [wavesurfer, setWavesurfer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [barHeights, setBarHeights] = useState<number[]>([]);
  const animationRef = useRef<number | null>(null);

  const onReady = (ws: any) => {
    setWavesurfer(ws);
    setIsPlaying(false);
  };

  const onPlayPause = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  };

  const startRecording = async (): Promise<void> => {
    const supportedTypes = ["audio/aac", "audio/amr", "audio/mpeg", "audio/mp4", "audio/ogg"];
    const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      alert("None of the required audio formats are supported by this browser.");
      return;
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    setStream(newStream);

    const newAudioContext = new window.AudioContext();
    const newSource = newAudioContext.createMediaStreamSource(newStream);
    const newAnalyser = newAudioContext.createAnalyser();
    newAnalyser.fftSize = 64;

    newSource.connect(newAnalyser);

    setAudioContext(newAudioContext);
    setSource(newSource);
    setAnalyser(newAnalyser);

    const recorder = new MediaRecorder(newStream, { mimeType });
    setChunks([]);
    setMediaRecorder(recorder);

    function getAudioExtension(mimetype: string) {
      switch (mimetype) {
        case "audio/aac":
          return ".acc";
        case "audio/amr":
          return ".amr";
        case "audio/mpeg":
          return ".mp3";
        case "audio/mp4":
          return ".m4a";
        case "audio/ogg":
          return ".ogg";
      }
    }

    recorder.onstop = async () => {
      const { chunks } = useVoiceRecordStore.getState();
      const blob = new Blob(chunks, { type: mimeType });
      const file = new File([blob], `voice-${Date.now()}${getAudioExtension(mimeType)}`, {
        type: mimeType,
      });
      try {
        const key = await uploadFile(file);
        setFileKey(key);
        setAudioUrl(getFileUrlFromKey(key) ?? null);
      } catch (error) {
        console.error(error);
      }
    };

    recorder.ondataavailable = (e) => {
      setChunks([...useVoiceRecordStore.getState().chunks, e.data]);
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopAndReset = () => {
    const { stream } = useVoiceRecordStore.getState();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setBarHeights([]);
    resetRecordingState();
  };

  const stopRecording = () => {
    const { mediaRecorder } = useVoiceRecordStore.getState();
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }
    stopAndReset();
  };

  const stopAndUploadRecording = async () => {
    const { mediaRecorder } = useVoiceRecordStore.getState();
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    stopAndReset();
  };

  const deleteUploadedAudio = async () => {
    try {
      const { fileKey } = useVoiceRecordStore.getState();
      if (fileKey) {
        await deleteUploadedFiles({ fileKeyArray: [{ Key: fileKey }] });
      }
      stopAndReset();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const analyser = useVoiceRecordStore.getState().analyser;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      const scaled = Array.from(dataArray)
        .slice(0, 15)
        .map((v) => Math.max(4, (v / 255) * 40));
      setBarHeights(scaled);
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [useVoiceRecordStore.getState().analyser]);

  return (
    <div className="flex items-center gap-2">
      {audioUrl && (
        <div className="flex items-center gap-2">
          <CustomTooltip
            trigger={
              <Button onClick={onPlayPause} variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isPlaying ? <Pause /> : <Play />}
              </Button>
            }
            content={<p>{isPlaying ? "Pause" : "Play"}</p>}
          />

          <WavesurferPlayer
            url={audioUrl}
            height={20}
            width={80}
            waveColor="violet"
            onReady={onReady}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <p className="text-xs">
            {wavesurfer &&
              `${Math.floor(wavesurfer?.getDuration() / 60)}:${Math.floor(
                wavesurfer?.getDuration() % 60,
              )
                .toString()
                .padStart(2, "0")}`}
          </p>
        </div>
      )}

      {barHeights.length > 0 && (
        <div className={classes["bar-visualizer"]}>
          {barHeights.map((height, index) => (
            <div key={index} className={classes.bar} style={{ height: `${height}px` }} />
          ))}
        </div>
      )}

      {(isRecording || audioUrl) && (
        <CustomTooltip
          trigger={
            <Button
              onClick={async () => {
                if (isRecording) stopRecording();
                else await deleteUploadedAudio();
              }}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Trash className="text-red-500" />
            </Button>
          }
          content={<p>Delete</p>}
        />
      )}
      {!isRecording ? (
        <CustomTooltip
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={async () => {
                if (audioUrl) {
                  await deleteUploadedAudio();
                }
                startRecording();
              }}
            >
              <Mic />
            </Button>
          }
          content={<p>Record</p>}
        />
      ) : (
        <CustomTooltip
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={async () => await stopAndUploadRecording()}
            >
              <Square />
            </Button>
          }
          content={<p>Stop</p>}
        />
      )}
    </div>
  );
};

export const useVoiceRecordStore = create<VoiceRecordState>()(
  immer(
    (set): VoiceRecordState => ({
      isRecording: false,
      audioUrl: null,
      mediaRecorder: null,
      stream: null,
      analyser: null,
      audioContext: null,
      source: null,
      chunks: [],
      fileKey: null,
      setIsRecording: (value) => set({ isRecording: value }),
      setAudioUrl: (value) => set({ audioUrl: value }),
      setMediaRecorder: (recorder) => set({ mediaRecorder: recorder }),
      setStream: (stream) => set({ stream }),
      setAnalyser: (analyser) => set({ analyser }),
      setAudioContext: (context) => set({ audioContext: context }),
      setSource: (source) => set({ source }),
      setChunks: (chunks) => set({ chunks }),
      setFileKey: (value) => set({ fileKey: value }),
      resetRecordingState: () =>
        set({
          isRecording: false,
          audioUrl: null,
          mediaRecorder: null,
          stream: null,
          analyser: null,
          audioContext: null,
          source: null,
          chunks: [],
          fileKey: null,
        }),
    }),
  ),
);

export default VoiceRecorder;
