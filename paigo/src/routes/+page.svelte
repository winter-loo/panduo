<script lang="ts">
	import { onMount } from 'svelte';
	import { StemmableNote, VexFlow, type StaveNoteStruct } from '$lib/vexflow/vexflow-core';

	let BindingDom: {
		fixedClef?: HTMLDivElement;
		notesContainer?: HTMLDivElement;
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
	VexFlow.STEM_WIDTH = 3;
	VexFlow.STEM_HEIGHT = 70;

	class MovableElement {
		elementOffsetX: number;
		animationId?: number;
		maxOffsetX: number;

		constructor(maxOffsetX: number) {
			this.elementOffsetX = $state(0);
			this.maxOffsetX = maxOffsetX;
		}

		// see https://svelte.dev/docs/svelte/$state#Classes for the reason for
		// the style of this function definition.
		move = () => {
			const animate = () => {
				this.elementOffsetX += 1;
				if (this.elementOffsetX > this.maxOffsetX) {
					cancelAnimationFrame(this.animationId!);
					return;
				}
				this.animationId = requestAnimationFrame(animate);
			};

			this.animationId = requestAnimationFrame(animate);
		};

		// see https://svelte.dev/docs/svelte/$state#Classes for the reason for
		// the style of this function definition.
		stop = () => {
			if (this.animationId) cancelAnimationFrame(this.animationId);
		};

		// see https://svelte.dev/docs/svelte/$state#Classes for the reason for
		// the style of this function definition.
		reset = () => {
			this.elementOffsetX = 0;
			if (this.animationId) cancelAnimationFrame(this.animationId);
		};

		attachment = (element: HTMLElement) => {
			let isDragging = false;
			let dragStartX = 0;
			let containerStartX = 0;

			const onDragStart = (e: MouseEvent) => {
				isDragging = true;
				dragStartX = e.clientX;
				containerStartX = this.elementOffsetX;
			};

			const onDragging = (e: MouseEvent) => {
				if (isDragging) {
					// > 0 => moving right
					// < 0 => moving left
					let deltaX = e.clientX - dragStartX;
					if (Math.abs(deltaX) > 2) {
						const newX = Math.max(containerStartX - deltaX, 0);
						this.elementOffsetX = newX;
					}
				}
			};

			const onDragStop = (_e: MouseEvent) => {
				isDragging = false;
			};

			element.addEventListener('mousedown', onDragStart);
			element.addEventListener('mouseup', onDragStop);
			element.addEventListener('mousemove', onDragging);

			return () => {
				element.removeEventListener('mousedown', onDragStart);
				element.removeEventListener('mouseup', onDragStop);
				element.removeEventListener('mousemove', onDragging);
			};
		};
	}

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
			spaceBelowStaffLn: MovingStaff.numPaddingSpaces
		};

		clefStave: any;
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

	// this object must be initialized before `onMount` as we need get attachment
	// from this object.
	let movingStaff = new MovingStaff(SONG_DATA.measures.length * MovingStaff.MEASURE_WIDTH);

	function renderSong() {
		BindingDom.notesContainer!.innerHTML = '';

		movingStaff.init(BindingDom.fixedClef!, BindingDom.notesContainer!);
		SONG_DATA.measures.forEach((measure) => {
			movingStaff.addMeasure(measure.notes);
		});
	}

	onMount(async () => {
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
