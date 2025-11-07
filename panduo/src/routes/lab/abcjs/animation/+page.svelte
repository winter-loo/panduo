<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import abcjs from '$lib/abcjs/index.js';
  import { onDestroy, onMount } from 'svelte';
  import type {
    NoteTimingEvent,
    TimingCallbacksPosition,
    TimingCallbacksDebug,
    EventCallbackReturn,
  } from '$lib/abcjs/types/abc-animation';
  import type TimingCallbacks from '$lib/abcjs/src/api/abc_timing_callbacks';

  let isRunning = $state(false);
  let timingCallbacks: TimingCallbacks;
  let movingStaffEl: HTMLDivElement | null = null;

  let animationFrame = 0;
  let lastTimestamp = 0;
  let offset = $state(0);
  let targetOffset = 0;
  const easingPerMs = 0.008;

  const step = (timestamp: number) => {
    if (!isRunning) {
      animationFrame = 0;
      lastTimestamp = 0;
      return;
    }

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const diff = targetOffset - offset;
    if (Math.abs(diff) < 0.1) {
      offset = targetOffset;
    } else {
      const easing = Math.min(1, deltaMs * easingPerMs);
      offset += diff * easing;
    }

    animationFrame = requestAnimationFrame(step);
  };

  const startAnimation = () => {
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(step);
    }
  };

  const stopAnimation = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    lastTimestamp = 0;
  };

  const startStop = function () {
    isRunning = !isRunning;
    if (isRunning) {
      timingCallbacks?.start();
      startAnimation();
    } else {
      timingCallbacks?.stop();
      stopAnimation();
    }
  };

  const reset = function () {
    stopAnimation();
    offset = 0;
    targetOffset = 0;
    timingCallbacks?.stop();
    timingCallbacks?.reset();
    isRunning = false;
  };

  // add a line `K:C clef=none` to hide the clef
  const abcString = `
L:1/4
K:C clef=none
x CDEF | GABc | defg | abc'z |
`;

  let cursorEl: HTMLElement;

  onMount(() => {
    abcjs.renderAbc('clef-only', 'L:1/4\nx', {
      // responsive: 'resize',
      add_classes: true,
      staffwidth: 100,
      paddingright: 0,
    });
    const grobs = abcjs.renderAbc('moving-staff', abcString, {
      // responsive: 'resize',
      add_classes: true,
      staffwidth: 700,
      paddingleft: 0,
    });

    const grob = grobs[0];
    const sg = grob.lines[0].staffGroup;
    const staffs = sg.staffs[0];
    const topLine = staffs.topLine;
    const bottomLine = staffs.bottomLine;

    let theFristNote = document.querySelector('#moving-staff>svg .abcjs-note.abcjs-mm0');
    if (theFristNote) {
      let fs = grob.findSelectableElement(theFristNote as HTMLElement);
      if (fs) {
        let x = fs.element.absEl.x;
        console.log('the first note element x=', x);
        // offset = -x;
      }
    }

    timingCallbacks = new abcjs.TimingCallbacks(grob, {
      beatCallback: (
        beatNumber: number,
        totalBeats: number,
        totalTime: number,
        position: TimingCallbacksPosition,
        _debugInfo: TimingCallbacksDebug,
      ) => {
        console.log(
          'current time:',
          timingCallbacks.currentMillisecond(),
          ', offset=',
          position.left,
        );
        targetOffset = -position.left;
        if (!isRunning) offset = targetOffset;
      },

      eventCallback: (event: NoteTimingEvent | null): EventCallbackReturn => {
        return undefined;
      },

      beatSubdivisions: 63,
    });
  });

  onDestroy(() => {
    stopAnimation();
    timingCallbacks?.stop();
  });
</script>

<section class="mt-5 ml-4">
  <Button onclick={startStop}>{isRunning ? 'Pause' : 'Start'}</Button>
  <Button onclick={reset}>reset</Button>
  <div class="paper-viewport relative m-auto flex w-[800px] items-center overflow-hidden">
    <div id="clef-only" class="w-[100px]"></div>
    <div
      id="cursor"
      bind:this={cursorEl}
      class="absolute left-[100px] h-[200px] w-[4px] bg-[#a9a9a9] opacity-70"
    ></div>
    <div
      id="moving-staff"
      class="w-[700px]"
      bind:this={movingStaffEl}
      style:transform={`translateX(${offset}px)`}
    ></div>
  </div>
</section>

<style>
  #moving-staff {
    will-change: transform;
  }
</style>
