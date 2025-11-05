<script lang="ts">
  import { goto } from '$app/navigation';
  import Sidebar, { type Feature } from '$lib/components/app/Sidebar.svelte';
  import StageNavbar from '$lib/components/app/StageNavbar.svelte';
  import RoadmapSection, { type RoadmapItem } from '$lib/components/app/RoadmapSection.svelte';
  import PracticeCalendar from '$lib/components/app/PracticeCalendar.svelte';
  import { Aperture, Piano, ShoppingBag, User as UserIcon } from '@lucide/svelte';
  import {
    IconStool,
    IconHandpointing,
    IconMusicNoteSimple,
    IconPianoKeys,
  } from '$lib/components/app/icons/index';

  const features: Feature[] = [
    { icon: Piano, label: 'learn' },
    { icon: Aperture, label: 'quests' },
    { icon: ShoppingBag, label: 'shop' },
    { icon: UserIcon, label: 'profile' },
  ];

  const roadmapItems: RoadmapItem[] = [
    { icon: IconMusicNoteSimple, label: 'scales', showLoop: true, align: 'center' },
    { icon: IconHandpointing, label: 'hand shape', align: 'start' },
    { icon: IconPianoKeys, label: 'keyboard', align: 'start' },
    { icon: IconStool, label: 'posture', align: 'center' },
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
  <title>Panduo</title>
</svelte:head>

<div class="min-h-screen bg-[var(--app-color-100)]">
  <div class="mx-auto flex w-full max-w-[1512px] flex-col gap-9 lg:flex-row">
    <Sidebar {features} />
    <div
      class="flex w-full max-w-[642px] flex-col items-center gap-10 self-center pt-12 lg:self-stretch"
    >
      <StageNavbar {stageLabel} {songTitle} onback={handleBack} />
      <div class="relative flex w-full flex-col items-center gap-10">
        <div class="w-[535px]">
          <RoadmapSection title="roadmap" items={roadmapItems} />
        </div>
      </div>
    </div>
    <div class="w-full max-w-[486px] self-center pt-12 lg:self-stretch">
      <PracticeCalendar values={practiceHistory.values} startDate={practiceHistory.startDate} />
    </div>
  </div>
</div>
