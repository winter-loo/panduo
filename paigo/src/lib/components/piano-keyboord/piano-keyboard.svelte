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
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  export const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  type PianoKeyController = {
    press?: (options?: { sharp?: boolean }) => void;
    release?: (options?: { sharp?: boolean }) => void;
  };

  const numPianoKeys = 52;
  const pianoKeyControllers = new Map<string, PianoKeyController>();
  const PIANO_UI_SOURCE_ID = 'piano-ui';

  let middleKey = $state<HTMLElement | null>(null);
  let windowWidth = $state(960);
  let offsetX = $state(-144);
  let keyboardWidth = $state(960);
  let currentKeys = $state<string[]>([]);
  const movable = new MovableElement(0);

  type AlignMode = 'left' | 'middle' | 'right';

  type PianoKeyboardProps = {
    middleKeyName: { name: PianoKeyName; octave: number };
    groupGap: string;
    align: AlignMode;
  };

  let {
    middleKeyName = { name: 'C', octave: 4 },
    groupGap = 'w-6',
    align = 'left',
  }: PianoKeyboardProps = $props();

  let pianoKeys: PianoKeyProps[] = [];
  let octave = 0;

  type PluginOptions = {
    highlight: boolean[];
  };
  let pluginOptions = new SvelteMap<string, PluginOptions>();

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

  let pcKeyboard = getPcKeyboard();
  onMount(() => {
    pcKeyboard.turnOn();

    const unsubscribeActiveNotes = noteCoordinator.activeNotes.subscribe((notes) => {
      currentKeys = [...notes];
    });

    const resolvePianoKey = (note: string, octave: number) => {
      if (!note) return null;
      const sharp = note.includes('#');
      const baseName = note[0] as PianoKeyName;
      if (!TemplateKeys.includes(baseName)) return null;
      const controller = pianoKeyControllers.get(`${baseName}${octave}`);
      if (!controller) return null;
      return { controller, sharp };
    };

    const syncNoteEvent = (type: NoteEventType) => (event: RoutedNoteEvent) => {
      if (!event.isForwarded) return;
      const resolved = resolvePianoKey(event.note, event.octave);
      if (!resolved) return;
      const { controller, sharp } = resolved;
      if (type === 'noteon') {
        controller.press?.(sharp ? { sharp: true } : {});
      } else {
        controller.release?.(sharp ? { sharp: true } : {});
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
      pianoKeyControllers.clear();
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
      () => pianoKeyControllers.get(`${name}${octave}`),
      (v) => pianoKeyControllers.set(`${name}${octave}`, v)
    }
  ></PianoKey>
{/snippet}

<div id="piano-keyboard" class="overflow-hidden] fixed bottom-0 w-screen">
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
          {@render pianokey(name, octave, hideBlack!, pluginOptions.get(`name${octave}`))}
        </div>
      {:else}
        {@render pianokey(name, octave, hideBlack!, pluginOptions.get(`name${octave}`))}
      {/if}
    {/each}
  </div>
</div>

<svelte:window bind:innerWidth={windowWidth} />
