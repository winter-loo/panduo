<script lang="ts">
  import { notu, noteWidth, rest, RestDuration, NoteDuration } from '$lib/notu';
  import { MovableElement } from '$lib/movable';
  import { onMount } from 'svelte';
  import { getVirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';

  //
  // see [layout_measurement.md] for calculation in detail
  //
  // In summary, it's better to choose a number, say N, which is a multiple of 2, 4, 8, 16, 32.
  // and (measureWidth + barLineWidth) = N
  const layoutBase = $state({
    measureWidth: 349,
    barLineWidth: 3,
    notesSpacing: 12,
    cursorLineWidth: 8,
  });

  const layoutDerived = $derived({
    measureLeftPadding: Math.ceil((layoutBase.notesSpacing - layoutBase.barLineWidth) / 2),
    measureRightPadding: Math.floor((layoutBase.notesSpacing - layoutBase.barLineWidth) / 2),
  });
  const barlineOffsetToNote = $derived(layoutBase.barLineWidth + layoutDerived.measureLeftPadding);

  // whole: 340 + 12 = 352
  // half: 164 + 12 = 176
  // quarter: 76 + 12 = 88
  // eighth: 32 + 12 = 44
  const rhythms: any = [
    [notu(2), rest(4), rest(4)],
    [rest(4), notu(4), rest(2)],
    // [rest(2), rest(4), notu(8), notu(8)],
    [notu(4), notu(4), notu(8), notu(8), rest(4)],
    [notu(8), notu(8), notu(4), notu(4), notu(8), notu(8)],
    [notu(4), notu(4), notu(4), notu(4)],
    [notu(1)],
  ];

  // Movable pan controller; bounds recomputed on mount/resize
  let movable = new MovableElement(0);

  let cardEl: HTMLDivElement;
  let staffEl: HTMLDivElement;
  function recomputePanBounds() {
    const staffLineWidth =
      rhythms.length * layoutBase.measureWidth + (rhythms.length + 1) * layoutBase.barLineWidth;
    movable.maxOffsetX = staffLineWidth;
  }
  onMount(() => {
    const willDo = () => {
      buildNoteGeoms();
      updateDimsSelective();
      recomputePanBounds();
    };
    const ro = new ResizeObserver(willDo);
    if (cardEl) ro.observe(cardEl);
    return () => ro.disconnect();
  });

  // --- Rhythm checking (metronome-only) ---
  const BPM = 60; // fixed
  const WHOLE_MS = 4 * (60_000 / BPM); // 4 beats in 4/4 at 60 BPM = 4000ms
  const TOL_MS = 30; // acceptance tolerance

  function durationFraction(d: NoteDuration) {
    return d.repeat / d.baseNoteValue;
  }
  function msFor(d: NoteDuration) {
    return durationFraction(d) * WHOLE_MS;
  }

  function widthFor(d: NoteDuration) {
    return noteWidth({ ...layoutBase }, d) + layoutBase.notesSpacing;
  }

  // Player state
  const player = $state({
    current: {
      m: 0,
      i: 0,
    },
    holding: false,
    startTs: 0,
    finished: false,
    progress: 0,
    expectedMs: 0,
    expectedOffset: 0,
  });

  // --- Shared helpers to reduce duplication ---
  function currentDuration() {
    return rhythms[player.current.m]?.[player.current.i];
  }
  function nextNote() {
    let ii = player.current.i + 1;
    if (ii >= rhythms[player.current.m].length) {
      let mm = player.current.m + 1;
      if (mm >= rhythms.length) {
        return null;
      }
      return rhythms[mm][0];
    }
    return rhythms[player.current.m]?.[ii];
  }
  function currentNoteGeomIndex() {
    return measureStartIdxs[player.current.m] + player.current.i;
  }
  function currentNoteGeom() {
    return noteGeoms[currentNoteGeomIndex()];
  }

  // Precomputed geometry for notes (content-space positions, no layout reads).
  type NoteGeom = { m: number; i: number; x: number; w: number };
  let noteGeoms: NoteGeom[] = [];
  // Width of dim overlay for each note in flattened order across all measures
  let dimWidths = $state<number[]>([]);
  // Start index in flattened note array for each measure m
  let measureStartIdxs = $state<number[]>([]);
  // Track which flattened note index currently drives dynamic dim updates during manual drag
  let activeDimIdx: number = -1;

  // Binary search the last note whose x <= playheadX.
  function findNoteIndexAtX(playheadX: number): number {
    if (!noteGeoms.length) return -1;
    let lo = 0;
    let hi = noteGeoms.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (noteGeoms[mid].x <= playheadX) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  function buildNoteGeoms() {
    noteGeoms = [];
    measureStartIdxs = [];
    let x = 0;
    let runningIdx = 0;
    for (let m = 0; m < rhythms.length; m++) {
      // Leading barline before each measure
      x += layoutBase.barLineWidth;
      // Inside measure: start after left padding
      let insideX = x + layoutDerived.measureLeftPadding;
      const seq = rhythms[m];
      measureStartIdxs[m] = runningIdx;
      for (let i = 0; i < seq.length; i++) {
        const dura = seq[i];
        const w = noteWidth({ ...layoutBase }, dura);
        noteGeoms.push({ m, i, x: insideX, w });
        insideX += w + layoutBase.notesSpacing;
        runningIdx += 1;
      }
      // Move to next measure start
      x += layoutBase.measureWidth;
    }
    // Reset dim overlays to match note count
    dimWidths = Array(noteGeoms.length).fill(0);
    activeDimIdx = -1;
  }

  function updateDimsSelective() {
    const staffXToPlayhead = movable.currentOffsetX + barlineOffsetToNote;
    if (!noteGeoms.length) return;

    // Decide which note index drives the partial dim update this frame.
    let targetIdx = currentNoteGeomIndex();
    if (!player.holding && restRafId == null) {
      // Manual drag: choose the note under the playhead via binary search.
      let idx = findNoteIndexAtX(staffXToPlayhead);
      targetIdx = idx;
      const g2 = noteGeoms[idx];
      if (g2) {
        // Update current pointer to note under playhead during manual drag
        if (g2.m !== player.current.m || g2.i !== player.current.i) {
          player.current.m = g2.m;
          player.current.i = g2.i;
        }
        // If the session had finished previously, allow replay from dragged position.
        if (player.finished) {
          player.finished = false;
        }
      }

      // Update only the changed range between previous active and new active index
      if (activeDimIdx === -1) {
        activeDimIdx = idx;
      } else if (idx > activeDimIdx) {
        // Moved right: fully dim the notes we passed over
        for (let k = activeDimIdx; k < idx; k++) {
          const ng = noteGeoms[k];
          dimWidths[k] = ng.w;
        }
        activeDimIdx = idx;
      } else if (idx < activeDimIdx) {
        // Moved left: clear dims for notes to the right of new active
        for (let k = activeDimIdx; k > idx; k--) {
          dimWidths[k] = 0;
        }
        activeDimIdx = idx;
      }
    }

    // Update partial dim for the target (current) note only.
    const g = noteGeoms[targetIdx];
    if (!g) return;
    const partial = Math.min(g.w, Math.max(0, staffXToPlayhead - g.x));
    dimWidths[targetIdx] = partial;
  }

  function snapPlayheadToNearestLeftEdge() {
    // Refresh which note is under the playhead.
    updateDimsSelective();
    const idx = currentNoteGeomIndex();
    const curDura = currentDuration();
    // If dropping on a rest, snap to the first non-rest on its left side.
    if (curDura instanceof RestDuration) {
      let targetIdx = -1;
      for (let k = idx - 1; k >= 0; k--) {
        const ng = noteGeoms[k];
        const dura = rhythms[ng.m]?.[ng.i];
        if (!(dura instanceof RestDuration)) {
          targetIdx = k;
          break;
        }
      }
      if (targetIdx !== -1) {
        const ng = noteGeoms[targetIdx];
        const desiredOffset = ng.x - barlineOffsetToNote;
        movable.moveTo(desiredOffset, 150);
        return;
      }
      // If no non-rest exists to the left, fall back to current edge.
    }
    alignToEdge();
  }

  function alignToEdge() {
    const g = currentNoteGeom();
    if (!g) return;
    const desiredOffset = g.x - barlineOffsetToNote;
    movable.moveTo(desiredOffset, 150);
  }

  function advanceAfterSuccess() {
    player.current.i += 1;
    if (player.current.i >= rhythms[player.current.m].length) {
      player.current.i = 0;
      player.current.m += 1;
    }
    if (player.current.m >= rhythms.length) {
      player.finished = true;
      // Clamp to last valid note to keep geometry/index safe for UI updates.
      player.current.m = rhythms.length - 1;
      player.current.i = rhythms[player.current.m].length - 1;
    }
  }

  function beginHold() {
    if (player.finished) return;
    if (player.holding) return;
    // If a rest auto-run is in progress, stop it when user starts holding again.
    stopRestAutoRun();
    player.holding = true;

    const next = currentDuration();
    if (!next) return;
    player.startTs = performance.now();
    player.expectedMs = msFor(next);
    player.expectedOffset = widthFor(next);

    startHoldAnimationLoop();
  }

  function endHold() {
    if (!player.holding) return;
    const now = performance.now();
    const held = now - player.startTs;
    const expected = player.expectedMs;
    player.holding = false;
    stopHoldAnimationLoop();
    // If we are currently on a rest (e.g., transitioned into a rest while holding),
    // on release we should auto-continue through rest(s) without requiring a hold.
    const wasOnRest = currentDuration() instanceof RestDuration;
    if (!wasOnRest) {
      if (held + TOL_MS >= expected) {
        advanceAfterSuccess();
        if (player.finished) return;
      }
    }
    // If the current item is a rest now, auto-run across consecutive rests.
    if (currentDuration() instanceof RestDuration) {
      startRestAutoRun();
      return;
    }
    // Otherwise, snap the playhead neatly to the current note start.
    alignToEdge();
  }

  function resetUI() {
    stopHoldAnimationLoop();
    stopRestAutoRun();
    player.current.m = 0;
    player.current.i = 0;
    player.holding = false;
    player.finished = false;
    player.startTs = 0;
    player.progress = 0;
    player.expectedMs = 0;
    // Quick reset of dim overlays
    dimWidths = Array(noteGeoms.length).fill(0);
    activeDimIdx = -1;
    // .dim width will be reset in onMove callback as well
    movable.reset();
  }

  // Imperative RAF loop controlled by beginHold/endHold
  let holdRafId: number | null = null;
  function startHoldAnimationLoop() {
    if (holdRafId || player.expectedMs <= 0) return;
    let prevProgress = 0;
    // let prevRestProgress = 0;
    const move = () => {
      const now = performance.now();
      const elapsed = now - player.startTs;
      player.progress = Math.min(elapsed / player.expectedMs, 1);
      const deltaProgress = Math.max(0, player.progress - prevProgress);
      if (deltaProgress > 0) {
        movable.nudgeBy(deltaProgress * player.expectedOffset);
        prevProgress = player.progress;
      }
      if (player.progress >= 1) {
        const next = nextNote();
        if (next != null && next instanceof RestDuration) {
          advanceAfterSuccess();
          prevProgress = 0;
          player.startTs = now;
          player.expectedMs = msFor(next);
          player.expectedOffset = widthFor(next);
        } else {
          cancelAnimationFrame(holdRafId!);
          holdRafId = null;
          return;
        }
      }
      holdRafId = requestAnimationFrame(move);
    };
    holdRafId = requestAnimationFrame(move);
  }
  function stopHoldAnimationLoop() {
    if (holdRafId) cancelAnimationFrame(holdRafId);
    holdRafId = null;
  }

  // --- Auto-play rests after key release ---
  let restRafId: number | null = null;
  function stopRestAutoRun() {
    if (restRafId) cancelAnimationFrame(restRafId);
    restRafId = null;
  }
  function progressForCurrentNote(): number {
    const g = currentNoteGeom();
    if (!g) return 0;
    const staffXToPlayhead = movable.currentOffsetX + barlineOffsetToNote;
    const passedFull = Math.max(0, staffXToPlayhead - g.x);
    const total = g.w + layoutBase.notesSpacing;
    if (total <= 0) return 0;
    return Math.min(1, passedFull / total);
  }
  function startRestAutoRun() {
    if (restRafId) return;
    // Only run if current is a rest
    const cur = currentDuration();
    if (!(cur instanceof RestDuration)) return;
    let prevProgress = 0;
    // Continue from the current progress within this rest
    let carryProgress = progressForCurrentNote();

    let startTs = performance.now();
    let expectedMs = msFor(cur) * (1 - carryProgress);
    let expectedOffset = widthFor(cur) * (1 - carryProgress);

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTs;
      const p = expectedMs > 0 ? Math.min(1, elapsed / expectedMs) : 1;
      const delta = Math.max(0, p - prevProgress);
      if (delta > 0) {
        movable.nudgeBy(delta * expectedOffset);
        prevProgress = p;
      }
      if (p >= 1) {
        // Completed this rest: advance and check subsequent items.
        advanceAfterSuccess();
        if (player.finished) {
          stopRestAutoRun();
          return;
        }
        const next = currentDuration();
        if (next instanceof RestDuration) {
          // Chain next rest
          prevProgress = 0;
          startTs = now;
          expectedMs = msFor(next);
          expectedOffset = widthFor(next);
        } else {
          // Reached next note: stop and align cleanly.
          stopRestAutoRun();
          alignToEdge();
          return;
        }
      }
      restRafId = requestAnimationFrame(step);
    };
    restRafId = requestAnimationFrame(step);
  }

  let midiKeyboard = getVirtualMidiKeyboard();
  // Track held piano keys to start/stop only on first press / last release.
  let heldPianoKeys = $state(new Set<string>());

  onMount(() => {
    midiKeyboard.turnOn();
    midiKeyboard.on('noteOn', (ev: any) => {
      const id = `${ev.note}${ev.octave}`;
      const wasEmpty = heldPianoKeys.size === 0;
      if (!heldPianoKeys.has(id)) {
        heldPianoKeys.add(id);
        heldPianoKeys = new Set(heldPianoKeys);
      }
      if (wasEmpty) {
        beginHold();
      }
    });
    midiKeyboard.on('noteOff', (ev: any) => {
      const id = `${ev.note}${ev.octave}`;
      if (heldPianoKeys.has(id)) {
        heldPianoKeys.delete(id);
        heldPianoKeys = new Set(heldPianoKeys);
      }
      if (heldPianoKeys.size === 0) {
        endHold();
      }
    });
    // Sync dim overlays while dragging or programmatic panning
    movable.onMove = () => {
      updateDimsSelective();
    };
    movable.onDragEnd = () => {
      if (!player.holding && restRafId == null) {
        snapPlayheadToNearestLeftEdge();
      }
    };
    return () => midiKeyboard.turnOff();
  });

  // turnOff is handled in onMount cleanup above
</script>

<h3>rhythm master v2</h3>

<div class="card" bind:this={cardEl}>
  <div class="staff-viewport">
    <div
      class="playhead"
      style:width="{layoutBase.cursorLineWidth}px"
      style:transform="translate3d({barlineOffsetToNote}px, 0, 0)"
    ></div>
    <div class="staff-line" bind:this={staffEl} {@attach movable.draggable()}>
      {#each rhythms as rhythm, m}
        <div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
        <div
          class="measure"
          style:width="{layoutBase.measureWidth}px"
          style:padding-left="{layoutDerived.measureLeftPadding}px"
          style:padding-right="{layoutDerived.measureRightPadding}px"
        >
          {#each rhythm as dura, i}
            <div
              class={['note', dura instanceof RestDuration ? 'rest' : '']}
              style:width="{noteWidth({ ...layoutBase }, dura)}px"
              style:margin="0 {layoutBase.notesSpacing / 2}px"
              data-duration={dura.toString()}
              data-m={m}
              data-i={i}
            >
              <div class="dim" style:width="{dimWidths[measureStartIdxs[m] + i]}px"></div>
            </div>
          {/each}
        </div>
      {/each}
      <div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
      <div
        class="measure padding"
        style:width="{layoutBase.measureWidth}px"
        style:padding-left="{layoutDerived.measureLeftPadding}px"
        style:padding-right="{layoutDerived.measureRightPadding}px"
      ></div>
    </div>
  </div>
</div>

<svelte:document
  onkeydown={(e) => {
    // Reset on 'r'
    if (e.key === 'r') {
      resetUI();
    }
  }}
/>

<style>
  .card {
    height: 140px;
    padding: 0 10px;
    background: #f5f5f5;
    margin: 16px;
    overflow: hidden; /* viewport for staff-line */
  }

  :root {
    --z-base: 0;
    --z-overlay: 2;
    --z-popover: 100;
  }

  .staff-viewport {
    width: 100%;
    height: 100%;
    margin-left: 90px;
    padding-left: 60px;
    overflow-x: hidden;
    position: relative;
  }

  .playhead {
    position: absolute;
    left: 60px; /* matches .padding-left of .staff-viewport */
    top: 8px;
    bottom: 8px;
    background: #dadada;
    opacity: 0.8;
    pointer-events: none;
    z-index: var(--z-overlay);
  }

  .staff-line {
    /* Use CSS Grid for horizontal flow; expand to content width */
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    align-items: center;
    /* set full height to align at center */
    height: 100%;
    width: max-content;
    touch-action: pan-y; /* allow vertical page scroll, lock horizontal to JS */
    will-change: transform;
    position: relative;
    z-index: var(--z-base);
  }

  .staff-line * {
    height: 33px;
  }

  .measure {
    background: white;
    white-space: nowrap;
    box-sizing: border-box;
  }

  .barline {
    background: #dadada;
  }

  .note {
    background: #708fff;
    position: relative;
    overflow: visible;
  }

  /* Dim overlay that fills the portion of the note left of the playhead while holding. */
  .dim {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0;
    background: rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }

  .rest {
    background: #c1cfff;
  }

  /* Rhythm player states */
  :global(.note) {
    transition: background 0.5s ease-in;
  }

  .measure > :first-child {
    margin-left: 0 !important;
  }
  .measure > :last-child {
    margin-right: 0 !important;
  }

  /* Notes/rests inline inside measure (no flex) */
  .measure > div {
    display: inline-block;
  }
</style>
