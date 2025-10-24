<script lang="ts">
  import { page } from '$app/state';
  const PagePath = page.url.pathname;
  import Button from '$lib/components/ui/button/button.svelte';

</script>

<Button variant="link" href="{PagePath}/challenge">challenge</Button>
