<script lang="ts">
	import { draggable, axis, bounds } from '@neodrag/svelte';

</script>

<div class="draggable" {@attach draggable([axis('x')])}>
	Drag me around!
</div>

<style>
	.draggable {
		width: 2000px;
		height: 200px;
    background: #cacaca;
    border: 2px solid #77f0ff;
	}
</style>
