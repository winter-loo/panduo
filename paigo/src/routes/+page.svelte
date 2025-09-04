<script lang="ts">
	import { onMount } from 'svelte';
	import { StemmableNote, VexFlow } from '$lib/vexflow/vexflow-core';

	let notesContainer: HTMLDivElement;
	let fixedClef: HTMLDivElement;
	let vexflowLoaded = false;
	let vexflowError = '';

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
	VexFlow.STEM_WIDTH = 3;
	VexFlow.STEM_HEIGHT = 70;

	class MovingStaff {
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
			spaceBelowStaffLn: MovingStaff.numPaddingSpaces
		};

		clefStave: any;
		notesContainer: HTMLDivElement;
		renderer: any;
		context: any;
		staveX: number;
		notes: any[];
		movingOffset: number;

		constructor(clefElement: HTMLDivElement, notesElement: HTMLDivElement) {
			// draw the treble clef on the staff independently
			const TREBLE_CLEF_STAVE_WIDTH = 90;
			clefElement.innerHTML = '';
			const renderer = new VexFlow.Renderer(clefElement, VexFlow.Renderer.Backends.SVG);
			renderer.resize(TREBLE_CLEF_STAVE_WIDTH, MovingStaff.STAVE_HEIGHT);
			this.clefStave = new VexFlow.Stave(0, 0, TREBLE_CLEF_STAVE_WIDTH, {
				...MovingStaff.staveStyle,
				stillCursor: true
			});
			this.clefStave.addClef('treble');
			this.clefStave.setContext(renderer.getContext()).draw();

			this.notesContainer = notesElement;
			this.renderer = new VexFlow.Renderer(this.notesContainer, VexFlow.Renderer.Backends.SVG);

			// Configure the rendering context.
			// 45000 / 300 = 150 measures = 600 beats = 600 seconds = 10 minutes
			this.renderer.resize(30000, MovingStaff.STAVE_HEIGHT);
			this.context = this.renderer.getContext();
			// do not count the treble clef width
			this.staveX = 0;
			this.notes = [];

			this.movingOffset = 0;
		}

		addMeasure(notes: any[]) {
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

		move(offset: number) {
			this.notesContainer.style.transform = `translate3d(-${offset}px, 0, 0)`;
		}

		moveDelta(offset: number) {
			this.movingOffset += offset;
			this.move(this.movingOffset);
		}
	}

	const SONG_DATA = {
		title: 'Different Colors',
		artist: 'Walk the Moon',
		measures: [
			{
				notes: [
					{ keys: ['d/4'], duration: '4', fingering: 2 },
					{ keys: ['f/4'], duration: '8', fingering: 4 },
					{ keys: ['c/4'], duration: '8', fingering: 1 },
					{ keys: ['g/4'], duration: '2', fingering: null }
				]
			},
			{
				notes: [{ keys: ['b/4'], duration: '1', fingering: 5 }]
			}
		]
	};

	onMount(async () => {
		vexflowLoaded = true;
		// Initialize MovingStaff with bound DOM elements
		const movingStaff = new MovingStaff(fixedClef, notesContainer);

		// Example usage with SONG_DATA
		SONG_DATA.measures.forEach((measure) => {
			movingStaff.addMeasure(measure.notes);
		});
	});
</script>

<svelte:head>
	<title>paigo</title>
	<link rel="preload" href="/bravura.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="page">
	{#if vexflowError}
		<div class="error">
			<p>VexFlow Error: {vexflowError}</p>
		</div>
	{/if}

	<div id="moving-staff">
		<div bind:this={fixedClef}></div>
		<div id="notes-container-wrapper">
			<div id="notes-container" bind:this={notesContainer}></div>
		</div>
	</div>

	<button type="button" id="renderButton">rerender</button>
	<button type="button" id="pauseButton">pause</button>
	<button type="button" id="resumeButton">resume</button>
	<button type="button" id="resetButton">reset</button>

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

		.vf-pitch-C {
			color: #ce82ff;
			stroke: #ce82ff;
			fill: #ce82ff;
		}

		.vf-pitch-D {
			color: #ff9600;
			stroke: #ff9600;
			fill: #ff9600;
		}

		.vf-pitch-E {
			color: #58cc02;
			stroke: #58cc02;
			fill: #58cc02;
		}

		.vf-pitch-F {
			color: #cc348d;
			stroke: #cc348d;
			fill: #cc348d;
		}

		.vf-pitch-G {
			color: #708fff;
			stroke: #708fff;
			fill: #708fff;
		}

		.vf-pitch-A {
			color: #ff86d0;
			stroke: #ff86d0;
			fill: #ff86d0;
		}

		.vf-pitch-B {
			color: #00ce9f;
			stroke: #00ce9f;
			fill: #00ce9f;
		}
	</style>
</div>
