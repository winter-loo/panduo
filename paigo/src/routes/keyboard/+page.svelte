<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Metrics, MetricsDefaults, VexFlow } from '$lib/vexflow/vexflow-core';
	import { getVirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';

	let outputContainer: HTMLDivElement;
	let currentNotes = $state<string[]>([]);

	function showNote(noteNames: string[]) {
		VexFlow.Clef.DEBUG = true;
		VexFlow.NoteHead.DEBUG = true;
		VexFlow.NoteDonut.DEBUG = true;

		const renderer = new VexFlow.Renderer(outputContainer, VexFlow.Renderer.Backends.SVG);
		const width = 160;
		// 200 = 20 * (3 + 4 + 3)
		renderer.resize(width, 600);
		const stave = new VexFlow.Stave(0, 0, width, {
			spacingBetweenLinesPx: 10,
			spaceAboveStaffLn: 17,
			spaceBelowStaffLn: 17,
			style: { lineWidth: 1 }
		});
		stave.addClef('treble');
		const context = renderer.getContext();
		stave.setContext(context).draw();

		if (noteNames.length > 0) {
			// see note type in validNoteTypes in tables.ts
			let staveNote = new VexFlow.StaveNote({ keys: noteNames, duration: 'q'});
			VexFlow.Formatter.FormatAndDraw(context, stave, [staveNote]);
		}
	}

	$effect(() => {
		outputContainer.innerHTML = '';
		showNote($state.snapshot(currentNotes));
	});

	let midiKeyboard = getVirtualMidiKeyboard();

	const OldStaffProps = {
		Stave: {
			padding: MetricsDefaults.Stave.padding
		}
	};

	onDestroy(() => {
		console.log('restoring staff properties 2');
		MetricsDefaults.Stave.padding = OldStaffProps.Stave.padding;
	});

	onMount(() => {
    // clear the internal cache of VexFlow
    Metrics.clear();
		MetricsDefaults.Stave.padding = 30;
    console.log('font size: ', MetricsDefaults.fontSize);

		midiKeyboard.turnOn();

		midiKeyboard.on('noteOn', (e) => {
			currentNotes.push(`${e.note}/${e.octave}`);
		});
		midiKeyboard.on('noteOff', (e) => {
			const note = `${e.note}/${e.octave}`;
			currentNotes.splice(currentNotes.indexOf(note), 1);
		});

		return () => midiKeyboard.turnOff();
	});
</script>

<div class="keyboard">
	<div id="output" bind:this={outputContainer}></div>
</div>
<h3>press any keys below to test:</h3>
<ul class="keymap">
	{#each midiKeyboard.keyboardMap() as keymap}
		<li>{keymap[0]}: {keymap[1]}</li>
	{/each}
</ul>

<style>
	#output {
		position: absolute;
		top: 40px;
		left: 580px;
		transform: translate(-50%, 0);
    display: flex;
    justify-content: center;
    align-items: center;
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

	.keyboard :global(.notedonut) {
		display: none;
	}
</style>
