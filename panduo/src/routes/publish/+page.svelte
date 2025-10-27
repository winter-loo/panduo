<script lang="ts">
  import { goto } from '$app/navigation';
  import Sidebar, { type Feature } from '$lib/components/music-scales/Sidebar.svelte';
  import StageNavbar from '$lib/components/music-scales/StageNavbar.svelte';
  import RoadmapSection, {
    type RoadmapItem,
  } from '$lib/components/music-scales/RoadmapSection.svelte';
  import PreviewPanel from '$lib/components/music-scales/PreviewPanel.svelte';
  import { Aperture, Piano, ShoppingBag, User as UserIcon } from '@lucide/svelte';
  import { Armchair, HandHelping, Music3, Piano as PianoIcon } from '@lucide/svelte';

  const features: Feature[] = [
    { icon: Piano, label: 'learn' },
    { icon: Aperture, label: 'quests' },
    { icon: ShoppingBag, label: 'shop' },
    { icon: UserIcon, label: 'profile' },
  ];

  const roadmapItems: RoadmapItem[] = [
    { icon: Music3, label: 'scales', showLoop: true, align: 'center' },
    { icon: HandHelping, label: 'hand shape', align: 'start' },
    { icon: PianoIcon, label: 'keyboard', align: 'start' },
    { icon: Armchair, label: 'posture', align: 'center' },
  ];

  const matrix: boolean[][] = [
    [true, false, false, true, true, true, true],
    [false, true, true, true, true, true, false],
    [true, true, true, false, true, true, true],
    [true, true, true, true, true, true, true],
    [true, false, true, true, true, false, true],
    [true, true, false, true, false, true, true],
    [true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true],
    [true, true, true, true, true, true, false],
    [false, true, true, true, true, true, true],
    [true, true, true, true, true, false, false],
    [true, true, true, false, false, true, true],
    [true, true, true, true, true, true, true],
    [false, true, true, true, true, false, true],
    [true, true, true, true, false, true, false],
    [true, true, true, true, false, true, true],
  ];

  const stageLabel = '第 1 阶段，第 1 部分';
  const songTitle = 'Hot Cross Buns - 莎丽';

  function handleBack() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Music Scales | Panduo</title>
</svelte:head>

<div class="min-h-screen bg-[#f3f3f3]">
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 py-10 lg:flex-row">
    <Sidebar {features} />
    <div class="flex w-full max-w-[600px] flex-col items-center gap-10 self-center lg:self-stretch">
      <StageNavbar {stageLabel} {songTitle} onback={handleBack} />
      <div class="relative flex w-full flex-col items-center gap-10">
        <div class="w-full">
          <RoadmapSection title="roadmap" items={roadmapItems} />
        </div>
        <div
          class="pointer-events-none w-[220px] rounded-full bg-white/80 p-4 shadow-[0_30px_60px_rgba(0,0,0,0.1)] backdrop-blur-sm lg:absolute lg:top-36 lg:-right-10"
        >
          <img
            alt="Illustration of a panda practicing piano"
            class="h-full w-full rounded-full object-cover"
            src="/images/music-scales/panda.png"
          />
        </div>
      </div>
    </div>
    <div class="w-full max-w-[486px] self-center lg:self-stretch">
      <PreviewPanel {matrix} />
    </div>
  </div>
</div>
