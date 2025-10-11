<script lang="ts">
  import { Button } from '$lib/components/ui/button/index';
  import MovingStaff from '$lib/components/staff/MovingStaff.svelte';
  import type { StaffSong } from '$lib/staff/moving-staff-controller';

  const demoSong: StaffSong = {
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

  let staff = $state<MovingStaff | null>(null);

  function onpointerdown() {
    staff?.onNoteOn();
  }

  function onpointerup() {
    staff?.onNoteOff();
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
    movable={false}
  />

  <div class="flex items-center gap-4">
    <Button type="button" {onpointerdown} {onpointerup}>Next note</Button>
  </div>
</main>
