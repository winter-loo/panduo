<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';

  let length = $state(50);

  let outputContainer: HTMLElement;
  onMount(() => {
    const svgNS = 'http://www.w3.org/2000/svg';

    let svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');

    let rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '20');
    rect.setAttribute('width', '50');
    rect.setAttribute('height', '50');
    rect.setAttribute('fill', '#aa7777');

    svg.appendChild(rect);

    outputContainer.appendChild(svg);
  });
</script>

<Button onclick={() => (length += 5)}>zoom out</Button>
<Button onclick={() => (length -= 5)}>zoom in</Button>
<svg width="200" height="200" viewBox="0 0 {length} {length}">
  <circle cx={length / 2} cy={length / 2} r="25" fill="skyblue" />
</svg>

<div class="output" bind:this={outputContainer}></div>

<section>
  <h3>show case: stroke center</h3>
  <svg width="200" height="200" class="ml-20">
    <rect x="10" y="10" width="100" height="60" stroke-width="10" stroke="red" />
    <path d="M10 10L110 10" stroke="blue" />
    <path d="M10 10L10 70" stroke="blue" />
    <path d="M10 70L110 70" stroke="blue" />
    <path d="M110 70L110 10" stroke="blue" />
  </svg>
</section>
