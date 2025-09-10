<script lang="ts">
	import { notu, noteWidth, rest, RestDuration, NoteDuration } from '$lib/notu';
	import { MovableElement } from '$lib/movable';
	import { onMount } from 'svelte';
	import { getVirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';
	import { page } from '$app/state';

	const PagePath = page.url.pathname;

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
	const TOL_MS = 30; // acceptance tolerance

	function durationFraction(d: NoteDuration) {
		return d.repeat / d.baseNoteValue;
	}
	function msFor(d: NoteDuration) {
		return durationFraction(d) * WHOLE_MS;
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
		expectedMs: 0
	});

	function keyIsKeyH(e: KeyboardEvent) {
		return e.code === 'KeyH';
	}

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

	function advanceAfterSuccess(el: HTMLElement | null) {
		const w = el?.getBoundingClientRect().width ?? 0;
		movable.nudgeByAnimated(w, 240);
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

	function beginHold(kind: TargetKind) {
		if (player.finished) return;
		if (player.holding) return;
		const target = currentTarget();
		if (!target) return;
		const isRest = target instanceof RestDuration;
		const isNote = !isRest;
		if ((kind === 'note' && !isNote) || (kind === 'rest' && !isRest)) return;
		const el = getCurrentEl();
		if (el) el.classList.add('active');
		player.holding = true;
		player.startTs = performance.now();
		player.expectedMs = msFor(target);
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
				el.classList.remove('active');
				el.classList.add('success');
			}
			advanceAfterSuccess(el);
		} else {
			if (el) el.classList.remove('active');
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
		// remove classes
		staffEl?.querySelectorAll('.note.active').forEach((el) => el.classList.remove('active'));
		staffEl?.querySelectorAll('.note.success').forEach((el) => el.classList.remove('success'));
		movable.reset();
	}

	function isCurrent(m: number, i: number) {
		return !player.finished && player.current.m === m && player.current.i === i;
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

	let midiKeyboard = getVirtualMidiKeyboard();

	onMount(() => {
		midiKeyboard.turnOn();
		midiKeyboard.on('noteOn', () => beginHold('note'));
		midiKeyboard.on('noteOff', () => endHold('note'));
		return () => midiKeyboard.turnOff();
	});

	// turnOff is handled in onMount cleanup above
</script>

<h3>rhythm master</h3>
<a href="{PagePath}/v2">v2</a>

<div class="card" bind:this={cardEl}>
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
						{#if isCurrent(m, i) && player.holding}
							<div
								class="progress"
								style:width={`${Math.min(player.progress, 1) * (noteWidth({ ...layoutBase }, dura) + layoutBase.notesSpacing)}px`}
							></div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
		<div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
		<div
			class="measure"
			style:width="{layoutBase.measureWidth}px"
			style:padding-left="{layoutDerived.measureLeftPadding}px"
			style:padding-right="{layoutDerived.measureRightPadding}px"
		></div>
	</div>
</div>

<svelte:document
	onkeydown={(e) => {
		// Reset on 'r'
		if (e.key === 'r') {
			resetUI();
			return;
		}
		if (!keyIsKeyH(e)) return;
		e.preventDefault();
		if (e.repeat) return; // ignore key repeat
		beginHold('rest');
	}}
	onkeyup={(e) => {
		if (!keyIsKeyH(e)) return;
		e.preventDefault();
		endHold('rest');
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
		overflow: visible;
	}

	.rest {
		background: #c1cfff;
	}

	/* Rhythm player states */
	:global(.note.active) {
		background: #5c7aff;
	}
	:global(.note.rest.active) {
		background: #c1cfff;
	}
	:global(.note.success) {
		background: #58cc02;
	}
	:global(.note.rest.success) {
		background: #b9e3a8;
	}
	:global(.note) {
		transition: background 0.5s ease-in;
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
