<script>
	import { page } from '$app/state';
	const PagePath = page.url.pathname;
</script>

<nav>
	<a class="nav-item" href={`${PagePath}/svg`}>svg</a>
	<a class="nav-item" href={`${PagePath}/neodrag`}>neodrag</a>
	<a class="nav-item" href={`${PagePath}/key-rollover`}>key-rollover</a>
	<a class="nav-item" href={`${PagePath}/transcribe`}>transcribe</a>

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
