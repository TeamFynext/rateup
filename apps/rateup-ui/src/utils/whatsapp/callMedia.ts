/**
 * The browser half of a WhatsApp call: one RTCPeerConnection between this tab's microphone
 * and Meta's media servers. The API only relays SDP; audio never passes through RateUp.
 *
 * The Calling API takes one SDP per side and does no trickle ICE, so every description is
 * sent only once ICE gathering has finished — the candidates have to be inside it.
 *
 * There is at most one call per tab, so the connection lives at module scope rather than
 * in React state: it is not serialisable, and nothing should re-render because it changed.
 */

import { soundsPath } from "@/utils/constants.ts";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
/** Gathering normally completes in well under a second; past this, send what we have. */
const ICE_GATHER_TIMEOUT_MS = 3000;

let peer: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudio: HTMLAudioElement | null = null;

export type MediaState = "connecting" | "connected" | "failed";

function remoteAudioElement(): HTMLAudioElement {
  if (!remoteAudio) {
    remoteAudio = new Audio();
    remoteAudio.autoplay = true;
  }
  return remoteAudio;
}

async function openMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot use a microphone");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
}

function waitForIceGathering(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      connection.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (connection.iceGatheringState === "complete") done();
    };
    const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS);
    connection.addEventListener("icegatheringstatechange", onChange);
  });
}

async function openPeer(onState: (state: MediaState) => void): Promise<RTCPeerConnection> {
  closeCallMedia();
  localStream = await openMicrophone();
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  for (const track of localStream.getAudioTracks()) connection.addTrack(track, localStream);
  connection.ontrack = (event) => {
    const audio = remoteAudioElement();
    audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
    // Autoplay is allowed: the agent has clicked Answer or Call to get here.
    void audio.play().catch(() => undefined);
  };
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "connected") onState("connected");
    else if (connection.connectionState === "failed") onState("failed");
  };
  peer = connection;
  return connection;
}

function finishedDescription(connection: RTCPeerConnection): string {
  const sdp = connection.localDescription?.sdp;
  if (!sdp) throw new Error("The browser produced no session description");
  return sdp;
}

/** Inbound: answer the customer's offer. Returns the SDP answer to send to the API. */
export async function answerOffer(
  offerSdp: string,
  onState: (state: MediaState) => void,
): Promise<string> {
  const connection = await openPeer(onState);
  await connection.setRemoteDescription({ type: "offer", sdp: offerSdp });
  await connection.setLocalDescription(await connection.createAnswer());
  await waitForIceGathering(connection);
  return finishedDescription(connection);
}

/** Outbound: build the offer to dial with. The answer arrives later via `applyAnswer`. */
export async function createOffer(onState: (state: MediaState) => void): Promise<string> {
  const connection = await openPeer(onState);
  await connection.setLocalDescription(await connection.createOffer());
  await waitForIceGathering(connection);
  return finishedDescription(connection);
}

export async function applyAnswer(answerSdp: string): Promise<void> {
  if (!peer) throw new Error("No call is being dialled");
  await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
}

export function setMicrophoneMuted(muted: boolean): void {
  for (const track of localStream?.getAudioTracks() ?? []) track.enabled = !muted;
}

/** Stops the microphone and drops the connection. Safe to call when nothing is open. */
export function closeCallMedia(): void {
  for (const track of localStream?.getTracks() ?? []) track.stop();
  localStream = null;
  peer?.close();
  peer = null;
  if (remoteAudio) remoteAudio.srcObject = null;
}

/**
 * The ringtone, from the CDN's `sounds/` folder. Replace the file there to change it; no
 * code change or deploy needed.
 */
const RINGTONE_URL = `${soundsPath}/ringtune.mp3`;

let ringtone: HTMLAudioElement | null = null;
let ringing = false;
let retryOnGesture: (() => void) | null = null;
let loading: Promise<void> | null = null;

function ringtoneElement(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!ringtone) {
    ringtone = new Audio();
    ringtone.loop = true;
    ringtone.preload = "auto";
    // Full volume: a ring nobody hears is a missed customer.
    ringtone.volume = 1;
  }
  return ringtone;
}

/**
 * Fetch the ringtone, revalidating with the server every time.
 *
 * A file replaced on the CDN keeps its URL, so `new Audio(url)` happily went on playing
 * the browser's cached copy of the old one. `no-cache` asks the CDN first (a 304 when
 * nothing changed, so it costs almost nothing) and the bytes play from memory. The CDN
 * sends `Access-Control-Allow-Origin: *`, which this cross-origin fetch needs.
 */
function loadRingtone(audio: HTMLAudioElement): Promise<void> {
  loading ??= fetch(RINGTONE_URL, { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Ringtone request failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      audio.src = URL.createObjectURL(blob);
    })
    .catch(() => {
      // Ring with whatever the browser has rather than not at all; try again next time.
      loading = null;
      if (!audio.src) audio.src = RINGTONE_URL;
    });
  return loading;
}

let blockedListener: ((blocked: boolean) => void) | null = null;
let primed = false;

/** Told when the browser refuses to ring (no click on the page yet) and when it relents. */
export function onRingtoneBlockedChange(listener: (blocked: boolean) => void): void {
  blockedListener = listener;
}

/**
 * Fetch the ringtone ahead of time, so the first ring does not wait on the network, and
 * unlock it on the agent's first click or key press: a muted play-and-pause inside that
 * gesture is what lets the browser ring later with nobody touching the page.
 */
export function preloadRingtone(): void {
  const audio = ringtoneElement();
  if (!audio) return;
  void loadRingtone(audio);
  if (primed) return;
  const prime = () => {
    window.removeEventListener("pointerdown", prime);
    window.removeEventListener("keydown", prime);
    primed = true;
    if (ringing) return;
    audio.muted = true;
    void audio
      .play()
      .then(() => {
        if (ringing) return;
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => undefined)
      .finally(() => {
        audio.muted = false;
      });
  };
  window.addEventListener("pointerdown", prime, { passive: true });
  window.addEventListener("keydown", prime);
}

/** Start the ring from a click — the one thing a blocked browser always allows. */
export function retryRingtone(): void {
  if (ringing && ringtone) playRingtone(ringtone);
}

function clearGestureRetry() {
  if (!retryOnGesture) return;
  window.removeEventListener("pointerdown", retryOnGesture);
  window.removeEventListener("keydown", retryOnGesture);
  retryOnGesture = null;
}

/** Loop the ringtone while a call is waiting. */
export function startRinging(): void {
  const audio = ringtoneElement();
  if (!audio || ringing) return;
  ringing = true;
  void loadRingtone(audio).then(() => {
    if (!ringing) return;
    audio.currentTime = 0;
    playRingtone(audio);
  });
}

function playRingtone(audio: HTMLAudioElement) {
  audio.muted = false;
  audio.play().then(
    () => blockedListener?.(false),
    () => {
      // The browser blocks sound until the page has been clicked or typed in. Say so (the call
      // screen offers a button) and ring on the agent's first interaction anyway.
      blockedListener?.(true);
      clearGestureRetry();
      retryOnGesture = () => {
        clearGestureRetry();
        if (ringing) playRingtone(audio);
      };
      window.addEventListener("pointerdown", retryOnGesture, { passive: true });
      window.addEventListener("keydown", retryOnGesture);
    },
  );
}

export function stopRinging(): void {
  ringing = false;
  clearGestureRetry();
  blockedListener?.(false);
  if (!ringtone) return;
  ringtone.pause();
  ringtone.currentTime = 0;
}

// The socket handler and the media singletons are captured once per page: a hot update
// left them running the old code (the old ring kept playing after an edit). Any change
// here reloads the page instead.
import.meta.hot?.accept(() => window.location.reload());
