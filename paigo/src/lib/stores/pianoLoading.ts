import { writable } from 'svelte/store';

export type PianoLoadingState = {
  loading: boolean;
  message?: string;
  needsUnlock?: boolean;
  onUnlock?: (() => void) | undefined;
};

export const pianoLoading = writable<PianoLoadingState>({
  loading: false,
  message: 'Loading piano sound...',
  needsUnlock: false,
  onUnlock: undefined,
});

export function showPianoLoading(message = 'Loading piano sound...') {
  pianoLoading.set({ loading: true, message, needsUnlock: false, onUnlock: undefined });
}

export function hidePianoLoading() {
  pianoLoading.set({ loading: false, message: '', needsUnlock: false, onUnlock: undefined });
}

export function requirePianoUserGesture(onUnlock?: () => void) {
  pianoLoading.update((s) => ({ ...s, needsUnlock: true, onUnlock }));
}

export function clearPianoUserGesture() {
  pianoLoading.update((s) => ({ ...s, needsUnlock: false, onUnlock: undefined }));
}
