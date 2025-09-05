<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from '../$types';
	import { Tickable, VexFlow, BlockNote, type NoteStruct } from '$lib/vexflow/vexflow-core';
	import { MovableElement } from '$lib/movable';

	const { data }: PageProps = $props();

	let vexflowError = $state('');
	try {
		// Initialize VexFlow safely
		const musicFontName = 'Bravura';
		VexFlow.setFonts(`${musicFontName}`);
	} catch (error) {
		console.error('VexFlow initialization error:', error);
		vexflowError = error instanceof Error ? error.message : 'Unknown error';
	}

	BlockNote.DEBUG = true;

	//
	// see [layout_measurement.md] for calculation in detail
	//
	// In summary, it's better to choose a number, say N, which is a multiple of 2, 4, 8, 16, 32.
	// and (measureWidth + barLineWidth) = N
	const layoutBase = $state({
		measureWidth: 349,
		barLineWidth: 3,
		notesPadding: 12,
		cursorLineWidth: 8
	});

	const layoutDerived = $derived({
		measureLeftPadding: Math.ceil((layoutBase.notesPadding - layoutBase.barLineWidth) / 2),
		measureRightPadding: Math.floor((layoutBase.notesPadding - layoutBase.barLineWidth) / 2),
		halfNoteWidth:
			(layoutBase.measureWidth + layoutBase.barLineWidth) / 2 - layoutBase.notesPadding,
		quarterNoteWidth:
			(layoutBase.measureWidth + layoutBase.barLineWidth) / 4 - layoutBase.notesPadding,
		eighthNoteWidth:
			(layoutBase.measureWidth + layoutBase.barLineWidth) / 8 - layoutBase.notesPadding,
		sixteenthNoteWidth:
			(layoutBase.measureWidth + layoutBase.barLineWidth) / 16 - layoutBase.notesPadding
	});

	class MovingStaff extends MovableElement {
		static MEASURE_WIDTH = 400;
		static STAVE_HEIGHT = 180;
		static spacingBetweenLinesPx = 20;
		static numPaddingSpaces = Math.floor(
			(MovingStaff.STAVE_HEIGHT - 4 * MovingStaff.spacingBetweenLinesPx) /
				2 /
				MovingStaff.spacingBetweenLinesPx
		);
		static staveStyle = {
			spacingBetweenLinesPx: MovingStaff.spacingBetweenLinesPx,
			spaceAboveStaffLn: MovingStaff.numPaddingSpaces,
			spaceBelowStaffLn: MovingStaff.numPaddingSpaces,
			style: {
				lineWidth: 3
			}
		};

		clefStave: any;
		notesContainer?: HTMLDivElement;
		renderer: any;
		context: any;
		staveX: number;
		notes: Tickable[];

		constructor(maxOffsetX: number) {
			super(maxOffsetX);
			this.staveX = 0;
			this.notes = [];
		}

		init(clefElement: HTMLDivElement, notesElement: HTMLDivElement) {
			// draw the treble clef on the staff independently
			const TREBLE_CLEF_STAVE_WIDTH = 120;
			clefElement.innerHTML = '';
			const renderer = new VexFlow.Renderer(clefElement, VexFlow.Renderer.Backends.SVG);
			renderer.resize(TREBLE_CLEF_STAVE_WIDTH, MovingStaff.STAVE_HEIGHT);
			this.clefStave = new VexFlow.Stave(0, 0, TREBLE_CLEF_STAVE_WIDTH, {
				...MovingStaff.staveStyle,
				stillCursor: true
			});
			this.clefStave.addClef('treble');
			this.clefStave.setContext(renderer.getContext()).draw();

			this.renderer = new VexFlow.Renderer(notesElement, VexFlow.Renderer.Backends.SVG);

			// Configure the rendering context.
			// 45000 / 300 = 150 measures = 600 beats = 600 seconds = 10 minutes
			this.renderer.resize(30000, MovingStaff.STAVE_HEIGHT);
			this.context = this.renderer.getContext();
			// do not count the treble clef width
			this.staveX = 0;
			this.notes = [];
		}

		addMeasure(notes: NoteStruct[]) {
			// add stave
			const measureStave = new VexFlow.Stave(this.staveX, 0, MovingStaff.MEASURE_WIDTH, {
				...MovingStaff.staveStyle
			});
			this.staveX += MovingStaff.MEASURE_WIDTH;
			// draw five staff lines and treble clef
			measureStave.setContext(this.context).draw();

			let blockNotes: BlockNote[] = [];
			notes.forEach((note) => {
				let sn = new BlockNote(note);
				blockNotes.push(sn);
				this.notes.push(sn);
				// NOTE: why does VexFlow not draw a dotted quarter note for me?
				if (note.duration.indexOf('d') != -1) {
					const dot = new VexFlow.Dot();
					sn.addModifier(dot, 0);
				}
			});
			if (blockNotes.length > 0) {
				VexFlow.Formatter.FormatAndDraw(this.context, measureStave, blockNotes);
			}
		}
	}

	let BindingDom: {
		fixedClef?: HTMLDivElement;
		notesContainer?: HTMLDivElement;
	} = {};

	// this object must be initialized before `onMount` as we need get attachment
	// from this object.
	let movingStaff = $state(new MovingStaff(data.song.measures.length * MovingStaff.MEASURE_WIDTH));

	function renderSong() {
		BindingDom.notesContainer!.innerHTML = '';

		movingStaff.init(BindingDom.fixedClef!, BindingDom.notesContainer!);
		data.song.measures.forEach((measure) => {
			movingStaff.addMeasure(measure.notes);
		});
	}

	onMount(() => {
		renderSong();
	});

	$inspect(layoutDerived).with(console.trace);
</script>

<svelte:document
	onkeydown={(e) => {
		if (e.key == 'r') movingStaff.reset();
	}}
/>

{#if vexflowError}
	<div class="error">
		<p>VexFlow Error: {vexflowError}</p>
	</div>
{/if}

<div id="moving-staff">
	<div bind:this={BindingDom.fixedClef}></div>
	<div id="notes-container-wrapper">
		<div
			id="notes-container"
			bind:this={BindingDom.notesContainer}
			{@attach movingStaff.attachment}
			style:transform="translate3d(-{movingStaff.elementOffsetX}px, 0, 0)"
		></div>
	</div>
</div>

<button type="button" id="renderButton" onclick={renderSong}>rerender</button>
<button type="button" id="pauseButton" onclick={movingStaff.stop}>pause</button>
<button type="button" id="resumeButton" onclick={movingStaff.move}>resume</button>
<button type="button" id="resetButton" onclick={movingStaff.reset}>reset</button>

<div>
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
	<label for="notesPadding">padding between notes</label>
	<input
		id="notesPadding"
		type="number"
		bind:value={layoutBase.notesPadding}
		placeholder="select your number"
	/>

</div>

<!-- {@debug layoutDerived} -->

<style>
	#moving-staff {
		display: flex;
		align-items: flex-start;
		flex-direction: row;
		position: relative;
		z-index: 2;
	}

	#notes-container-wrapper {
		width: 100%;
		overflow: hidden;
		cursor: grab;
		user-select: none;
		/* the distance being visible from the left of the still cursor line */
		margin-left: -40px;
	}

	#notes-container {
		/* the distance we need offset to keep whole notes area visible */
		/* the above 40px - 5px(the width of the still cursor line) */
		padding-left: 35px;
	}
</style>
