<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		Metrics,
		MetricsDefaults,
		Stave,
		StemmableNote,
		VexFlow,
		type StaveNoteStruct
	} from '$lib/vexflow/vexflow-core';
	import type { PageProps } from './$types';
	import { MovableElement } from '$lib/movable';
  import { Button } from "$lib/components/ui/button/index";

	const { data }: PageProps = $props();

	let BindingDom: {
		fixedClef?: HTMLElement;
		notesContainer?: HTMLElement;
	} = {};

	let vexflowError = $state('');
	try {
		// Initialize VexFlow safely
		const musicFontName = 'Bravura';
		VexFlow.setFonts(`${musicFontName}`);
	} catch (error) {
		console.error('VexFlow initialization error:', error);
		vexflowError = error instanceof Error ? error.message : 'Unknown error';
	}

	VexFlow.NoteHead.DEBUG = true;
	VexFlow.Stem.DEBUG = true;
	VexFlow.StaveNote.DEBUG = true;
	VexFlow.Formatter.DEBUG = true;
	VexFlow.EasyScore.DEBUG = true;
	VexFlow.ModifierContext.DEBUG = true;

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

		notesContainer?: HTMLDivElement;
		renderer: any;
		context: any;
		staveX: number;
		notes: StemmableNote[];

		constructor(maxOffsetX: number) {
			super(maxOffsetX);
			this.staveX = 0;
			this.notes = [];
		}

		init(clefElement: HTMLElement, notesElement: HTMLElement) {
			// draw the treble clef on the staff independently
			const TREBLE_CLEF_STAVE_WIDTH = 120;
			clefElement.innerHTML = '';
			const renderer = new VexFlow.Renderer(
				clefElement as HTMLDivElement,
				VexFlow.Renderer.Backends.SVG
			);
			renderer.resize(TREBLE_CLEF_STAVE_WIDTH, MovingStaff.STAVE_HEIGHT);
			let clefStave = new Stave(0, 0, TREBLE_CLEF_STAVE_WIDTH, {
				...MovingStaff.staveStyle,
				stillCursor: true
			});
			clefStave.addClef('treble', {
				style: {
					fillStyle: '#afafaf'
				}
			});
			clefStave.setContext(renderer.getContext()).draw();

			this.renderer = new VexFlow.Renderer(
				notesElement as HTMLDivElement,
				VexFlow.Renderer.Backends.SVG
			);

			// Configure the rendering context.
			// 45000 / 300 = 150 measures = 600 beats = 600 seconds = 10 minutes
			this.renderer.resize(30000, MovingStaff.STAVE_HEIGHT);
			this.context = this.renderer.getContext();
			// do not count the treble clef width
			this.staveX = 0;
			this.notes = [];
		}

		addMeasure(notes: StaveNoteStruct[]) {
			// add stave
			const measureStave = new VexFlow.Stave(this.staveX, 0, MovingStaff.MEASURE_WIDTH, {
				...MovingStaff.staveStyle
			});
			this.staveX += MovingStaff.MEASURE_WIDTH;
			// draw five staff lines and treble clef
			measureStave.setContext(this.context).draw();

			let staveNotes: StemmableNote[] = [];
			notes.forEach((note) => {
				let sn = new VexFlow.StaveNote(note);
				staveNotes.push(sn);
				this.notes.push(sn);
				// NOTE: why does VexFlow not draw a dotted quarter note for me?
				if (note.duration.indexOf('d') != -1) {
					const dot = new VexFlow.Dot();
					sn.addModifier(dot, 0);
				}
			});
			if (staveNotes.length > 0) {
				VexFlow.Formatter.FormatAndDraw(this.context, measureStave, staveNotes);
			}
		}
	}

	const maxOffsetX = data.song.measures.length * MovingStaff.MEASURE_WIDTH;
	let movingStaff = new MovingStaff(maxOffsetX);

	function renderSong() {
		BindingDom.notesContainer!.innerHTML = '';

		movingStaff.init(BindingDom.fixedClef!, BindingDom.notesContainer!);
		data.song.measures.forEach((measure) => {
			movingStaff.addMeasure(measure.notes);
		});
	}

	let OldStaffProps: any;
	onDestroy(() => {
		if (OldStaffProps) VexFlow.STEM_WIDTH = OldStaffProps.stemWidth;
		if (OldStaffProps) VexFlow.STEM_HEIGHT = OldStaffProps.stemHeight;
		if (OldStaffProps) MetricsDefaults.fontSize = OldStaffProps.fontSize;
	});
	onMount(async () => {
		Metrics.clear();
		OldStaffProps = {
			stemWidth: VexFlow.STEM_WIDTH,
			stemHeight: VexFlow.STEM_HEIGHT,
			fontSize: MetricsDefaults.fontSize
		};

		VexFlow.STEM_WIDTH = 3;
		VexFlow.STEM_HEIGHT = 70;
		MetricsDefaults.fontSize = 60;
		renderSong();
	});
</script>

<Button variant="link" href="/layout">layout</Button>

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
