"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Camera QR scanning for the check-in console.
 *
 * Choices that keep this reliable rather than clever:
 *
 * - **jsQR decodes locally, on a canvas frame.** No third-party camera service,
 *   no upload, nothing leaves the device, and it works in every current browser —
 *   unlike the native `BarcodeDetector`, which is still missing on Firefox and on
 *   iOS Safari.
 * - **The camera is opt-in.** A `getUserMedia` prompt needs a user gesture, and an
 *   insecure context blocks it outright (`http://` on a LAN address), so a button
 *   starts the camera and every failure path ends back on the manual ticket-ID box.
 *   Manual entry is never disabled and never depends on this component working.
 * - **The stream is always stopped.** Tracks are stopped explicitly so the camera
 *   light goes out when scanning stops, the page unmounts, or the route changes.
 *
 * Decoding samples the video on a timer instead of chaining
 * `requestAnimationFrame`. The camera delivers frames on its own schedule, and
 * roughly eight decoded samples a second is more than enough for a printed QR code
 * — with none of the self-referencing loop bookkeeping.
 *
 * The decoded text is handed back verbatim. Deciding what a payload means is the
 * server's job (`src/server/checkin/checkin.ts`), so the browser never parses a
 * ticket token.
 */

/** Frames are downscaled to this width before decoding: fast, and plenty for a QR. */
const DECODE_WIDTH = 480;

/** Roughly eight decoded samples per second. */
const SCAN_INTERVAL_MS = 120;

/** Ignore further codes for this long after a hit, so one ticket is not scanned twice. */
const RESCAN_COOLDOWN_MS = 2500;

/** `HTMLMediaElement.HAVE_CURRENT_DATA`: the frame has dimensions and can be drawn. */
const HAVE_CURRENT_DATA = 2;

export type QrScannerProps = {
  /** Called once per accepted code. The caller decides what to do with it. */
  onDetect: (payload: string) => void;
  /** Set while a scan is being processed, so no second code is read mid-request. */
  disabled?: boolean;
};

type CameraState = "idle" | "starting" | "scanning" | "error";

export function QrScanner({ onDetect, disabled = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldownUntilRef = useRef(0);
  const detectRef = useRef(onDetect);
  const pausedRef = useRef(disabled);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs, so the sampling timer never needs tearing down and restarting just
  // because the parent re-rendered.
  useEffect(() => {
    detectRef.current = onDetect;
  }, [onDetect]);

  // The console owns this: while a scan request is in flight no new code is
  // accepted, so a slow network cannot admit two people from one frame.
  useEffect(() => {
    pausedRef.current = disabled;
  }, [disabled]);

  const releaseStream = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    releaseStream();
    setCameraState("idle");
  }, [releaseStream]);

  /** Decodes one sampled frame and reports a code if one is present. */
  const sampleFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < HAVE_CURRENT_DATA || video.videoWidth === 0) {
      return;
    }

    const width = Math.min(DECODE_WIDTH, video.videoWidth);
    const height = (video.videoHeight * width) / video.videoWidth;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (height <= 0 || !context) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const code = jsQR(context.getImageData(0, 0, width, height).data, width, height, {
      inversionAttempts: "attemptBoth",
    });

    if (!code?.data || pausedRef.current || Date.now() < cooldownUntilRef.current) {
      return;
    }

    cooldownUntilRef.current = Date.now() + RESCAN_COOLDOWN_MS;
    detectRef.current(code.data);
  }, []);

  // Runs on unmount too, so navigating away releases the camera.
  useEffect(() => stopCamera, [stopCamera]);

  // Sampling only exists while the camera is actually running.
  useEffect(() => {
    if (cameraState !== "scanning") {
      return;
    }

    const timer = setInterval(sampleFrame, SCAN_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [cameraState, sampleFrame]);

  const startCamera = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setError(
        "This browser cannot open a camera here. Use the ticket ID box instead — it works exactly the same way.",
      );
      return;
    }

    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("scanning");
    } catch {
      // A rejected permission prompt and a missing camera are the same problem to
      // the person at the door: use the manual box.
      releaseStream();
      setCameraState("error");
      setError(
        "Camera access was blocked. Allow the camera in your browser, or check in with the ticket ID box below.",
      );
    }
  }, [releaseStream]);

  const isScanning = cameraState === "scanning";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
        {/* Always mounted so the stream can attach without a remount. */}
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="QR scanner preview"
          className={`aspect-square w-full object-cover ${isScanning ? "" : "hidden"}`}
        />

        {!isScanning ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium">Camera scanner</p>
            <p className="text-xs text-muted-foreground">
              Point the camera at an attendee&apos;s QR code. Nothing is recorded or uploaded — the
              code is decoded in this browser and only the ticket token is sent.
            </p>
          </div>
        ) : null}

        {/* Offscreen decode target; the browser only ever draws into it. */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {isScanning ? (
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            disabled={disabled || cameraState === "starting"}
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
          >
            {cameraState === "starting" ? "Opening camera…" : "Start camera"}
          </button>
        )}

        <span className="text-xs text-muted-foreground">
          {isScanning
            ? "Scanning. A code is ignored briefly after a hit so one ticket is not admitted twice."
            : "Manual ticket ID below always works, camera or not."}
        </span>
      </div>
    </div>
  );
}