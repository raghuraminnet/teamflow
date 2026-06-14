// src/mediasoup/index.ts — mediasoup worker + router setup (v3.x)

import { createWorker } from 'mediasoup';
import type { Worker, Router } from 'mediasoup/types';

let worker: Worker | null = null;
let router: Router | null = null;

export async function createMediasoupWorker() {
  worker = await createWorker({
    logLevel: 'warn',
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  router = await worker.createRouter({
    mediaCodecs: [
      // Audio codec — Opus (default for WebRTC)
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      // Fallback codecs
      { kind: 'audio', mimeType: 'audio/PCMU', clockRate: 8000, channels: 1 },
      { kind: 'audio', mimeType: 'audio/PCMA', clockRate: 8000, channels: 1 },
    ],
  });

  console.log('[mediasoup] Worker ready, router created');
  return { worker, router };
}

export function getMediasoupRouter(): Router | null { return router; }
export function getMediasoupWorker(): Worker | null { return worker; }