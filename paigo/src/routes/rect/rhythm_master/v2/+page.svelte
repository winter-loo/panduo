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

  let measureTotalWidth = rhythms.length * layoutBase.measureWidth;
  let barlineTotalWidth = (rhythms.length + 1) * layoutBase.barLineWidth;
  let staffLineWidth = measureTotalWidth + barlineTotalWidth;
  let movable = new MovableElement(0);

  let cardEl: HTMLDivElement;
  let staffEl: HTMLDivElement;
  onMount(() => {
    // Compute how far the wide staff can pan left, based on
    // content width (staffLineWidth) minus the visible viewport (.card).
    // This value is consumed by our custom neodrag clamp plugin
    // (see src/lib/movable.ts) which clamps translateX to [-maxOffsetX, 0].
    // We observe the container for resize to keep bounds accurate on layout changes.
    const updateBounds = () => {
      // Allow panning across the entire staff width.
      // Sum of all measures and barlines (computed in staffLineWidth) is used directly.
      movable.maxOffsetX = Math.max(0, staffLineWidth);
    };
    updateBounds();
    buildNoteGeoms();
    updateDimsSelective();
    const ro = new ResizeObserver(() => {
      updateBounds();
      buildNoteGeoms();
      updateDimsSelective();
    });
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

  function getNoteEl(m: number, i: number): HTMLElement | null {
    if (!staffEl) return null;
    return staffEl.querySelector(`.note[data-m="${m}"][data-i="${i}"]`);
  }

  // --- Shared helpers to reduce duplication ---
  function currentTarget() {
    return rhythms[player.current.m]?.[player.current.i];
  }

  function getCurrentEl() {
    return getNoteEl(player.current.m, player.current.i);
  }

  let viewportEl: HTMLDivElement | null = null;
  let playheadEl: HTMLDivElement | null = null;

  // Precomputed geometry for notes (content-space positions, no layout reads).
  type NoteGeom = { m: number; i: number; x: number; w: number; el: HTMLElement | null };
  let noteGeoms: NoteGeom[] = [];

  function buildNoteGeoms() {
    noteGeoms = [];
    let x = 0;
    for (let m = 0; m < rhythms.length; m++) {
      // Leading barline before each measure
      x += layoutBase.barLineWidth;
      // Inside measure: start after left padding
      let insideX = x + layoutDerived.measureLeftPadding;
      const seq = rhythms[m];
      for (let i = 0; i < seq.length; i++) {
        const dura = seq[i];
        const w = noteWidth({ ...layoutBase }, dura);
        const el = staffEl?.querySelector(
          `.note[data-m="${m}"][data-i="${i}"]`
        ) as HTMLElement | null;
        noteGeoms.push({ m, i, x: insideX, w, el });
        insideX += w + layoutBase.notesSpacing;
      }
      // Move to next measure start
      x += layoutBase.measureWidth;
    }
  }

  let lastIdx: number | null = null;

  function updateDimsSelective() {
    const startOffsetToNote = layoutBase.barLineWidth + layoutDerived.measureLeftPadding;
    const staffXToPlayhead = movable.currentOffsetX + startOffsetToNote;
    console.log('staffXToPlayhead=', staffXToPlayhead);
    if (noteGeoms.length === 0) return;
    // Find note under playhead or nearest by x
    let idx = -1;
    for (let i = 0; i < noteGeoms.length; i++) {
      const g = noteGeoms[i];
      if (staffXToPlayhead >= g.x && staffXToPlayhead <= g.x + g.w) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      let best = Infinity;
      let bestI = 0;
      for (let i = 0; i < noteGeoms.length; i++) {
        const d = Math.abs(staffXToPlayhead - noteGeoms[i].x);
        if (d < best) {
          best = d;
          bestI = i;
        }
      }
      idx = bestI;
    }

    // If playhead jumped across multiple notes, finalize dims for skipped notes
    if (lastIdx !== null && idx !== lastIdx) {
      if (idx > lastIdx) {
        // Moved forward: mark all notes between lastIdx and idx-1 as fully dimmed
        for (let j = lastIdx; j < idx; j++) {
          const g = noteGeoms[j];
          const dim = g.el?.querySelector('.dim') as HTMLElement | null;
          if (dim) dim.style.width = `${g.w}px`;
        }
      } else {
        // Moved backward: clear dims for notes between idx+1 and lastIdx
        for (let j = idx + 1; j <= lastIdx; j++) {
          const g = noteGeoms[j];
          const dim = g.el?.querySelector('.dim') as HTMLElement | null;
          if (dim) dim.style.width = '0px';
        }
      }
    }

    // Update current note and its neighbors precisely
    for (const j of [idx - 1, idx, idx + 1]) {
      if (j < 0 || j >= noteGeoms.length) continue;
      const g = noteGeoms[j];
      const passed = Math.min(g.w, Math.max(0, staffXToPlayhead - g.x));
      const dim = g.el?.querySelector('.dim') as HTMLElement | null;
      if (dim) dim.style.width = `${passed}px`;
    }

    lastIdx = idx;
  }

  let dimUpdateRaf: number | null = null;

  function alignNextToPlayhead() {
    if (!viewportEl) return;
    const nextEl = getCurrentEl();
    if (!nextEl) return;
    const targetLeft =
      playheadEl?.getBoundingClientRect().left ?? viewportEl.getBoundingClientRect().left;
    const nextRect = nextEl.getBoundingClientRect();
    const delta = nextRect.left - targetLeft;
    // if (Number.isFinite(delta) && delta > 0.5) {
      // movable.nudgeByAnimated(delta, 150);
    // }
    movable.nudgeBy(delta);
  }

  function advanceAfterSuccess() {
    // Movement during a successful hold is handled progressively in $effect.
    // Here we only advance the logical cursor to the next target.
    player.current.i += 1;
    if (player.current.i >= rhythms[player.current.m].length) {
      player.current.i = 0;
      player.current.m += 1;
    }
    if (player.current.m >= rhythms.length) {
      player.finished = true;
    }
  }

  type TargetKind = 'note' | 'rest';

  function beginHold() {
    if (player.finished) return;
    if (player.holding) return;

    const next = currentTarget();
    if (!next) return;
    // Precompute consecutive rests after this note for smooth auto-pan while holding
    let restMs = 0;
    let restOffset = 0;
    let mm = player.current.m;
    let ii = player.current.i + 1;
    while (mm < rhythms.length) {
      const seq = rhythms[mm];
      if (!seq) break;
      if (ii >= seq.length) {
        mm += 1;
        ii = 0;
        continue;
      }
      const nxt = seq[ii];
      if (!(nxt instanceof RestDuration)) break;
      restMs += msFor(nxt);
      restOffset += widthFor(nxt);
      ii += 1;
    }
    player.restMsAfter = restMs;
    player.restOffsetAfter = restOffset;

    player.holding = true;
    player.startTs = performance.now();
    player.expectedMs = msFor(next);
    player.expectedOffset = widthFor(next);
  }

  function endHold(kind: TargetKind) {
    if (!player.holding) return;
    const target = currentTarget();
    if (!target) return;
    const isRest = target instanceof RestDuration;
    const isNote = !isRest;
    if ((kind === 'note' && !isNote) || (kind === 'rest' && !isRest)) return;
    const now = performance.now();
    const held = now - player.startTs;
    const expected = player.expectedMs;
    player.holding = false;
    const el = getCurrentEl();
    if (held + TOL_MS >= expected) {
      if (el) {
        const dimEl = el.querySelector('.dim') as HTMLElement | null;
        if (dimEl) dimEl.style.width = '100%';
      }
      advanceAfterSuccess();
      if (player.finished) return;

      if (player.restMsAfter > 0) {
        // Avoid double-moving rests already panned during the hold
        const extraHeld = Math.max(0, held - expected);
        const restProgressAtRelease = Math.min(extraHeld / player.restMsAfter, 1);
        const alreadyMovedPx = restProgressAtRelease * player.restOffsetAfter;
        const remainingPx = player.restOffsetAfter - alreadyMovedPx;
        if (remainingPx > 0) {
          // Smoothly continue to the next non-rest note after release
          movable.nudgeByAnimated(remainingPx, player.restMsAfter - extraHeld);
          // setTimeout(() => alignNextToPlayhead(), 190);
        } else {
          alignNextToPlayhead();
        }
      } else {
        alignNextToPlayhead();
      }
    } else {
      // Incorrect duration: rollback the distance moved during this hold
      const fraction = Math.min(1, Math.max(0, held / expected));
      const rollbackPx = fraction * player.expectedOffset;
      if (rollbackPx > 0) {
        // the .dim width will change in onMove callback
        movable.adjustBy(-rollbackPx);
      }
    }
  }

  function resetUI() {
    player.current.m = 0;
    player.current.i = 0;
    player.holding = false;
    player.finished = false;
    player.startTs = 0;
    player.progress = 0;
    player.expectedMs = 0;
    // .dim width will be reset in onMove callback
    movable.reset();
  }

  // Progress animation lives in $effect so it automatically starts and stops
  // with the reactive state (player.holding, player.expectedMs). This ensures:
  // - The requestAnimationFrame loop only runs while a note/rest is being held.
  // - Cleanup happens reliably on dependency changes and on unmount, avoiding leaks.
  // - Progress is derived directly from timestamps each frame, staying in sync
  //   with paused/resumed holds and any scheduling jitter.
  let rafId: number | null = null;
  $effect(() => {
    if (player.holding && player.expectedMs > 0) {
      let prevProgress = 0;
      let prevRestProgress = 0;
      const tick = () => {
        if (prevProgress == 1) {
          console.log('frame cancelled 2');
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          return;
        }
        const now = performance.now();
        const elapsed = now - player.startTs;
        player.progress = Math.min(elapsed / player.expectedMs, 1);
        const deltaProgress = Math.max(0, player.progress - prevProgress);
        if (deltaProgress > 0) {
          movable.nudgeBy(deltaProgress * player.expectedOffset);
          prevProgress = player.progress;
        }
        // Continue sliding across consecutive rests while still holding
        // if (player.restMsAfter > 0) {
        //   const extraElapsed = Math.max(0, elapsed - player.expectedMs);
        //   const restProgress = Math.min(extraElapsed / player.restMsAfter, 1);
        //   const deltaRest = Math.max(0, restProgress - prevRestProgress);
        //   if (deltaRest > 0) {
        //     movable.nudgeBy(deltaRest * player.restOffsetAfter);
        //     prevRestProgress = restProgress;
        //   }
        // }
        // Update dim overlays for just the nearest notes
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        console.log('frame canceled');
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      };
    } else {
      player.progress = 0;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  });

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
        // Movement is driven per-frame in the $effect while holding
      }
    });
    midiKeyboard.on('noteOff', (ev: any) => {
      const id = `${ev.note}${ev.octave}`;
      if (heldPianoKeys.has(id)) {
        heldPianoKeys.delete(id);
        heldPianoKeys = new Set(heldPianoKeys);
      }
      if (heldPianoKeys.size === 0) {
        endHold('note');
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
  <div class="staff-viewport" bind:this={viewportEl}>
    <div
      class="playhead"
      style:width="{layoutBase.cursorLineWidth}px"
      style:transform="translate3d({layoutBase.barLineWidth + layoutDerived.measureLeftPadding}px,
      0, 0)"
      bind:this={playheadEl}
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
              <div class="dim"></div>
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
