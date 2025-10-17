<script lang="ts">
  import PianoKey from '$lib/components/piano-key/piano-key.svelte';
  import type {
    PianoKeyProps,
    PianoKeyName,
    PianoKeyFullName,
  } from '$lib/components/piano-key/piano-key.svelte';
  import { MovableElement } from '$lib/movable';
  import { getVirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';
  import { Select } from 'bits-ui';
  import { onMount } from 'svelte';
  const TemplateKeys: PianoKeyName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  type PianoKeyController = {
    press?: (options?: { sharp?: boolean }) => void;
    release?: (options?: { sharp?: boolean }) => void;
  };

  const numPianoKeys = 52;
  const pianoKeyControllers = new Map<string, PianoKeyController>();

  let middleKey = $state<HTMLElement | null>(null);
  let windowWidth = $state(960);
  let offsetX = $state(-144);
  let keyboardWidth = $state(960);
  let showHighlight = $state(true);
  let currentKeys = $state<string[]>([]);

  let selectedOctave = $state('4');
  let selectedName = $state('C');
  let middleKeyName = $derived(selectedName + selectedOctave);
  const movable = new MovableElement(0);

  let pianoKeys: PianoKeyProps[] = [];
  let octave = 0;

  for (let i = 0; i < numPianoKeys; i++) {
    const name = TemplateKeys[i % TemplateKeys.length];
    if (name === 'C') {
      octave += 1;
    }
    pianoKeys.push({ name, octave });
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

  function noteIdentifier({ name, octave, sharp }: PianoKeyFullName) {
    return `${name}${sharp ? '#' : ''}${octave}`;
  }

  function onnoteon(note: PianoKeyFullName) {
    const id = noteIdentifier(note);
    if (!currentKeys.includes(id)) {
      currentKeys = [...currentKeys, id];
    }
  }
  function onnoteoff(note: PianoKeyFullName) {
    const id = noteIdentifier(note);
    currentKeys = currentKeys.filter((existing) => existing !== id);
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

  let midiKeyboard = getVirtualMidiKeyboard();
  onMount(() => {
    midiKeyboard.turnOn();

    const resolvePianoKey = (note: string, octave: number) => {
      if (!note) return null;
      const sharp = note.includes('#');
      const baseName = note[0] as PianoKeyName;
      if (!TemplateKeys.includes(baseName)) return null;
      const controller = pianoKeyControllers.get(`${baseName}${octave}`);
      if (!controller) return null;
      return { controller, sharp };
    };

    const handleNoteOn = (event: { note: string; octave: number }) => {
      const resolved = resolvePianoKey(event.note, event.octave);
      if (!resolved) return;
      const { controller, sharp } = resolved;
      controller.press?.(sharp ? { sharp: true } : {});
    };

    const handleNoteOff = (event: { note: string; octave: number }) => {
      const resolved = resolvePianoKey(event.note, event.octave);
      if (!resolved) return;
      const { controller, sharp } = resolved;
      controller.release?.(sharp ? { sharp: true } : {});
    };

    midiKeyboard.on('noteOn', handleNoteOn);
    midiKeyboard.on('noteOff', handleNoteOff);

    return () => {
      midiKeyboard.off('noteOn', handleNoteOn);
      midiKeyboard.off('noteOff', handleNoteOff);
      midiKeyboard.turnOff();
      pianoKeyControllers.clear();
    };
  });
</script>

<div class="middle-line fixed top-0 left-[50%] z-10 hidden h-screen w-0.5 bg-red-500"></div>

{#snippet options(options: any[], value: string, onChange: (value: string) => void)}
  <Select.Root type="single" {value} onValueChange={onChange}>
    <Select.Trigger
      class="bg-[var(--app-lightest)] px-3 py-2 text-2xl text-[var(--app-darkest)] outline outline-[var(--app-light)]"
    >
      {value}
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Viewport class="mt-1 p-1">
          {#each options as option}
            {@const optionLabel = String(option)}
            <Select.Item
              class="rounded-button flex items-center justify-center bg-[var(--app-lightest)] px-3
                text-xl font-thin text-[var(--app-darkest)]
                outline-hidden select-none data-highlighted:bg-[var(--app-darkest)] data-highlighted:text-[var(--app-lightest)]"
              value={optionLabel}
              label={optionLabel}
            >
              {optionLabel}
            </Select.Item>
          {/each}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
{/snippet}

<div
  class="piano-keyboard-config mx-4 mt-10 w-full max-w-xl rounded-xl bg-[var(--app-lightest)] p-6 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.35)]"
>
  <h2 class="text-xl font-semibold tracking-wide text-[var(--app-darkest)]">Keyboard settings</h2>
  <p class="mt-1 text-sm text-[var(--app-dark)]">
    Tune the virtual keyboard to match your instrument.
  </p>

  <div class="mt-6 space-y-6 text-[var(--app-darkest)]">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <label
        for="middle-key-control"
        class="text-sm font-semibold tracking-wide text-[var(--app-darkest)] uppercase"
        >Middle key</label
      >
      <div id="middle-key-control" class="flex gap-2">
        {@render options(
          ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          selectedName,
          (next) => (selectedName = next),
        )}
        {@render options([1, 3, 4, 5, 6, 7], selectedOctave, (next) => (selectedOctave = next))}
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-[10rem]">
        <p class="text-sm font-semibold tracking-wide uppercase">Highlight keys</p>
        <p class="text-xs text-[var(--app-dark)]">Show active notes on the keyboard.</p>
      </div>
      <label
        for="keys-highlight-control"
        class="inline-flex items-center gap-3 text-base font-medium text-[var(--app-darkest)]"
      >
        <span>Show</span>
        <input
          id="keys-highlight-control"
          type="checkbox"
          class="h-6 w-6 rounded border-2 border-[var(--app-dark)] bg-white text-[var(--app-primary)] accent-[var(--app-dark)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-dark)]"
          bind:checked={showHighlight}
        />
      </label>
    </div>
  </div>
</div>

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
    {#each pianoKeys as { name, octave }, index}
      {#if `${name}${octave}` == middleKeyName}
        <!-- Pull the wrapper left so the middle key keeps the same gap as its neighbours -->
        <div bind:this={middleKey} class="-mr-[var(--spacing)]" data-middle-key>
          {@render pianokey(name, octave, index + 1 == pianoKeys.length)}
        </div>
      {:else}
        {@render pianokey(name, octave, index + 1 == pianoKeys.length)}
      {/if}
    {/each}
  </div>
</div>

<svelte:window bind:innerWidth={windowWidth} />
