<script lang="ts">
	import { notu, noteWidth, rest, RestDuration } from '../notu';
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

	const rhythms: any = [
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
</script>

<h3>rhythm master</h3>

<div class="card" bind:this={cardEl}>
	<div class="staff-line" {@attach movable.draggable()}>
		<!-- <div class="staff-line" {@attach movable.draggable()} style:width="{staffLineWidth}px"> -->
		{#each rhythms as rhythm}
			<div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
			<div
				class="measure"
				style:width="{layoutBase.measureWidth}px"
				style:padding-left="{layoutDerived.measureLeftPadding}px"
				style:padding-right="{layoutDerived.measureRightPadding}px"
			>
				{#each rhythm as dura}
					<div
						class={dura instanceof RestDuration ? 'rest' : 'note'}
						style:width="{noteWidth({ ...layoutBase }, dura)}px"
						style:margin="0 {layoutBase.notesSpacing / 2}px"
						data-duration={dura.toString()}
					></div>
				{/each}
			</div>
		{/each}
		<div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
	</div>
</div>

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
	}

	.rest {
		background: #c1cfff;
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
