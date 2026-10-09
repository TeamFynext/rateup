import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { AppState, NativeModules } from "react-native";
import type InCallManagerType from "react-native-incall-manager";
import type { MediaStream, RTCPeerConnection } from "react-native-webrtc";

import { configurePlaybackAudioMode } from "@/utils/audio";

/**
 * Whether this build carries the calling native modules. They arrived after 1.2.7, and
 * `react-native-webrtc` throws the moment it is imported on a binary without them — which,
 * with the call screen mounted in the protected layout, would crash the whole app on an
 * older build that received this code as an over-the-air update. So both modules are loaded
 * lazily, and the calling UI hides itself when they are missing.
 */
export const callingSupported = Boolean(NativeModules.WebRTCModule && NativeModules.InCallManager);

function webrtc() {
  return require("react-native-webrtc") as typeof import("react-native-webrtc");
}

function inCall(): typeof InCallManagerType {
  return (require("react-native-incall-manager") as { default: typeof InCallManagerType }).default;
}

/**
 * The phone's half of a WhatsApp call: one RTCPeerConnection between the microphone and
 * Meta's media servers. The API only relays SDP; audio never passes through RateUp.
 *
 * The Calling API takes one SDP per side and does no trickle ICE, so every description is
 * sent only once ICE gathering has finished — the candidates have to be inside it.
 *
 * There is at most one call at a time, so the connection lives at module scope rather than
 * in React state. Remote audio plays on its own in react-native-webrtc; InCallManager puts
 * the phone in call mode (earpiece, proximity sensor, screen kept on) and routes to the
 * speaker on request.
 */

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
/** Gathering normally completes in well under a second; past this, send what we have. */
const ICE_GATHER_TIMEOUT_MS = 3000;

let peer: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;

export type MediaState = "connecting" | "connected" | "failed";

/**
 * RTCPeerConnection extends event-target-shim's EventTarget, but react-native-webrtc
 * publishes its typings without the shim's own (`lib/typescript/vendor` is not in the
 * package), so TypeScript cannot see `addEventListener` — which is there at runtime. This
 * names just the two methods used here instead of loosening the whole object.
 */
interface PeerEvents {
  addEventListener(
    type: "icegatheringstatechange" | "connectionstatechange",
    listener: () => void,
  ): void;
  removeEventListener(
    type: "icegatheringstatechange" | "connectionstatechange",
    listener: () => void,
  ): void;
}
const events = (connection: RTCPeerConnection) => connection as unknown as PeerEvents;

async function openMicrophone(): Promise<MediaStream> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) throw new Error("Allow microphone access to take calls");
  return webrtc().mediaDevices.getUserMedia({ audio: true, video: false });
}

function waitForIceGathering(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      events(connection).removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (connection.iceGatheringState === "complete") done();
    };
    const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS);
    events(connection).addEventListener("icegatheringstatechange", onChange);
  });
}

async function openPeer(onState: (state: MediaState) => void): Promise<RTCPeerConnection> {
  closeCallMedia();
  stopRinging();
  localStream = await openMicrophone();
  // Call mode: earpiece by default, screen off at the ear, audio session for voice.
  inCall().start({ media: "audio" });
  const { RTCPeerConnection: PeerConnection } = webrtc();
  const connection = new PeerConnection({ iceServers: ICE_SERVERS });
  for (const track of localStream.getAudioTracks()) connection.addTrack(track, localStream);
  events(connection).addEventListener("connectionstatechange", () => {
    if (connection.connectionState === "connected") onState("connected");
    else if (connection.connectionState === "failed") onState("failed");
  });
  peer = connection;
  return connection;
}

function finishedDescription(connection: RTCPeerConnection): string {
  const sdp = connection.localDescription?.sdp;
  if (!sdp) throw new Error("The phone produced no session description");
  return sdp;
}

/** Inbound: answer the customer's offer. Returns the SDP answer to send to the API. */
export async function answerOffer(
  offerSdp: string,
  onState: (state: MediaState) => void,
): Promise<string> {
  const connection = await openPeer(onState);
  await connection.setRemoteDescription(
    new (webrtc().RTCSessionDescription)({ type: "offer", sdp: offerSdp }),
  );
  await connection.setLocalDescription(await connection.createAnswer());
  await waitForIceGathering(connection);
  return finishedDescription(connection);
}

/** Outbound: build the offer to dial with. The answer arrives later via `applyAnswer`. */
export async function createOffer(onState: (state: MediaState) => void): Promise<string> {
  const connection = await openPeer(onState);
  await connection.setLocalDescription(await connection.createOffer({}));
  await waitForIceGathering(connection);
  return finishedDescription(connection);
}

export async function applyAnswer(answerSdp: string): Promise<void> {
  if (!peer) throw new Error("No call is being dialled");
  // Only a connection still waiting for its answer can take one. A second copy of the same
  // answer (a redelivered webhook, a reconnecting socket) arrives once the connection is
  // already "stable"; applying it throws, and that error used to hang the call up the
  // moment the customer picked up.
  if (peer.signalingState !== "have-local-offer") return;
  await peer.setRemoteDescription(
    new (webrtc().RTCSessionDescription)({ type: "answer", sdp: answerSdp }),
  );
}

export function setMicrophoneMuted(muted: boolean): void {
  for (const track of localStream?.getAudioTracks() ?? []) track.enabled = !muted;
}

export function setSpeakerOn(on: boolean): void {
  inCall().setForceSpeakerphoneOn(on);
}

/** Stops the microphone, drops the connection and leaves call mode. Safe when idle. */
export function closeCallMedia(): void {
  const hadCall = Boolean(peer || localStream);
  for (const track of localStream?.getTracks() ?? []) track.stop();
  localStream?.release();
  localStream = null;
  peer?.close();
  peer = null;
  if (hadCall) {
    inCall().stop();
    // Back to plain playback, so voice notes and videos play through the speaker again.
    void configurePlaybackAudioMode();
  }
}

/* -------------------------------------------------------------- ringtone */

let ringtone: AudioPlayer | null = null;
let ringing = false;

function ringtonePlayer(): AudioPlayer {
  if (!ringtone) {
    ringtone = createAudioPlayer(require("@/assets/sounds/ringtone.mp3"));
    ringtone.loop = true;
    // Full volume: a ring nobody hears is a missed customer.
    ringtone.volume = 1;
  }
  return ringtone;
}

/** Loop the ringtone while a call waits. Plays even with the ring/silent switch on silent. */
export function startRinging(): void {
  if (ringing) return;
  // In the background the phone's own call surface rings (Android's call notification,
  // CallKit); the app picks the ring up when it comes back to the foreground.
  if (AppState.currentState !== "active") return;
  ringing = true;
  void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })
    .catch(() => undefined)
    .then(() => {
      if (!ringing) return;
      const player = ringtonePlayer();
      player.seekTo(0).catch(() => undefined);
      player.play();
    });
}

export function stopRinging(): void {
  ringing = false;
  if (!ringtone) return;
  ringtone.pause();
  void ringtone.seekTo(0).catch(() => undefined);
}
