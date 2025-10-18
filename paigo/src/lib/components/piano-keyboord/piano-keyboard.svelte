<script lang="ts">
  import PianoKey from '$lib/components/piano-key/piano-key.svelte';
  import type {
    PianoKeyProps,
    PianoKeyName,
    PianoKeyFullName,
  } from '$lib/components/piano-key/piano-key.svelte';
  import { MovableElement } from '$lib/movable';
  import { noteCoordinator } from '$lib/note-events/noteCoordinator';
  import type { NoteEventType, RoutedNoteEvent } from '$lib/note-events/types';
  import { getPcKeyboard } from '$lib/PcKeyboard';
  import { onMount } from 'svelte';
  const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
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
  let showHighlight = $state(true);
  let currentKeys = $state<string[]>([]);
  const movable = new MovableElement(0);

  let { middleKeyName = 'C4' } = $props();

  let pianoKeys: PianoKeyProps[] = [];
  let octave = 0;

  for (let i = 0; i < numPianoKeys; i++) {
    const name = TemplateKeys[i % TemplateKeys.length];
    if (name === 'C') {
      octave += 1;
    }
    pianoKeys.push({ name, octave, hideBlack: i + 1 == numPianoKeys });
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
      const middleKeyOffsetLeft = middleKey.offsetLeft;
      const middleKeyWidth = middleKey.offsetWidth;
      // compute how far we need to shift the rail so the chosen key sits at the viewport center:
      // (windowWidth / 2) gives the viewport midpoint, subtracting the key's midpoint gives
      // a signed offset; negative means slide the keyboard left. We then clamp that offset
      // into [-movable.maxOffsetX, 0] so we never go past either rail limit.
      const computedOffset = windowWidth / 2 - middleKeyOffsetLeft - middleKeyWidth / 2;
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

  type PluginKeyStyle = {
    black: PluginStyle;
    white: PluginStyle;
  };

  const pianoKeyHighlights: Record<string, PluginKeyStyle> = {
    C: {
      black: {
        text: 'text-[var(--note-c-300)]',
        bg: 'bg-[var(--note-c-700)]',
        border: 'bg-[var(--note-c-700)]/50',
      },
      white: {
        text: 'text-[var(--note-c)]',
        bg: 'bg-[var(--note-c-300)]/60',
        border: 'bg-[var(--note-c-300)]/40',
      },
    },
    D: {
      black: {
        text: 'text-[var(--note-d-300)]',
        bg: 'bg-[var(--note-d-700)]',
        border: 'bg-[var(--note-d-700)]/50',
      },
      white: {
        text: 'text-[var(--note-d)]',
        bg: 'bg-[var(--note-d-300)]/60',
        border: 'bg-[var(--note-d-300)]/40',
      },
    },
    E: {
      black: {
        text: 'text-[var(--note-e-300)]',
        bg: 'bg-[var(--note-e-700)]',
        border: 'bg-[var(--note-e-700)]/50',
      },
      white: {
        text: 'text-[var(--note-e)]',
        bg: 'bg-[var(--note-e-300)]/60',
        border: 'bg-[var(--note-e-300)]/40',
      },
    },
    F: {
      black: {
        text: 'text-[var(--note-f-300)]',
        bg: 'bg-[var(--note-f-700)]',
        border: 'bg-[var(--note-f-700)]/50',
      },
      white: {
        text: 'text-[var(--note-f)]',
        bg: 'bg-[var(--note-f-300)]/60',
        border: 'bg-[var(--note-f-300)]/40',
      },
    },
    G: {
      black: {
        text: 'text-[var(--note-g-300)]',
        bg: 'bg-[var(--note-g-700)]',
        border: 'bg-[var(--note-g-700)]/50',
      },
      white: {
        text: 'text-[var(--note-g)]',
        bg: 'bg-[var(--note-g-300)]/60',
        border: 'bg-[var(--note-g-300)]/40',
      },
    },
    A: {
      black: {
        text: 'text-[var(--note-a-300)]',
        bg: 'bg-[var(--note-a-700)]',
        border: 'bg-[var(--note-a-700)]/50',
      },
      white: {
        text: 'text-[var(--note-a)]',
        bg: 'bg-[var(--note-a-300)]/60',
        border: 'bg-[var(--note-a-300)]/40',
      },
    },
    B: {
      black: {
        text: 'text-[var(--note-b-300)]',
        bg: 'bg-[var(--note-b-700)]',
        border: 'bg-[var(--note-b-700)]/50',
      },
      white: {
        text: 'text-[var(--note-b)]',
        bg: 'bg-[var(--note-b-300)]/60',
        border: 'bg-[var(--note-b-300)]/40',
      },
    },
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
</script>

<div class="middle-line fixed top-0 left-[50%] z-10 hidden h-screen w-0.5 bg-red-500"></div>

{#snippet pianoKeyPlugin({ name, octave, sharp }: PianoKeyFullName)}
  {@const variant = sharp ? 'black' : 'white'}
  {@const highlight = pianoKeyHighlights[name[0]][variant]}
  {@const containerSize = sharp ? 'h-10 w-10' : 'h-12 w-12'}
  {@const textSize = sharp ? 'text-lg' : 'text-xl'}
  {@const label = sharp ? `${name}#` : name}
  {@const fullName = `${label}${octave}`}

  {#if showHighlight && currentKeys.includes(fullName)}
    <div class={`relative flex ${containerSize} items-center justify-center`}>
      <div class={`absolute inset-0 flex rounded-full ${highlight.border}`}></div>
      <div class={`absolute inset-3 flex rounded-full ${highlight.bg}`}></div>
      <span class={`isolate text-center ${textSize} font-extrabold ${highlight.text}`}>{label}</span
      >
    </div>
  {:else if fullName == middleKeyName}
    <span class={`text-center ${textSize} font-extrabold text-[var(--app-light)]`}>{fullName}</span>
  {/if}
{/snippet}

{#snippet pianokey(name: PianoKeyName, octave: number, hideBlack: boolean)}
  <PianoKey
    {name}
    {octave}
    {hideBlack}
    {onnoteon}
    {onnoteoff}
    plugin={pianoKeyPlugin}
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
      {#if `${name}${octave}` == middleKeyName}
        <!-- Pull the wrapper left so the middle key keeps the same gap as its neighbours -->
        <div bind:this={middleKey} class="-mr-[var(--spacing)]" data-middle-key>
          {@render pianokey(name, octave, hideBlack!)}
        </div>
      {:else}
        {@render pianokey(name, octave, hideBlack!)}
      {/if}
    {/each}
  </div>
</div>

<svelte:window bind:innerWidth={windowWidth} />
