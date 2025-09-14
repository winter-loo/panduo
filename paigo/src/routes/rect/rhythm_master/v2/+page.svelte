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
    cursorLineWidth: 8
  });

  const layoutDerived = $derived({
    measureLeftPadding: Math.ceil((layoutBase.notesSpacing - layoutBase.barLineWidth) / 2),
    measureRightPadding: Math.floor((layoutBase.notesSpacing - layoutBase.barLineWidth) / 2)
  });
  const barlineOffsetToNote = $derived(layoutBase.barLineWidth + layoutDerived.measureLeftPadding);

  // whole: 340 + 12 = 352
  // half: 164 + 12 = 176
  // quarter: 76 + 12 = 88
  // eighth: 32 + 12 = 44
  const rhythms: any = [
    [notu(2), rest(2)],
    // [notu(4), rest(4), rest(2)],
    // [rest(2), rest(4), notu(8), notu(8)],
    [notu(4), notu(4), notu(8), notu(8), rest(4)],
    [notu(8), notu(8), notu(4), notu(4), notu(8), notu(8)],
    [notu(4), notu(4), notu(4), notu(4)],
    [notu(1)]
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
      i: 0
    },
    holding: false,
    startTs: 0,
    finished: false,
    progress: 0,
    expectedMs: 0,
    expectedOffset: 0,
    restMsAfter: 0,
    restOffsetAfter: 0
  });

  // --- Shared helpers to reduce duplication ---
  function currentNote() {
    return rhythms[player.current.m]?.[player.current.i];
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
  }

  // Binary search for note index by effectiveX (content-space playhead X)
  function findNoteIndex(effectiveX: number): number {
    if (noteGeoms.length === 0) return -1;
    let lo = 0,
      hi = noteGeoms.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (noteGeoms[mid].x <= effectiveX) lo = mid + 1;
      else hi = mid;
    }
    const idx = Math.max(0, lo - 1);
    // Prefer containing note; if outside width, choose nearest by x
    if (effectiveX >= noteGeoms[idx].x && effectiveX <= noteGeoms[idx].x + noteGeoms[idx].w)
      return idx;
    // Check neighbor to decide nearest
    const leftDist = Math.abs(effectiveX - noteGeoms[idx].x);
    const rightIdx = Math.min(noteGeoms.length - 1, idx + 1);
    const rightDist = Math.abs(effectiveX - noteGeoms[rightIdx].x);
    return rightDist < leftDist ? rightIdx : idx;
  }

  let lastIdx: number | null = null;

  // function updateDimsSelective() {
  //   const staffXToPlayhead = movable.currentOffsetX + barlineOffsetToNote;
  //   const g = currentNoteGeom();
  //   const passed = Math.min(g.w, Math.max(0, staffXToPlayhead - g.x));
  //   dimWidths[currentNoteGeomIndex()] = passed;
  // }

  function updateDimsSelective() {
    const staffXToPlayhead = movable.currentOffsetX + barlineOffsetToNote;
    const idx = findNoteIndex(staffXToPlayhead);

    // If playhead jumped across multiple notes, finalize dims for skipped notes
    if (lastIdx !== null && idx !== lastIdx) {
      const jump = Math.abs(idx - lastIdx);
      const BATCH_THRESHOLD = 16;
      if (idx > lastIdx) {
        // Moved forward: mark all notes between lastIdx and idx-1 as fully dimmed
        if (jump > BATCH_THRESHOLD) {
          const next = dimWidths.slice();
          for (let j = lastIdx; j < idx; j++) next[j] = noteGeoms[j].w;
          dimWidths = next;
        } else {
          for (let j = lastIdx; j < idx; j++) dimWidths[j] = noteGeoms[j].w;
        }
      } else {
        // Moved backward: clear dims for notes between idx+1 and lastIdx
        if (jump > BATCH_THRESHOLD) {
          const next = dimWidths.slice();
          for (let j = idx + 1; j <= lastIdx; j++) next[j] = 0;
          dimWidths = next;
        } else {
          for (let j = idx + 1; j <= lastIdx; j++) dimWidths[j] = 0;
        }
      }
    }

    // Update current note and its neighbors precisely
    for (const j of [idx - 1, idx, idx + 1]) {
      if (j < 0 || j >= noteGeoms.length) continue;
      const passed = Math.min(noteGeoms[j].w, Math.max(0, staffXToPlayhead - noteGeoms[j].x));
      dimWidths[j] = passed;
    }

    lastIdx = idx;
  }

  let dimUpdateRaf: number | null = null;

  function alignToCurrentNote() {
    const g = currentNoteGeom();
    if (!g) return;
    const desiredOffset = g.x - barlineOffsetToNote;
    movable.moveTo(desiredOffset, 0);
  }

  function advanceAfterSuccess() {
    player.current.i += 1;
    if (player.current.i >= rhythms[player.current.m].length) {
      player.current.i = 0;
      player.current.m += 1;
    }
    if (player.current.m >= rhythms.length) {
      player.finished = true;
    }
  }

  function restsAfterNote() {
    // Sum consecutive rests after the current item for smooth auto-pan while holding
    let restMs = 0;
    let restOffset = 0;
    const dura = currentNote();
    const start = currentNoteGeomIndex() + 1;
    for (let k = start; k < noteGeoms.length; k++) {
      const g = noteGeoms[k];
      if (!(dura instanceof RestDuration)) break;
      restMs += msFor(dura);
      restOffset += g.w + layoutBase.notesSpacing;
    }
    return { duration: restMs, width: restOffset };
  }

  function beginHold() {
    if (player.finished) return;
    if (player.holding) return;

    const next = currentNote();
    if (!next) return;

    player.holding = true;
    player.startTs = performance.now();
    player.expectedMs = msFor(next);
    player.expectedOffset = widthFor(next);

    const rests = restsAfterNote();
    player.restMsAfter = rests.duration;
    player.restOffsetAfter = rests.width;

    startHoldAnimationLoop();
  }

  function endHold() {
    if (!player.holding) return;
    const now = performance.now();
    const held = now - player.startTs;
    const expected = player.expectedMs;
    player.holding = false;
    stopHoldAnimationLoop();
    if (held + TOL_MS >= expected) {
      advanceAfterSuccess();
      if (player.finished) return;
    }
    alignToCurrentNote();
  }

  function resetUI() {
    stopHoldAnimationLoop();
    if (dimUpdateRaf) cancelAnimationFrame(dimUpdateRaf);
    dimUpdateRaf = null;
    player.current.m = 0;
    player.current.i = 0;
    player.holding = false;
    player.finished = false;
    player.startTs = 0;
    player.progress = 0;
    player.expectedMs = 0;
    // Quick reset of dim overlays
    dimWidths = Array(noteGeoms.length).fill(0);
    lastIdx = null;
    // .dim width will be reset in onMove callback as well
    movable.reset();
  }

  // Imperative RAF loop controlled by beginHold/endHold
  let holdRafId: number | null = null;
  function startHoldAnimationLoop() {
    if (holdRafId || player.expectedMs <= 0) return;
    let prevProgress = 0;
    let prevRestProgress = 0;
    const move = () => {
      const now = performance.now();
      const elapsed = now - player.startTs;
      player.progress = Math.min(elapsed / player.expectedMs, 1);
      const deltaProgress = Math.max(0, player.progress - prevProgress);
      if (deltaProgress > 0) {
        movable.nudgeBy(deltaProgress * player.expectedOffset);
        prevProgress = player.progress;
      }
      // Continue sliding across consecutive rests while still holding
      if (player.restMsAfter > 0) {
        const extraElapsed = Math.max(0, elapsed - player.expectedMs);
        const restProgress = Math.min(extraElapsed / player.restMsAfter, 1);
        const deltaRest = Math.max(0, restProgress - prevRestProgress);
        if (deltaRest > 0) {
          movable.nudgeBy(deltaRest * player.restOffsetAfter);
          prevRestProgress = restProgress;
        }
      }
      // Stop animating once we've completed all planned movement (note + following rests)
      const totalMs = player.expectedMs + (player.restMsAfter || 0);
      const totalProg = Math.min(1, totalMs > 0 ? elapsed / totalMs : 1);
      if (totalProg >= 1) {
        cancelAnimationFrame(holdRafId!);
        holdRafId = null;
        return;
      }
      holdRafId = requestAnimationFrame(move);
    };
    holdRafId = requestAnimationFrame(move);
  }
  function stopHoldAnimationLoop() {
    if (holdRafId) cancelAnimationFrame(holdRafId);
    holdRafId = null;
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
      // Schedule after transform is applied to avoid a 1-frame lag
      if (dimUpdateRaf) cancelAnimationFrame(dimUpdateRaf);
      dimUpdateRaf = requestAnimationFrame(() => {
        dimUpdateRaf = null;
        updateDimsSelective();
      });
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
