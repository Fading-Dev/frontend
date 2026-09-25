'use client';

import { useEffect, useRef, useState } from 'react';

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

type BarcodeDetectorCtor = new (options?: { formats: string[] }) => BarcodeDetectorLike;

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was denied. Allow camera permission in your browser, or enter the code manually.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. Enter the code manually instead.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is in use by another app. Close it and try again, or enter the code manually.';
  }
  return 'Could not start the camera. Enter the code manually instead.';
}

/** Live camera QR scanner. Calls onDetected once with the decoded text. */
export function QrScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;

    async function start() {
      if (!window.isSecureContext) {
        setError('Camera scanning needs a secure (HTTPS) connection. Enter the code manually instead.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser does not support camera access. Enter the code manually instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
        return;
      }
      const video = videoRef.current;
      if (cancelled || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        if (!cancelled) setError(cameraErrorMessage(null));
        return;
      }

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
        .BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      async function scan() {
        if (cancelled || !video) return;
        let text: string | null = null;
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
          try {
            if (detector) {
              text = (await detector.detect(video))[0]?.rawValue ?? null;
            } else if (jsQR && ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(img.data, img.width, img.height)?.data ?? null;
            }
          } catch {
            text = null;
          }
        }
        if (cancelled) return;
        if (text) {
          onDetectedRef.current(text);
          return;
        }
        frame = requestAnimationFrame(() => void scan());
      }
      void scan();
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {error}
      </p>
    );
  }

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      aria-label="Camera preview for scanning a ticket QR code"
      className="w-full rounded-lg border border-border bg-black"
    />
  );
}
