<script lang="ts">
	let { children } = $props();

	// Organize all UI state in a single object
	const S = $state({
		grid: {
			unit: 10,
			width: 800,
			visible: false
		},
		mouse: {
			x: 0,
			y: 0
		}
	});

	console.log('layout page loading...');

	let containerElement: HTMLDivElement;
	const gridHeight = 300;

	// Reactive grid generation
	const D = $derived({
		grid: {
			vlines: generateVerticalLines(S.grid.unit, S.grid.width, gridHeight),
			hlines: generateHorizontalLines(S.grid.unit, S.grid.width, gridHeight),
			labels: generateCoordinateLabels(S.grid.unit, S.grid.width, gridHeight)
		}
	});

	function generateVerticalLines(size: number, width: number, height: number) {
		const lines = [];
		for (let x = 0; x <= width; x += size) {
			lines.push({
				x1: x,
				y1: 0,
				x2: x,
				y2: height,
				stroke: x % (size * 5) === 0 ? '#ff0000' : '#cccccc',
				strokeWidth: x % (size * 5) === 0 ? '1' : '0.5'
			});
		}
		return lines;
	}

	function generateHorizontalLines(size: number, width: number, height: number) {
		const lines = [];
		for (let y = 0; y <= height; y += size) {
			lines.push({
				x1: 0,
				y1: y,
				x2: width,
				y2: y,
				stroke: y % (size * 5) === 0 ? '#ff0000' : '#cccccc',
				strokeWidth: y % (size * 5) === 0 ? '1' : '0.5'
			});
		}
		return lines;
	}

	function generateCoordinateLabels(size: number, width: number, height: number) {
		const labels = [];

		// X-axis labels
		for (let x = 0; x <= width; x += size * 5) {
			labels.push({
				x: x + 2,
				y: 12,
				text: x.toString(),
				type: 'x'
			});
		}

		// Y-axis labels
		for (let y = size * 5; y <= height; y += size * 5) {
			labels.push({
				x: 2,
				y: y - 2,
				text: y.toString(),
				type: 'y'
			});
		}

		return labels;
	}

	function toggleGrid() {
		S.grid.visible = !S.grid.visible;
	}

	function changeGridSize(size: number) {
		S.grid.unit = size;
	}

	function showCursorPosition(e: MouseEvent) {
		if (!containerElement) return;

		const rect = containerElement.getBoundingClientRect();
		S.mouse.x = Math.round(e.clientX - rect.left);
		S.mouse.y = Math.round(e.clientY - rect.top);
	}

	function updateGridWidth() {
		if (containerElement) {
			S.grid.width = containerElement.offsetWidth || window.innerWidth - 40;
		}
	}

	// Update grid width when container size changes
	$effect(() => {
		if (containerElement) {
			updateGridWidth();
			const resizeObserver = new ResizeObserver(updateGridWidth);
			resizeObserver.observe(containerElement);

			return () => resizeObserver.disconnect();
		}
	});
</script>

<nav>
	<a href="/" class="nav-item">home</a>
	<a href="/keyboard" class="nav-item">keyboard</a>
	<a href="/rect" class="nav-item">rect</a>
	<a href="/svglab" class="nav-item">svglab</a>

	<style>
		nav {
			display: flex;
			flex-flow: row wrap;
			justify-content: flex-start;
			margin-bottom: 8px;
		}
		.nav-item {
			padding: 2px 4px;
		}
	</style>
</nav>

<div class="controls">
	<button onclick={toggleGrid}>Toggle Grid</button>
	<button onclick={() => changeGridSize(5)}>5px Grid</button>
	<button onclick={() => changeGridSize(10)}>10px Grid</button>
	<button onclick={() => changeGridSize(20)}>20px Grid</button>
	<span>Grid: {S.grid.unit}px | Mouse: ({S.mouse.x}, {S.mouse.y})</span>
</div>

<div
	bind:this={containerElement}
	id="container"
	onmousemove={showCursorPosition}
	role="application"
	aria-label="Music notation grid with cursor tracking"
>
	<svg
		id="grid"
		width={S.grid.width}
		height={gridHeight}
		style:display={S.grid.visible ? 'block' : 'none'}
	>
		{#each D.grid.vlines as line}
			<line
				x1={line.x1}
				y1={line.y1}
				x2={line.x2}
				y2={line.y2}
				stroke={line.stroke}
				stroke-width={line.strokeWidth}
			/>
		{/each}

		{#each D.grid.hlines as line}
			<line
				x1={line.x1}
				y1={line.y1}
				x2={line.x2}
				y2={line.y2}
				stroke={line.stroke}
				stroke-width={line.strokeWidth}
			/>
		{/each}

		{#each D.grid.labels as label}
			<text x={label.x} y={label.y} font-size="10" fill="#666">
				{label.text}
			</text>
		{/each}
	</svg>
	{@render children?.()}

	<style>
		#container {
			position: relative;
			min-height: 300px;
		}

		#grid {
			position: absolute;
			top: 0;
			left: 0;
			pointer-events: none;
			z-index: 1;
			opacity: 0.3;
		}
	</style>
</div>
