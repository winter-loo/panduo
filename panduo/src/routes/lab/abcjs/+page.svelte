<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as abcjs from '$lib/abcjs/index';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  const PagePath = page.url.pathname;

  onMount(() => {
    abcjs.renderAbc('s1-paper', "L:1/4\n | CDEF | GABc |\n defg | abc'z | ", {
      expandToWidest: true,
      scale: 2,
      dragging: true,
    });
    abcjs.renderAbc('s2-paper', 'L:1/4\n z/2 A,/2 | C2 B,2 | A, zz', {
      lineThickness: 0.3,
      scale: 2,
      add_classes: true,
    });
    // meter: 3/8
    // default note length: 1/8
    // Spaces break beams
    abcjs.renderAbc('s3-paper', 'M:3/4\nL:1/8\n G2ee | e2c2ce | g3g fe | d2z2', {
      scale: 2,
      staffwidth: 840,
    });
  });

  // Get MIDI data as a link or data URL
  var midiOutput = abcjs.synth.getMidiFile('M:3/4\nL:1/8\n G2ee | e2c2ce | g3g fe | d2z2', {
    midiOutputType: 'link',
    downloadLabel: 'Download MIDI',
  });

</script>

<section>
  {@html midiOutput}
</section>

<section class="subpages mt-5 ml-4">
  <Button variant="link" href="{PagePath}/animation">animation</Button>
  <Button variant="link" href="{PagePath}/mini">mini lab</Button>
</section>

<section>
  <h3 class="mt-10 ml-4 text-lg font-bold">music scale</h3>
  <div id="s1-paper"></div>
</section>

<section>
  <h3 class="mt-10 ml-4 text-lg font-bold">note lengths</h3>
  <div id="s2-paper"></div>
</section>

<section>
  <h3 class="mt-10 ml-4 text-lg font-bold">beam line</h3>
  <div id="s3-paper"></div>
</section>

<section class="ml-4 h-40">
  <h3 class="mt-10 text-lg font-bold">references</h3>
  <ul>
    <li>https://paulrosen.github.io/abcjs/</li>
    <li>http://www.lesession.co.uk/abc/abc_notation.htm</li>
  </ul>
</section>

<style>
  :global {
    #s2-paper {
      .abcjs-clef,
      .abcjs-bar,
      .abcjs-staff * {
        fill: #dadada;
      }
    }
  }
</style>
