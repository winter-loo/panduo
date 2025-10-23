<script lang="ts">
  import PianoKey from '$lib/components/piano-key/piano-key.svelte';
  import type {
    PianoKeyProps,
    PianoKeyName,
    PianoKeyFullName,
    PianoPluginNameOptions,
  } from '$lib/components/piano-key/piano-key.svelte';
  import { MovableElement } from '$lib/movable';
  import { noteCoordinator } from '$lib/note-events/noteCoordinator';
  import type { NoteEventType, RoutedNoteEvent } from '$lib/note-events/types';
  import { getPcKeyboard } from '$lib/PcKeyboard';
  import { pianoLoading } from '$lib/stores/pianoLoading';
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  export const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  const numPianoKeys = 52;
  const pianoKeyRefs = new Map<string, PianoKey>();
  const PIANO_UI_SOURCE_ID = 'piano-ui';

  let middleKey = $state<HTMLElement | null>(null);
  let windowWidth = $state(960);
  let offsetX = $state(-144);
  let keyboardWidth = $state(960);
  let currentKeys = $state<string[]>([]);
  const movable = new MovableElement(0);

  type AlignMode = 'left' | 'middle' | 'right';

  type PianoKeyboardProps = {
    middleKeyName?: { name: PianoKeyName; octave: number };
    groupGap?: string;
    align?: AlignMode;
  };

  let {
    middleKeyName = { name: 'C', octave: 4 },
    groupGap = 'w-6',
    align = 'middle',
  }: PianoKeyboardProps = $props();

  let pianoKeys: PianoKeyProps[] = [];
  let octave = 0;

  type PluginOptions = {
    highlight: boolean[];
  };
  let pluginOptions = new SvelteMap<string, PluginOptions>();
  let stopLoadingAnimation: (() => void) | null = null;
  let wasLoading = false;
  let completionRelease: number | null = null;
  let completionNoteActive = false;

  for (let i = 0; i < numPianoKeys; i++) {
    const name = TemplateKeys[i % TemplateKeys.length];
    if (name === 'C') {
      octave += 1;
    }
    pianoKeys.push({
      name,
      octave,
      hideBlack: i + 1 == numPianoKeys,
    });
    pluginOptions.set(`${name}${octave}`, {
      highlight: [false, false],
    });
  }

  $effect(() => {
    const maxOffset = Math.max(0, keyboardWidth - windowWidth);
    movable.maxOffsetX = maxOffset;
    if (movable.currentOffsetX > maxOffset) {
      movable.moveTo(maxOffset, 0, false);
    }
  });

  $effect(() => {
    if (middleKey) {
      const extra = 16;
      const middleKeyOffsetLeft = middleKey.offsetLeft;
      const middleKeyWidth = middleKey.offsetWidth;
      // compute how far we need to shift the rail so the chosen key sits at the viewport center:
      // (windowWidth / 2) gives the viewport midpoint, subtracting the key's midpoint gives
      // a signed offset; negative means slide the keyboard left. We then clamp that offset
      // into [-movable.maxOffsetX, 0] so we never go past either rail limit.
      let computedOffset = 0;
      if (align == 'middle') {
        computedOffset = windowWidth / 2 - middleKeyOffsetLeft - middleKeyWidth / 2;
      } else if (align == 'left') {
        computedOffset = -middleKey.offsetLeft + extra;
      } else if (align == 'right') {
        computedOffset = windowWidth - middleKeyOffsetLeft - middleKeyWidth - extra;
      }
      const minOffset = -movable.maxOffsetX;
      const clampedOffset = Math.max(minOffset, Math.min(0, computedOffset));
      offsetX = clampedOffset;
      movable.moveTo(-clampedOffset);
    }
  });

  function emitPianoUiEvent(type: NoteEventType, note: PianoKeyFullName) {
    const normalized = {
      note: note.sharp ? `${note.name}#` : note.name,
      octave: note.octave,
      sharp: note.sharp,
      sourceId: PIANO_UI_SOURCE_ID,
      sourceRole: 'sub' as const,
    };
    if (type === 'noteon') {
      noteCoordinator.emitNoteOn(normalized);
    } else {
      noteCoordinator.emitNoteOff(normalized);
    }
  }

  function onnoteon(note: PianoKeyFullName) {
    emitPianoUiEvent('noteon', note);
  }

  function onnoteoff(note: PianoKeyFullName) {
    emitPianoUiEvent('noteoff', note);
  }

  type PluginStyle = { bg: string; border: string; text: string };

  // 1st is the white key plugin style
  // 2nd is the black key plugin style
  const pianoKeyHighlights: Record<string, PluginStyle[]> = {
    C: [
      {
        text: 'text-[var(--note-c)]',
        bg: 'bg-[var(--note-c)]/20',
        border: 'bg-[var(--note-c)]/20',
      },
      {
        text: 'text-[var(--note-c-300)]',
        bg: 'bg-[var(--note-c-300)]/20',
        border: 'bg-[var(--note-c-300)]/20',
      },
    ],
    D: [
      {
        text: 'text-[var(--note-d)]',
        bg: 'bg-[var(--note-d)]/20',
        border: 'bg-[var(--note-d)]/20',
      },
      {
        text: 'text-[var(--note-d-300)]',
        bg: 'bg-[var(--note-d-300)]/20',
        border: 'bg-[var(--note-d-300)]/20',
      },
    ],
    E: [
      {
        text: 'text-[var(--note-e)]',
        bg: 'bg-[var(--note-e)]/20',
        border: 'bg-[var(--note-e)]/20',
      },
      {
        text: 'text-[var(--note-e-300)]',
        bg: 'bg-[var(--note-e-300)]/20',
        border: 'bg-[var(--note-e-300)]/20',
      },
    ],
    F: [
      {
        text: 'text-[var(--note-f)]',
        bg: 'bg-[var(--note-f)]/20',
        border: 'bg-[var(--note-f)]/20',
      },
      {
        text: 'text-[var(--note-f-300)]',
        bg: 'bg-[var(--note-f-300)]/20',
        border: 'bg-[var(--note-f-300)]/20',
      },
    ],
    G: [
      {
        text: 'text-[var(--note-g)]',
        bg: 'bg-[var(--note-g)]/20',
        border: 'bg-[var(--note-g)]/20',
      },
      {
        text: 'text-[var(--note-g-300)]',
        bg: 'bg-[var(--note-g-300)]/20',
        border: 'bg-[var(--note-g-300)]/20',
      },
    ],
    A: [
      {
        text: 'text-[var(--note-a)]',
        bg: 'bg-[var(--note-a)]/20',
        border: 'bg-[var(--note-a)]/20',
      },
      {
        text: 'text-[var(--note-a-300)]',
        bg: 'bg-[var(--note-a-300)]/20',
        border: 'bg-[var(--note-a-300)]/20',
      },
    ],
    B: [
      {
        text: 'text-[var(--note-b)]',
        bg: 'bg-[var(--note-b)]/20',
        border: 'bg-[var(--note-b)]/20',
      },
      {
        text: 'text-[var(--note-b-300)]',
        bg: 'bg-[var(--note-b-300)]/20',
        border: 'bg-[var(--note-b-300)]/20',
      },
    ],
  };

  const resolvePianoKey = (note: string, octave: number) => {
    const sharp = note.includes('#');
    const baseName = note[0] as PianoKeyName;
    const keyRef = pianoKeyRefs.get(`${baseName}${octave}`);
    if (!keyRef) throw new Error(`Invalid key: ${note}${octave}`);
    return { keyRef, sharp };
  };

  let pcKeyboard = getPcKeyboard();
  onMount(() => {
    pcKeyboard.turnOn();

    const unsubscribeActiveNotes = noteCoordinator.activeNotes.subscribe((notes) => {
      currentKeys = [...notes];
    });

    const syncNoteEvent = (type: NoteEventType) => (event: RoutedNoteEvent) => {
      if (!event.isForwarded) return;
      const { keyRef, sharp } = resolvePianoKey(event.note, event.octave);
      if (type === 'noteon') {
        keyRef.press?.(sharp ? { sharp: true } : {});
      } else {
        keyRef.release?.(sharp ? { sharp: true } : {});
      }
    };

    const unregisterControl = noteCoordinator.registerControl({
      id: PIANO_UI_SOURCE_ID,
      role: 'sub',
      sync: {
        noteon: syncNoteEvent('noteon'),
        noteoff: syncNoteEvent('noteoff'),
      },
    });

    return () => {
      unregisterControl();
      pcKeyboard.turnOff();
      stopLoadingAnimation?.();
      stopLoadingAnimation = null;
      if (completionRelease !== null) {
        clearTimeout(completionRelease);
        completionRelease = null;
      }
      if (completionNoteActive && completionNote) {
        onnoteoff(completionNote);
        completionNoteActive = false;
        completionNote = null;
      }
      pianoKeyRefs.clear();
      unsubscribeActiveNotes();
    };
  });

  export function pkHighlight(name: PianoKeyFullName, value: boolean) {
    const key = `${name.name}${name.octave}`;
    const options = pluginOptions.get(key);
    if (!options) return;
    const variantIndex = bowKeyIndex(name.sharp);
    // Clone the highlight array so Svelte notices the change instead of mutating in place.
    const highlight = [...options.highlight];
    if (highlight[variantIndex] === value) return;
    highlight[variantIndex] = value;
    // Spread to create a fresh object before writing back into the reactive map.
    pluginOptions.set(key, { ...options, highlight });
  }

  // black or white key index
  function bowKeyIndex(sharp: boolean): number {
    return sharp ? 1 : 0;
  }

  export function activateKeys(value: boolean, keys: PianoKeyFullName[]) {
    keys.forEach(({ name, octave, sharp }) => {
      const { keyRef } = resolvePianoKey(name, octave);
      keyRef.activateUI(value, { highlight: value, sharp });
    });
  }

  function buildLoadingSequence(
    alignMode: AlignMode,
    middle: { name: PianoKeyName; octave: number },
  ): PianoKeyFullName[] {
    const baseIndex = pianoKeys.findIndex(
      (key) => key.name === middle.name && key.octave === middle.octave,
    );
    if (baseIndex === -1) return [];

    const windowByAlign: Record<AlignMode, { start: number; end: number }> = {
      left: { start: 0, end: 6 },
      middle: { start: -3, end: 3 },
      right: { start: -6, end: 0 },
    };

    const { start, end } = windowByAlign[alignMode];
    const sequence: PianoKeyFullName[] = [];

    for (let offset = start; offset <= end; offset += 1) {
      const index = baseIndex + offset;
      if (index < 0 || index >= pianoKeys.length) continue;
      const key = pianoKeys[index];
      sequence.push({ name: key.name, octave: key.octave, sharp: false });
    }

    return sequence;
  }

  function startLoadingAnimation(
    alignMode: AlignMode,
    middle: { name: PianoKeyName; octave: number },
    baseSequence?: PianoKeyFullName[],
  ): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const sequence = (baseSequence ?? buildLoadingSequence(alignMode, middle)).slice();
    if (sequence.length === 0) {
      return () => {};
    }

    let keyIndex = 0;
    let lastTime = performance.now();
    let rafId: number | null = null;
    let stopped = false;

    activateKeys(true, [sequence[keyIndex]]);

    const animate = () => {
      if (stopped) return;

      const now = performance.now();
      if (now - lastTime > 150) {
        activateKeys(false, [sequence[keyIndex]]);
        keyIndex = (keyIndex + 1) % sequence.length;
        activateKeys(true, [sequence[keyIndex]]);
        lastTime = now;
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      stopped = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      sequence.forEach((key) => activateKeys(false, [key]));
    };
  }

  let completionNote: PianoKeyFullName | null = null;

  $effect(() => {
    const isLoading = $pianoLoading.loading;
    const alignMode = align;
    const middle = {
      name: middleKeyName.name,
      octave: middleKeyName.octave,
    };
    const middleNote: PianoKeyFullName = { ...middle, sharp: false };

    stopLoadingAnimation?.();
    stopLoadingAnimation = null;

    if (!isLoading) {
      if (wasLoading && typeof window !== 'undefined') {
        if (completionRelease !== null) {
          clearTimeout(completionRelease);
          completionRelease = null;
        }
        if (completionNoteActive && completionNote) {
          onnoteoff(completionNote);
          completionNoteActive = false;
          completionNote = null;
        }
        onnoteon(middleNote);
        completionNote = { ...middleNote };
        completionNoteActive = true;
        completionRelease = window.setTimeout(() => {
          if (completionNoteActive && completionNote) {
            onnoteoff(completionNote);
          }
          completionNoteActive = false;
          completionNote = null;
          completionRelease = null;
        }, 1000);
      }
      wasLoading = false;
      return;
    }

    if (completionRelease !== null) {
      clearTimeout(completionRelease);
      completionRelease = null;
    }
    if (completionNoteActive && completionNote) {
      onnoteoff(completionNote);
      completionNoteActive = false;
      completionNote = null;
    }

    const sequence = buildLoadingSequence(alignMode, middle);
    const hasAllRefs = () => sequence.every((key) => pianoKeyRefs.has(`${key.name}${key.octave}`));

    if (!hasAllRefs()) {
      let rafId: number | null = null;
      const attemptStart = () => {
        if (!hasAllRefs()) {
          rafId = window.requestAnimationFrame(attemptStart);
          return;
        }
        rafId = null;
        stopLoadingAnimation = startLoadingAnimation(alignMode, middle, sequence);
      };
      rafId = typeof window === 'undefined' ? null : window.requestAnimationFrame(attemptStart);
      stopLoadingAnimation = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      };
      wasLoading = true;
      return;
    }

    stopLoadingAnimation = startLoadingAnimation(alignMode, middle, sequence);
    wasLoading = true;
  });
</script>

<div class="middle-line fixed top-0 left-[50%] z-10 hidden h-screen w-0.5 bg-red-500"></div>

{#snippet pianoKeyPlugin({ name: { name, octave, sharp }, options }: PianoPluginNameOptions)}
  {@const variant = bowKeyIndex(sharp)}
  {@const highlight = pianoKeyHighlights[name[0]][variant]}
  {@const containerSize = sharp ? 'h-8 w-8' : 'h-12 w-12'}
  {@const borderSize = sharp ? 'inset-2' : 'inset-3'}
  {@const textSize = sharp ? 'text-lg' : 'text-xl'}
  {@const label = sharp ? `${name}#` : name}
  {@const fullName = `${label}${octave}`}
  {@const pgOptions = (options as PluginOptions) ?? { highlight: [false, false] }}
  {@const isPluginHighlight = pgOptions.highlight?.[variant] ?? false}
  {@const isActive = currentKeys.includes(fullName)}
  {@const shouldHighlight = isPluginHighlight || isActive}

  {#if shouldHighlight}
    <div class={`relative flex ${containerSize} items-center justify-center`}>
      <div class={`absolute -inset-1 flex rounded-full ${highlight.border}`}></div>
      <div class={`absolute ${borderSize} flex rounded-full ${highlight.bg}`}></div>
      <span class={`isolate text-center ${textSize} font-extrabold ${highlight.text}`}>{label}</span
      >
    </div>
  {:else if name == middleKeyName.name && octave == middleKeyName.octave && !sharp}
    <span class={`text-center ${textSize} font-extrabold text-[var(--app-light)]`}>{fullName}</span>
  {/if}
{/snippet}

{#snippet pianokey(
  name: PianoKeyName,
  octave: number,
  hideBlack: boolean,
  pluginOptions?: PluginOptions,
)}
  <PianoKey
    {name}
    {octave}
    {hideBlack}
    {onnoteon}
    {onnoteoff}
    plugin={pianoKeyPlugin}
    {pluginOptions}
    bind:this={
      () => pianoKeyRefs.get(`${name}${octave}`), (v) => pianoKeyRefs.set(`${name}${octave}`, v)
    }
  ></PianoKey>
{/snippet}

<div class="piano-keyboard fixed bottom-0 w-screen overflow-hidden">
  <div class="relative w-full">
    {#if $pianoLoading.loading}
      <div
        class="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[var(--note-black-900)]/40
        backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
        aria-label={$pianoLoading.message || 'Loading piano sound'}
      >
        <div
          class="flex max-w-[80vw] min-w-[240px] flex-col items-center gap-4 rounded-xl bg-white/95 p-5 text-center text-sm text-[var(--note-black)] shadow-2xl shadow-black/25"
        >
          <span class="text-base font-semibold text-[var(--app-primary)]">
            {$pianoLoading.message || 'Loading piano sound...'}
          </span>
          <p class="max-w-[28ch] text-xs text-[var(--note-black-600)]">
            Warming up the keys, hang tight!
          </p>
          {#if $pianoLoading.needsUnlock}
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--app-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]"
              onclick={() => $pianoLoading.onUnlock?.()}
              aria-label="Enable audio"
            >
              Enable Audio
            </button>
          {/if}
        </div>
      </div>
    {/if}
    <div
      class="relative inline-flex items-end justify-around transition-transform duration-100 ease-out"
      {@attach movable.draggable('.handle')}
    >
      <div
        class="handle absolute -top-1 left-0 h-2 w-full cursor-move"
        bind:clientWidth={keyboardWidth}
      ></div>
      {#each pianoKeys as { name, octave, hideBlack }}
        {#if name == 'F' || name == 'C'}
          <div class={`h-12 ${groupGap}`}></div>
        {/if}
        {#if name == middleKeyName.name && octave == middleKeyName.octave}
          <!-- Pull the wrapper left so the middle key keeps the same gap as its neighbours -->
          <div bind:this={middleKey} class="-mr-[var(--spacing)]" data-middle-key>
            {@render pianokey(name, octave, hideBlack!, pluginOptions.get(`${name}${octave}`))}
          </div>
        {:else}
          {@render pianokey(name, octave, hideBlack!, pluginOptions.get(`${name}${octave}`))}
        {/if}
      {/each}
    </div>
  </div>
</div>

<svelte:window bind:innerWidth={windowWidth} />
