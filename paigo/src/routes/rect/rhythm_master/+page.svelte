<script lang="ts">
	import { notu, noteWidth, rest, RestDuration, NoteDuration } from '../notu';
	import { MovableElement } from '$lib/movable';
	import { draggable } from '@neodrag/svelte';
	import { onMount } from 'svelte';
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
    [notu(1)],
    [notu(1)],
		[notu(4), rest(4), rest(2)],
		[rest(2), rest(4), notu(8), notu(8)],
		[notu(4), notu(4), notu(8), notu(8), rest(4)],
		[notu(8), notu(8), notu(4), notu(4), notu(8), notu(8)],
		[notu(4), notu(4), notu(4), notu(4)]
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
			const viewportWidth = cardEl?.clientWidth ?? 0;
			// Reuse the current formula for maxOffsetX
      const extra = viewportWidth / 2;
			movable.maxOffsetX = Math.max(0, staffLineWidth - viewportWidth) + extra;
		};
		updateBounds();
		const ro = new ResizeObserver(() => updateBounds());
		if (cardEl) ro.observe(cardEl);
		return () => ro.disconnect();
	});

	// --- Rhythm checking (metronome-only) ---
	const BPM = 60; // fixed
	const WHOLE_MS = 4 * (60_000 / BPM); // 4 beats in 4/4 at 60 BPM = 4000ms
	const TOL_MS = 40; // acceptance tolerance

	function durationFraction(d: NoteDuration) {
		return d.repeat / d.baseNoteValue;
	}
	function msFor(d: NoteDuration) {
		return durationFraction(d) * WHOLE_MS;
	}

	// Flatten playable notes (skip rests), preserving measure and index
	type Playable = { m: number; i: number; d: NoteDuration; ms: number };
	const playable: Playable[] = $derived.by(() => {
		const out: Playable[] = [];
		rhythms.forEach((measure: (NoteDuration | RestDuration)[], m: number) => {
			measure.forEach((d, i) => {
				if (!(d instanceof RestDuration)) {
					out.push({ m, i, d: d as NoteDuration, ms: msFor(d as NoteDuration) });
				}
			});
		});
		return out;
	});

	// Player state
	const player = $state({
		current: 0,
		holding: false,
		startTs: 0,
		finished: false,
		progress: 0,
		expectedMs: 0
	});

	function keyIsSpace(e: KeyboardEvent) {
		return e.code === 'Space' || e.key === ' ';
	}

	function getNoteEl(m: number, i: number): HTMLElement | null {
		if (!staffEl) return null;
		return staffEl.querySelector(`.note[data-m="${m}"][data-i="${i}"]`);
	}

	function getRestEl(m: number, i: number): HTMLElement | null {
		if (!staffEl) return null;
		return staffEl.querySelector(`.rest[data-m="${m}"][data-i="${i}"]`);
	}

	function nextIndex(m: number, i: number): { m: number; i: number } | null {
		const measure = rhythms[m];
		if (!measure) return null;
		if (i + 1 < measure.length) return { m, i: i + 1 };
		if (m + 1 < rhythms.length) return { m: m + 1, i: 0 };
		return null;
	}

	function consecutiveRestWidthAfter(m: number, i: number): number {
		let sum = 0;
		let idx = nextIndex(m, i);
		while (idx) {
			const dura = rhythms[idx.m][idx.i];
			if (!(dura instanceof RestDuration)) break;
			const el = getRestEl(idx.m, idx.i);
			const w = el?.getBoundingClientRect().width ?? 0;
			sum += w;
			idx = nextIndex(idx.m, idx.i);
		}
		return sum;
	}

	function clearActive() {
		staffEl?.querySelector('.note.active')?.classList.remove('active');
	}

	function resetUI() {
		player.current = 0;
		player.holding = false;
		player.finished = false;
		player.startTs = 0;
		player.progress = 0;
		player.expectedMs = 0;
		// remove classes
		staffEl?.querySelectorAll('.note.active').forEach((el) => el.classList.remove('active'));
		staffEl?.querySelectorAll('.note.success').forEach((el) => el.classList.remove('success'));
	}

	function isCurrent(m: number, i: number) {
		const t = playable[player.current];
		return !player.finished && !!t && t.m === m && t.i === i;
	}

	let rafId: number | null = null;
	$effect(() => {
		if (player.holding && player.expectedMs > 0) {
			const tick = () => {
				const now = performance.now();
				const elapsed = now - player.startTs;
				player.progress = Math.min(elapsed / player.expectedMs, 1);
				rafId = requestAnimationFrame(tick);
			};
			rafId = requestAnimationFrame(tick);
			return () => {
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
</script>

<h3>rhythm master</h3>

<div class="card" bind:this={cardEl}>
	<div class="staff-line" bind:this={staffEl} {@attach movable.draggable()}>
		<!-- <div class="staff-line" {@attach movable.draggable()} style:width="{staffLineWidth}px"> -->
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
						class={dura instanceof RestDuration ? 'rest' : 'note'}
						style:width="{noteWidth({ ...layoutBase }, dura)}px"
						style:margin="0 {layoutBase.notesSpacing / 2}px"
						data-duration={dura.toString()}
						data-m={m}
						data-i={i}
					>
						{#if !(dura instanceof RestDuration) && isCurrent(m, i) && player.holding}
							<div class="progress" style:width={`${Math.min(player.progress, 1) * 100}%`}></div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
		<div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
	</div>
</div>

<svelte:document
		onkeydown={(e) => {
			// Reset on 'r'
			if (e.key === 'r') {
				resetUI();
				return;
			}
			if (!keyIsSpace(e)) return;
			e.preventDefault();
			if (player.finished) return;
			if (e.repeat) return; // ignore key repeat
			if (player.holding) return;
			const target = playable[player.current];
			if (!target) return;
			const el = getNoteEl(target.m, target.i);
			if (el) el.classList.add('active');
			player.holding = true;
			player.startTs = performance.now();
			player.expectedMs = target.ms;
		}}
		onkeyup={(e) => {
			if (!keyIsSpace(e)) return;
			e.preventDefault();
			if (!player.holding) return;
			const now = performance.now();
			const held = now - player.startTs;
			const target = playable[player.current];
			player.holding = false;
			if (!target) return;
			const el = getNoteEl(target.m, target.i);
			const expected = target.ms;
			if (held + TOL_MS >= expected) {
				// success
				if (el) {
					el.classList.remove('active');
					el.classList.add('success');
				}
				// Animate staff left by the played note's width plus any consecutive rests after it
				const wNote = el?.getBoundingClientRect().width ?? 0;
				const wRests = consecutiveRestWidthAfter(target.m, target.i);
				movable.nudgeByAnimated(wNote + wRests, 240);
				player.current += 1;
				if (player.current >= playable.length) {
					player.finished = true;
				}
			} else {
				// failure: stay on same note
				if (el) el.classList.remove('active');
			}
		}}
/>

<style>
	.card {
		height: 140px;
		padding: 0 10px;
		background: #d9d9d9;
		margin: 16px;
		overflow: hidden; /* viewport for staff-line */
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
	}

	.staff-line * {
		height: 33px;
	}

	.measure {
		background: #eaeaea;
		white-space: nowrap;
		box-sizing: border-box;
	}

	.barline {
		background: black;
	}

	.note {
		background: #708fff;
		position: relative;
		overflow: hidden;
	}

	.rest {
		background: #c1cfff;
	}

	/* Rhythm player states */
	:global(.note.active) {
		background: #5c7aff;
	}
	:global(.note.success) {
		background: #2ecc71;
	}

	/* Active hold progress overlay */
	.progress {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: rgba(0, 0, 0, 0.15);
		pointer-events: none;
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
