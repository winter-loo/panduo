<script lang="ts">
  import { Button } from '$lib/components/ui/button/index';
  import MovingStaff from '$lib/components/staff/MovingStaff.svelte';
  import type MovingStaffComponent from '$lib/components/staff/MovingStaff.svelte';
  import type { StaffSong } from '$lib/staff/moving-staff-controller';

  const demoSong: StaffSong = {
    timeSignature: '4/4',
    tempo: 72,
    keySignature: 'C',
    measures: [
      {
        notes: [
          { keys: ['c/4'], duration: '4' },
          { keys: ['d/4'], duration: '4' },
          { keys: ['e/4'], duration: '4' },
          { keys: ['g/4'], duration: '4' },
        ],
      },
    ],
  };

  let staff: MovingStaffComponent | null = null;

  const NOTE_SCALE_DURATION = 200;
  const NOTESPAN_EXPAND_DELAY = 60;
  const NOTESPAN_HOLD_DURATION = 200;

  function playNextNote() {
    staff?.startNoteSpanPreview();
    staff?.goToNextNote();

    const note = staff?.startScalePulseAnimation();
    if (!note) {
      staff?.stopNoteSpanPreview();
      return;
    }

    note.noteSpans.forEach((span) => {
      span.startHaloPulseAnimation(NOTESPAN_EXPAND_DELAY, NOTESPAN_HOLD_DURATION);
    });

    if (typeof window === 'undefined') {
      note.setScalePulseState(false);
      staff?.stopNoteSpanPreview();
      return;
    }

    window.setTimeout(() => note.setScalePulseState(false), NOTE_SCALE_DURATION);
    window.setTimeout(
      () => staff?.stopNoteSpanPreview(),
      NOTESPAN_EXPAND_DELAY + NOTESPAN_HOLD_DURATION,
    );
  }
</script>

<main class="mx-auto flex max-w-4xl flex-col gap-6 p-8">
  <h1 class="text-2xl font-semibold text-slate-800">Demo Staff</h1>
  <p class="text-slate-600">
    This staff renders a single measure and stays fixed in place. Use the button below to highlight
    the next note with a halo and scale pulse animation.
  </p>

  <MovingStaff
    bind:this={staff}
    song={demoSong}
    tempo={demoSong.tempo}
    noteSpanVisible={false}
    movable={false}
  />

  <div class="flex items-center gap-4">
    <Button type="button" onclick={playNextNote}>Next note</Button>
  </div>
</main>
