<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { LoadState } from '$lib/enum';
  type PianoModule = typeof import('@tonejs/piano');

  let ls = $state<LoadState>(LoadState.ToLoad);
  let loadTime = $state(0);
  let tone: InstanceType<PianoModule['Piano']> | null = null;

  async function loadTone() {
    type PianoModule = typeof import('@tonejs/piano');

    const mod = await import('@tonejs/piano');
    const PianoTone = mod.Piano as PianoModule['Piano'];

    tone = new PianoTone({
      url: '/audio/',
      velocities: 5,
    });
    //connect it to the speaker output
    tone.toDestination();
    let t1 = performance.now();
    ls = LoadState.Loading;
    let intervalHandle = window.setInterval(() => {
      loadTime = performance.now() - t1;
    }, 1000);
    tone
      .load()
      .then(() => {
        let t2 = performance.now();
        loadTime = t2 - t1;
        ls = LoadState.Loaded;
        tone?.keyDown({ note: 'C4' });
        setInterval(() => {
          tone?.keyUp({ note: 'C4' });
        }, 1000);
      })
      .catch(() => {
        ls = LoadState.Error;
      })
      .finally(() => {
        clearInterval(intervalHandle);
      });
  }

  function playTone() {
    if (ls != LoadState.Loaded) return;
    tone!.keyDown({ note: 'C4' });
  }

  function stopTone() {
    if (ls != LoadState.Loaded) return;
    tone!.keyUp({ note: 'C4' });
  }
</script>

<div class="mt-16 flex flex-col items-center justify-center">
  <Button
    onpointerdown={() => (ls == LoadState.Loaded ? playTone() : loadTone())}
    onpointerup={() => stopTone()}
    variant="primary"
    size="xl"
    class="select-none"
  >
    {ls == LoadState.Loaded ? `Play Tone` : ls == LoadState.Loading ? 'Loading Tone' : 'Load Tone'}
  </Button>
  {#if ls != LoadState.ToLoad}
    <span class="text-sm text-gray-500">
      {ls == LoadState.Loading ? 'loading' : ls == LoadState.Loaded ? 'loaded' : 'failed'}...{(
        loadTime / 1000
      ).toFixed(3)}
    </span>
  {/if}
</div>
