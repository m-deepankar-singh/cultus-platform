/**
 * Browser compatibility and utility functions for audio processing
 */

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const audioContextMap: Map<string, AudioContext> = new Map();

export const audioContext: (
  options?: GetAudioContextOptions
) => Promise<AudioContext> = (() => {
  let didInteract: Promise<void> | null = null;

  const ensureUserInteraction = (): Promise<void> => {
    if (!isBrowser()) {
      return Promise.resolve();
    }
    
    if (!didInteract) {
      didInteract = new Promise((res) => {
        const handleInteraction = () => res();
        window.addEventListener("pointerdown", handleInteraction, { once: true });
        window.addEventListener("keydown", handleInteraction, { once: true });
      });
    }
    return didInteract;
  };

  return async (options?: GetAudioContextOptions) => {
    if (!isBrowser()) {
      throw new Error('AudioContext is only available in browser environment');
    }

    try {
      const a = new Audio();
      a.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      await a.play();
      if (options?.id && audioContextMap.has(options.id)) {
        const ctx = audioContextMap.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        audioContextMap.set(options.id, ctx);
      }
      return ctx;
    } catch (e) {
      await ensureUserInteraction();
      if (options?.id && audioContextMap.has(options.id)) {
        const ctx = audioContextMap.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        audioContextMap.set(options.id, ctx);
      }
      return ctx;
    }
  };
})();

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof window === 'undefined') {
    throw new Error('base64ToArrayBuffer can only be used in browser environment');
  }
  
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Create audio context safely
 */
export async function createAudioContext(options?: AudioContextOptions): Promise<AudioContext> {
  if (!isBrowser()) {
    throw new Error('AudioContext is only available in browser environment');
  }
  
  return audioContext(options);
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  if (typeof window === 'undefined') {
    throw new Error('arrayBufferToBase64 is only available in the browser');
  }
  
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
} 