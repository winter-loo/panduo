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
  <Button variant="link" href={`${PagePath}/navbar`}>navbar</Button>
  <Button variant="link" href={`${PagePath}/abcjs`}>abcjs</Button>
  <Button variant="link" href={`${PagePath}/bits-ui`}>bits ui</Button>
  <Button variant="link" href={`${PagePath}/motion`}>framer motion</Button>
</nav>

<div class="relative flex justify-center items-center w-16 h-20 bg-neutral-800 rounded-lg overflow-hidden">
  <!-- Outer circle -->
  <div class="w-12 h-12 rounded-full bg-[#b98bff]/30 animate-breathe"></div>

  <!-- Inner circle -->
  <div class="absolute w-6 h-6 rounded-full bg-[#b98bff]/60 animate-breathe delay-150"></div>

  <!-- Text -->
  <span class="absolute text-2xl font-extrabold text-[#e6d3ff]">C#</span>

  <style>
    @keyframes breathe {
      0%, 100% {
        transform: scale(1);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.15);
        opacity: 1;
      }
    }
    .animate-breathe {
      animation: breathe 2.4s ease-in-out infinite;
    }
  </style>
</div>

