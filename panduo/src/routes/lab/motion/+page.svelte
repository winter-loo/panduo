<script lang="ts">
  import { animate } from 'motion';

  const onclick = () => {
    // https://motion.dev/docs/quick-start
    animate('.box', { rotate: 360 }, { duration: 1 });
  };
</script>

<div class="flex h-screen w-screen items-center justify-center">
  <button class="box" {onclick} aria-label="box rotation"></button>
</div>

<style>
  .box {
    width: 100px;
    height: 100px;
    background-color: #9911ff;
    border-radius: 10px;
  }
</style>
