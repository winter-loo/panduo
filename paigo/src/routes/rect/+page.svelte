<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { PageProps } from '../$types';
	import {
		Tickable,
		VexFlow,
		BlockNote,
		type NoteStruct,
		MetricsDefaults,
		Metrics
	} from '$lib/vexflow/vexflow-core';
	import { MovableElement } from '$lib/movable';
	import { page } from '$app/state';
	import { Tables } from '$lib/vexflow/src/tables';
  import { Button } from "$lib/components/ui/button/index";

	const PagePath = page.url.pathname;

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
		notesSpacing: 12,
		cursorLineWidth: 8
	});

	const layoutDerived = $derived({
		measureLeftPadding: Math.ceil((layoutBase.notesSpacing - layoutBase.barLineWidth) / 2),
		measureRightPadding: Math.floor((layoutBase.notesSpacing - layoutBase.barLineWidth) / 2)
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
				lineWidth: 3,
				strokeStyle: '#dadada'
			},
			leftBar: {
				width: 3,
				style: {
					fillStyle: '#dadada'
				}
			},
			rightBar: {
				width: 3,
				style: {
					fillStyle: '#dadada'
				}
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
			this.clefStave.addClef('treble', {
				style: {
					fillStyle: '#afafaf'
				}
			});
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

	const maxOffsetX = data.song.measures.length * MovingStaff.MEASURE_WIDTH;
	let movingStaff = new MovingStaff(maxOffsetX);

	function renderSong() {
		BindingDom.notesContainer!.innerHTML = '';

		movingStaff.init(BindingDom.fixedClef!, BindingDom.notesContainer!);
		data.song.measures.forEach((measure) => {
			console.log('add new measure');
			movingStaff.addMeasure(measure.notes);
		});
	}

	let OldStaffProps: any;
	onDestroy(() => {
		if (OldStaffProps) Tables.STEM_HEIGHT = OldStaffProps.STEM_HEIEGHT;
		if (OldStaffProps) Tables.STEM_WIDTH = OldStaffProps.STEM_WIDTH;
		if (OldStaffProps) MetricsDefaults.fontSize = OldStaffProps.FOTN_SIZE;
	});

	onMount(() => {
		// clear the internal cache of VexFlow
		Metrics.clear();
		OldStaffProps = {
			STEM_HEIEGHT: Tables.STEM_HEIGHT,
			STEM_WIDTH: Tables.STEM_WIDTH,
			FOTN_SIZE: MetricsDefaults.fontSize
		};

		Tables.STEM_HEIGHT = 70;
		Tables.STEM_WIDTH = 3;
		MetricsDefaults.fontSize = 60;

		renderSong();
	});
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

<nav>
	<Button variant="link" href={`${PagePath}/layout_lab`}>layout experiments</Button>
	<Button variant="link" href={`${PagePath}/rhythm_master`}>rhythm master</Button>

	<style>
		nav {
			display: flex;
			flex-flow: row wrap;
			justify-content: flex-start;
			margin-bottom: 8px;
		}
		.nav-item {
			padding: 2px 6px;
		}
	</style>
</nav>

<div id="moving-staff">
	<div bind:this={BindingDom.fixedClef}></div>
	<div id="notes-container-wrapper">
		<div
			id="notes-container"
			bind:this={BindingDom.notesContainer}
			{@attach movingStaff.draggable()}
		></div>
	</div>
</div>

<Button id="renderButton" onclick={renderSong}>rerender</Button>
<Button id="pauseButton" onclick={movingStaff.stop}>pause</Button>
<Button id="resumeButton" onclick={movingStaff.move}>resume</Button>
<Button id="resetButton" onclick={movingStaff.reset}>reset</Button>

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
