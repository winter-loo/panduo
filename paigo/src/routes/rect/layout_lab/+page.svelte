<script lang="ts">
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

	type BaseNoteValue = 1 | 2 | 4 | 8 | 16 | 32;
	class NoteDuration {
		baseNoteValue: BaseNoteValue;
		repeat: 1 | 3;

		constructor(baseNoteValue: BaseNoteValue, repeat: 1 | 3 = 1) {
			this.baseNoteValue = baseNoteValue;
			this.repeat = repeat;
		}
		toString(): string {
			return `${this.repeat}/${this.baseNoteValue}`;
		}
	}
	function notu(baseNoteValue: BaseNoteValue, repeat: 1 | 3 = 1): NoteDuration {
		return new NoteDuration(baseNoteValue, repeat);
	}

	// 1 2 4 8 16 32
	// 3/4 3/8 3/16 3/32
	function noteWidth(notu: NoteDuration): number {
		return (
			(notu.repeat * (layoutBase.measureWidth + layoutBase.barLineWidth)) / notu.baseNoteValue -
			(notu.baseNoteValue == 1 ? 0 : layoutBase.notesSpacing)
		);
	}

	const rhythms = [
		[notu(1)],
		[notu(2), notu(2)],
		[notu(4), notu(4), notu(4), notu(4)],
		[notu(8), notu(8), notu(8), notu(8), notu(8), notu(8), notu(8), notu(8)],
		[
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16),
			notu(16)
		],
		[notu(2), notu(4), notu(4)],
		[notu(2), notu(8), notu(8), notu(4)],
		[notu(8, 3), notu(8), notu(4), notu(4)],
		[notu(4, 3), notu(4)],
		[notu(4), notu(8), notu(8), notu(4), notu(8), notu(8)],
		[notu(2), notu(4), notu(8), notu(16), notu(16)]
	];
</script>

<div id="controls">
	<label for="measureWidth">measure width</label>
	<input
		id="measureWidth"
		type="number"
		bind:value={layoutBase.measureWidth}
		placeholder="select your number"
	/>
	<label for="barLineWidth">barline width</label>
	<input
		id="barLineWidth"
		type="number"
		bind:value={layoutBase.barLineWidth}
		placeholder="select your number"
	/>
	<label for="notesPadding">spacing between notes</label>
	<input
		id="notesPadding"
		type="number"
		bind:value={layoutBase.notesSpacing}
		placeholder="select your number"
	/>
</div>

<div id="layout-test">
	{#each rhythms as rhythm}
		<div class="card">
			<div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
			<div
				class="measure"
				style:width="{layoutBase.measureWidth}px"
				style:padding-left="{layoutDerived.measureLeftPadding}px"
				style:padding-right="{layoutDerived.measureRightPadding}px"
			>
				{#each rhythm as dura}
					<div
						class="note"
						style:width="{noteWidth(dura)}px"
						style:margin="0 {layoutBase.notesSpacing / 2}px"
						data-duration={dura.toString()}
					></div>
				{/each}
			</div>
			<div class="barline" style:width="{layoutBase.barLineWidth}px"></div>
		</div>
	{/each}
</div>

<style>
	#layout-test {
		display: flex;
		flex-flow: row wrap;
		justify-content: flex-start;
	}

	.card {
		height: 140px;
		padding: 20px 60px;
		background: #d9d9d9;
		margin: 16px;

		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}

	div.card * {
		height: 33px;
	}

	.measure {
		background: #eaeaea;
		display: flex;
		flex-flow: row nowrap;
		box-sizing: border-box;
	}

	.barline {
		background: black;
	}

	.note {
		background: #708fff;
	}

	.measure .note:first-child {
		margin-left: 0 !important;
	}
	.measure .note:last-child {
		margin-right: 0 !important;
	}
</style>
