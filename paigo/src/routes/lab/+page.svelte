<script>
  import { page } from '$app/state';
  const PagePath = page.url.pathname;
  import { Button } from '$lib/components/ui/button/index';
</script>

<nav>
  <Button variant="link" href={`${PagePath}/svg`}>svg</Button>
  <Button variant="link" href={`${PagePath}/neodrag`}>neodrag</Button>
  <Button variant="link" href={`${PagePath}/key-rollover`}>key-rollover</Button>
  <Button variant="link" href={`${PagePath}/transcribe`}>transcribe</Button>
  <Button variant="link" href={`${PagePath}/shadcn`}>shadcn</Button>
</nav>
