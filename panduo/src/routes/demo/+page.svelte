<script lang="ts">
  import { Button } from '$lib/components/ui/button/index';
  import MovingStaff from '$lib/components/staff/MovingStaff.svelte';

  let staff1 = $state<MovingStaff | null>(null);
  let song1 = {
    timeSignature: '2/4',
    measures: [
      {
        notes: [
          { keys: ['e/4'], duration: '4' },
          { keys: ['g/4'], duration: '4' },
        ],
      },
    ],
  };

  let staff2 = $state<MovingStaff | null>(null);
  let song2 = {
    timeSignature: '4/4',
    keySignature: 'A',
    measures: [
      {
        notes: [
          { keys: ['e/4'], duration: '4' },
          { keys: ['g/4'], duration: '4' },
          { keys: ['b/4'], duration: '4' },
          { keys: ['f/5'], duration: '4' },
        ],
      },
    ],
  };

  let staff3 = $state<MovingStaff | null>(null);
  let song3 = {
    timeSignature: '3/4',
    measures: [
      {
        notes: [
          { keys: ['g/4'], duration: '4' },
          { keys: ['b/4'], duration: '4' },
          { keys: ['d/5'], duration: '4' },
        ],
      },
    ],
  };
</script>

<main class="mx-auto flex max-w-4xl flex-col gap-6 p-8">
  <h1 class="text-2xl font-semibold text-slate-800">Demo Staff</h1>

  <MovingStaff bind:this={staff1} song={song1} tempo={60} />

  <div class="flex items-center gap-4">
    <Button
      type="button"
      onpointerdown={() => staff1?.onNoteOn()}
      onpointerup={() => staff1?.onNoteOff()}
    >
      Next note
    </Button>
  </div>
</main>

<main class="mx-auto flex max-w-4xl flex-col gap-6 p-8">
  <div class="flex flex-row justify-start items-center">
    <div
      class="w-18 h-21 flex flex-none justify-center items-center border-4 translate-x-[4px] rounded-l-sm border-[#dadada]"
    >
      <!-- speaker icon -->
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        color="#afafaf"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.5019 2.32579C13.3758 2.26433 13.235 2.23948 13.0954 2.25406C12.9559 2.26865 12.8232 2.32208 12.7125 2.40829L6.16504 7.49985H1.92285C1.52503 7.49985 1.14349 7.65788 0.862191 7.93919C0.580892 8.22049 0.422852 8.60202 0.422852 8.99985V14.9998C0.422852 15.3977 0.580892 15.7792 0.862191 16.0605C1.14349 16.3418 1.52503 16.4998 1.92285 16.4998H6.16504L12.7125 21.5914C12.8233 21.6775 12.9561 21.7309 13.0957 21.7453C13.2353 21.7597 13.3761 21.7347 13.5022 21.6731C13.6283 21.6115 13.7345 21.5157 13.8089 21.3967C13.8833 21.2777 13.9227 21.1402 13.9229 20.9998V2.99985C13.9229 2.85934 13.8834 2.72166 13.809 2.60248C13.7346 2.48331 13.6282 2.38743 13.5019 2.32579Z"
          fill="currentColor"
        />
        <path
          d="M19.8642 11.8991C19.8761 13.7606 18.6123 15.5129 16.4784 17.5104C16.1963 17.7745 15.7534 17.7602 15.4892 17.4782C15.225 17.196 15.2394 16.7532 15.5214 16.4889C17.6455 14.5006 18.4715 13.1173 18.4638 11.9079C18.4559 10.7031 17.618 9.38214 15.5341 7.52213C15.2458 7.26478 15.2203 6.82228 15.4775 6.53385C15.7348 6.24551 16.1773 6.22004 16.4657 6.47721C18.5606 8.34695 19.8521 10.0331 19.8642 11.8991Z"
          fill="currentColor"
        />
        <path
          d="M23.7598 11.4791C23.7568 14.9609 21.5506 18.4934 17.4922 22.4977C17.217 22.7692 16.7735 22.766 16.502 22.4908C16.2307 22.2156 16.2337 21.773 16.5088 21.5016C20.5183 17.5455 22.3569 14.3633 22.3594 11.4781C22.3618 8.62155 20.5581 5.79153 16.5586 2.54258C16.2589 2.29876 16.2134 1.85815 16.457 1.55821C16.7008 1.25818 17.1413 1.2129 17.4414 1.45665C21.5316 4.77926 23.7626 7.96888 23.7598 11.4791Z"
          fill="currentColor"
        />
      </svg>
    </div>
    <MovingStaff bind:this={staff2} song={song2} tempo={90} />
  </div>

  <div class="flex items-center gap-4">
    <Button
      type="button"
      onpointerdown={() => staff2?.onNoteOn()}
      onpointerup={() => staff2?.onNoteOff()}
    >
      Next note
    </Button>
  </div>
</main>

<main class="mx-auto flex max-w-4xl flex-col gap-6 p-8">
  <MovingStaff bind:this={staff3} song={song3} tempo={60} />

  <div class="flex items-center gap-4">
    <Button
      type="button"
      onpointerdown={() => staff3?.onNoteOn()}
      onpointerup={() => staff3?.onNoteOff()}
    >
      Next note
    </Button>
  </div>
</main>
