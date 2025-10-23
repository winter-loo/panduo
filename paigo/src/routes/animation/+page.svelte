<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { onMount } from 'svelte';
  interface Keyframe {
    id: number;
    rotate: number;
    translateX: number;
    translateY: number;
    scale: number;
    skewX: number;
    skewY: number;
    transformOrigin: string;
  }

  let boxRef = $state<HTMLElement | null>(null);
  let playgroundWidth = $state(100);
  let playgroundHeight = $state(300);
  let rotate = $state(0);
  let translateX = $state(0);
  let translateY = $state(0);
  let scale = $state(1);
  let skewX = $state(0);
  let skewY = $state(0);
  let transformOrigin = $state('center');

  let keyframes = $state<Keyframe[]>([]);
  let animationName = $state('');
  let animationKeyframes = $state('');

  let transformValue = $derived(`
    translateX(${translateX}px)
    translateY(${translateY}px)
    rotate(${rotate}deg)
    scale(${scale})
    skewX(${skewX}deg)
    skewY(${skewY}deg)
  `);

  function addKeyframe() {
    keyframes.push({
      id: Date.now(),
      rotate,
      translateX,
      translateY,
      scale,
      skewX,
      skewY,
      transformOrigin,
    });
  }

  function removeKeyframe(id: number) {
    keyframes = keyframes.filter((k) => k.id !== id);
  }

  function playAnimation() {
    if (keyframes.length < 2) {
      alert('You need at least 2 keyframes to create an animation.');
      return;
    }

    const keyframeSteps = keyframes
      .map((k, i) => {
        const percentage = (i / (keyframes.length - 1)) * 100;
        const transform = `
          translateX(${k.translateX}px)
          translateY(${k.translateY}px)
          rotate(${k.rotate}deg)
          scale(${k.scale})
          skewX(${k.skewX}deg)
          skewY(${k.skewY}deg)
        `;
        return `
        ${percentage}% {
          transform: ${transform.trim()};
          transform-origin: ${k.transformOrigin};
        }
      `;
      })
      .join('');

    animationName = `smart-animation-${Date.now()}`;
    animationKeyframes = `
      @keyframes ${animationName} {
        ${keyframeSteps}
      }
    `;

    if (boxRef) {
      boxRef.style.animation = 'none';
      // This is a hack to force a reflow, which is necessary for the animation to restart.
      void boxRef.offsetWidth;
      boxRef.style.animation = `${animationName} 2s linear infinite`;
    }
  }

  function resetAnimation() {
    if (boxRef) {
      boxRef.style.animation = '';
    }
    animationName = '';
    animationKeyframes = '';
  }

  function resetKeyframes() {
    keyframes = [];
    resetAnimation();
  }
</script>

<svelte:head>
  {@html `<style>${animationKeyframes}</style>`}
</svelte:head>

<main class="inline-flex h-[calc(100vh-36px)] w-screen gap-4">
  <div class="flex w-1/3 flex-col gap-4 px-2">
    <h1 class="text-2xl">CSS Transform Lab</h1>

    <div class="controls">
      <label>
        rotate: {rotate}deg
        <input type="range" bind:value={rotate} min="-360" max="360" />
      </label>
      <label>
        translateX: {translateX}px
        <input type="range" bind:value={translateX} min={-playgroundWidth} max={playgroundWidth} />
      </label>
      <label>
        translateY: {translateY}px
        <input
          type="range"
          bind:value={translateY}
          min={-playgroundHeight}
          max={playgroundHeight}
        />
      </label>
      <label>
        scale: {scale}
        <input type="range" bind:value={scale} min="0.1" max="3" step="0.1" />
      </label>
      <label>
        skewX: {skewX}deg
        <input type="range" bind:value={skewX} min="-90" max="90" />
      </label>
      <label>
        skewY: {skewY}deg
        <input type="range" bind:value={skewY} min="-90" max="90" />
      </label>
      <label>
        transform-origin:
        <select bind:value={transformOrigin}>
          <option value="center">center</option>
          <option value="top left">top left</option>
          <option value="top right">top right</option>
          <option value="bottom left">bottom left</option>
          <option value="bottom right">bottom right</option>
          <option value="50% 50%">50% 50%</option>
          <option value="0 0">0 0</option>
          <option value="100% 100%">100% 100%</option>
        </select>
      </label>
    </div>

    <div class="flex flex-wrap gap-4">
      <Button onclick={addKeyframe}>Add Keyframe</Button>
      <Button onclick={playAnimation} disabled={keyframes.length < 2}>Play Animation</Button>
      <Button onclick={resetKeyframes}>Reset Keyframes</Button>
    </div>

    <div class="keyframes-list">
      <h2 class="text-xl">Keyframes({keyframes.length})</h2>
      {#each keyframes as k (k.id)}
        <div class="keyframe">
          <pre><code
              >{JSON.stringify(
                {
                  ...k,
                  id: undefined,
                },
                null,
                2,
              )}</code
            ></pre>
          <button onclick={() => removeKeyframe(k.id)}>✗</button>
        </div>
      {/each}
    </div>
  </div>

  <div
    class="playground flex w-2/3 items-center justify-center border-1 bg-[#f0f0f0]"
    bind:clientWidth={playgroundWidth}
    bind:clientHeight={playgroundHeight}
  >
    <div
      class="box"
      bind:this={boxRef}
      style="transform: {transformValue}; transform-origin: {transformOrigin}; animation-name: {animationName};"
    ></div>
  </div>
</main>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }

  .keyframes-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .keyframe {
    position: relative;
    background-color: #f9f9f9;
    padding: 1rem;
    border-radius: 5px;
    border: 1px solid #eee;
  }

  .box {
    width: 100px;
    height: 100px;
    background-color: deeppink;
    transition: transform 0.2s ease-out;
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }
</style>
