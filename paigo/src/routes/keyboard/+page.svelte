<script lang="ts">
	import { onMount } from 'svelte';
	import { MetricsDefaults, VexFlow } from '$lib/vexflow/vexflow-core';
	import { getVirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';

	let midiKeyboard = getVirtualMidiKeyboard();

	let outputContainer: HTMLDivElement;
	let currentNotes = $state<string[]>([]);

	function showNote(noteNames: string[]) {
		VexFlow.Clef.DEBUG = true;
		VexFlow.NoteHead.DEBUG = true;
		VexFlow.NoteDonut.DEBUG = true;
		VexFlow.STEM_WIDTH = 3;
		VexFlow.STEM_HEIGHT = 70;

		// add padding before the first note
		MetricsDefaults.Stave.padding = 30;

		const renderer = new VexFlow.Renderer(outputContainer, VexFlow.Renderer.Backends.SVG);
		const width = 160;
		// 200 = 20 * (3 + 4 + 3)
		renderer.resize(width, 200);
		const stave = new VexFlow.Stave(0, 0, width, {
			spacingBetweenLinesPx: 20,
			spaceAboveStaffLn: 3,
			spaceBelowStaffLn: 3
		});
		stave.addClef('treble');
		const context = renderer.getContext();
		stave.setContext(context).draw();

		if (noteNames.length > 0) {
			// see note type in validNoteTypes in tables.ts
			let staveNote = new VexFlow.StaveNote({ keys: noteNames, duration: 'q', type: 'ci' });
			VexFlow.Formatter.FormatAndDraw(context, stave, [staveNote]);
		}
	}

	$effect(() => {
		outputContainer.innerHTML = '';
		showNote($state.snapshot(currentNotes));
	});

	onMount(() => {
		midiKeyboard.on('noteOn', (e) => {
			currentNotes.push(`${e.note}/${e.octave}`);
		});
		midiKeyboard.on('noteOff', (e) => {
			const note = `${e.note}/${e.octave}`;
			currentNotes.splice(currentNotes.indexOf(note), 1);
		});
	});
</script>

<div id="output" bind:this={outputContainer}></div>

<style>
	#output {
		position: absolute;
		top: 40px;
		left: 580px;
		transform: translate(-50%, 0);
	}

	@media (max-width: 768px) {
		#output {
			left: 380px;
		}
	}

	@media (max-width: 938px) {
		#output {
			left: 480px;
		}
	}
</style>
