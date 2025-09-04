<script lang="ts">
	import { onMount } from 'svelte';
	import { VexFlow } from '$lib/vexflow/vexflow-core';
	import { VirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';

  let outputContainer: HTMLElement;

	let midiKeyboard = new VirtualMidiKeyboard({ audioSamplesUri: '/audio/' });

	midiKeyboard.connect().then(() => {
		console.log('midi keyboard connected');
	});

	midiKeyboard.on('noteOn', (e) => {
		console.log('noteOn ', e);
    showNote(`${e.noteName}${e.octave}`);
	});
	midiKeyboard.on('noteOff', (e) => {
		console.log('noteOff ', e);
    outputContainer.innerHTML = '';
	});

	function showNote(noteName: string) {
		const factory = new VexFlow.Factory({
			renderer: { elementId: 'output', width: 300, height: 180 }
		});

		const score = factory.EasyScore();
		const system = factory.System();

		system
			.addStave({
				voices: [score.voice(score.notes(noteName)).setMode(VexFlow.Voice.Mode.SOFT)]
			})
			.addClef('treble')
			.addTimeSignature('4/4');

		factory.draw();
	}

	onMount(() => {
		showNote('C4');
	});
</script>

<div id="output" bind:this={outputContainer}></div>
