<script>
  import { page } from '$app/state';
  const PagePath = page.url.pathname;
  import { Button } from '$lib/components/ui/button/index';
</script>

<div class="flex justify-start max-w-[800px] flex-wrap m-auto mt-8">
    <Button variant="link" href={`${PagePath}/svg`}>svg</Button>
    <Button variant="link" href={`${PagePath}/neodrag`}>neodrag</Button>
    <Button variant="link" href={`${PagePath}/key-rollover`}>key-rollover</Button>
    <Button variant="link" href={`${PagePath}/transcribe`}>transcribe</Button>
    <Button variant="link" href={`${PagePath}/shadcn`}>shadcn</Button>
    <Button variant="link" href={`${PagePath}/navbar`}>navbar</Button>
    <Button variant="link" href={`${PagePath}/abcjs`}>abcjs</Button>
    <Button variant="link" href={`${PagePath}/bits-ui`}>bits ui</Button>
    <Button variant="link" href={`${PagePath}/motion`}>framer motion</Button>
    <Button variant="link" href={`${PagePath}/piano-tone`}>piano tone</Button>
    <Button variant="link" href={`${PagePath}/vexflow`}>vexflow music staff</Button>
    <Button variant="link" href={`${PagePath}/parser`}>ohm parser</Button>
    <Button variant="link" href={`${PagePath}/abcvex`}>abc & vexflow</Button>
    <Button variant="link" href={`${PagePath}/music-font`}>music font</Button>
</div>
