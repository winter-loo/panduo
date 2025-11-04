<script lang="ts">
  import { goto } from '$app/navigation';
  import Sidebar, { type Feature } from '$lib/components/app/Sidebar.svelte';
  import StageNavbar from '$lib/components/app/StageNavbar.svelte';
  import RoadmapSection, {
    type RoadmapItem,
  } from '$lib/components/app/RoadmapSection.svelte';
  import PracticeCalendar from '$lib/components/app/PracticeCalendar.svelte';
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

  const practiceHistory = (() => {
    const toISO = (date: Date) => {
      const normalized = new Date(date);
      normalized.setMinutes(normalized.getMinutes() - normalized.getTimezoneOffset());
      return normalized.toISOString().slice(0, 10);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = 52 * 7;
    const start = new Date(today);
    start.setDate(today.getDate() - (totalDays - 1));

    const history: Record<string, number> = {};
    for (let offset = 0; offset < totalDays; offset++) {
      const current = new Date(today);
      current.setDate(today.getDate() - offset);
      const iso = toISO(current);
      const wave = Math.sin(offset / 6) + Math.cos(offset / 11);
      const baseline = Math.max(0, Math.round((wave + 2) * 1.6));
      if (offset % 9 === 0 || baseline === 0) continue;
      history[iso] = baseline;
    }

    return {
      values: history,
      startDate: start,
    };
  })();

  const stageLabel = '第 1 阶段，第 1 部分';
  const songTitle = 'Hot Cross Buns - 莎丽';

  function handleBack() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Music Scales | Panduo</title>
</svelte:head>

<div class="min-h-screen bg-[var(--app-color-100)]">
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
            src="/images/app/panda.png"
          />
        </div>
      </div>
    </div>
    <div class="w-full max-w-[486px] self-center lg:self-stretch">
      <PracticeCalendar values={practiceHistory.values} startDate={practiceHistory.startDate} />
    </div>
  </div>
</div>
