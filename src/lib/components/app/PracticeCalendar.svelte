<script lang="ts">
  import { onMount } from 'svelte';

  type PracticeCalendarProps = {
    values?: Record<string, number>;
    startDate?: string | Date;
    endDate?: string | Date;
  };

  type DayCell = {
    date: string;
    count: number;
    level: number;
    dayOfMonth: number;
    month: number;
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const AXIS_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const COLOR_SCALE = [
    'color-mix(in oklch, var(--app-color-500) 6%, white)',
    'color-mix(in oklch, var(--app-color-500) 28%, white)',
    'color-mix(in oklch, var(--app-color-500) 48%, white)',
    'color-mix(in oklch, var(--app-color-500) 68%, white)',
    'var(--app-color-500)',
  ];
  const CELL_SIZE = 12;
  const CELL_GAP = 2;
  const COLUMN_TOTAL_WIDTH = CELL_SIZE + CELL_GAP;
  const AXIS_COLUMN_WIDTH = 44;
  const COLUMN_SPACING = 12;
  const SIX_MONTH_WEEK_WINDOW = 26;

  const props: PracticeCalendarProps = $props();
  const values = $derived(props.values ?? {});

  const endDate = $derived.by(() => {
    const candidate = props.endDate ? new Date(props.endDate) : new Date();
    candidate.setHours(0, 0, 0, 0);
    return candidate;
  });

  const defaultStart = $derived.by(() => {
    const fallback = new Date(endDate);
    fallback.setDate(fallback.getDate() - 365);
    return fallback;
  });

  const startDate = $derived.by(() => {
    const candidate = props.startDate ? new Date(props.startDate) : defaultStart;
    candidate.setHours(0, 0, 0, 0);
    return candidate;
  });

  const maxCount = $derived.by(() => {
    const counts = Object.values(values);
    return counts.length ? Math.max(...counts) : 0;
  });

  const step = $derived.by(() => (maxCount > 0 ? Math.max(1, Math.ceil(maxCount / 4)) : 1));

  function alignToMonday(date: Date): Date {
    const aligned = new Date(date);
    const day = (aligned.getDay() + 6) % 7; // Monday -> 0
    aligned.setDate(aligned.getDate() - day);
    return aligned;
  }

  function formatISO(date: Date): string {
    const clone = new Date(date);
    clone.setMinutes(clone.getMinutes() - clone.getTimezoneOffset());
    return clone.toISOString().slice(0, 10);
  }

  function addDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function intensityLevel(count: number): number {
    if (count <= 0 || maxCount === 0) return 0;
    return Math.min(4, Math.ceil(count / step));
  }

  function formatTooltip(day: DayCell): string {
    const date = new Date(`${day.date}T00:00:00`);
    const formattedDate = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const amount = day.count === 1 ? '1 minute' : `${day.count} minutes`;
    return `${amount} · ${formattedDate}`;
  }

  const calendarStart = $derived.by(() => alignToMonday(startDate));
  const calendarEnd = $derived.by(() => {
    const aligned = new Date(endDate);
    const day = (aligned.getDay() + 6) % 7;
    const trailing = 6 - day;
    aligned.setDate(aligned.getDate() + trailing);
    return aligned;
  });

  const weeks = $derived.by(() => {
    const result: DayCell[][] = [];
    let cursor = new Date(calendarStart);
    while (cursor <= calendarEnd) {
      const week: DayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = formatISO(cursor);
        const count = values[iso] ?? 0;
        week.push({
          date: iso,
          count,
          level: intensityLevel(count),
          dayOfMonth: cursor.getDate(),
          month: cursor.getMonth(),
        });
        cursor = addDays(cursor, 1);
      }
      result.push(week);
    }
    return result;
  });

  const monthLabels = $derived.by(() => {
    const labels: string[] = weeks.map(() => '');
    let previousMonth = -1;
    weeks.forEach((week, index) => {
      const candidate = week.find((day) => day.dayOfMonth <= 7);
      if (!candidate) return;
      if (candidate.month !== previousMonth) {
        labels[index] = MONTH_NAMES[candidate.month];
        previousMonth = candidate.month;
      }
    });
    return labels;
  });

  let gridContainer: HTMLDivElement | null = null;
  let containerWidth = 0;

  onMount(() => {
    if (!gridContainer) return;
    containerWidth = gridContainer.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      containerWidth = entries[0].contentRect.width;
    });
    observer.observe(gridContainer);
    return () => observer.disconnect();
  });

  const weekMonthKeys = $derived.by(() =>
    weeks.map((week) => {
      const reference =
        week.find((day) => day.dayOfMonth <= 7) ?? week[Math.min(Math.floor(week.length / 2), week.length - 1)];
      return reference.month;
    }),
  );

  const monthWeekGroups = $derived.by(() => {
    const groups: { month: number; weeks: number }[] = [];
    for (let i = weeks.length - 1; i >= 0; i--) {
      const month = weekMonthKeys[i];
      const current = groups[groups.length - 1];
      if (!current || current.month !== month) {
        groups.push({ month, weeks: 1 });
      } else {
        current.weeks += 1;
      }
    }
    return groups;
  });

  const visibleWeekCount = $derived.by(() => {
    const total = weeks.length;
    if (total === 0) return 0;
    const available = Math.max(containerWidth - AXIS_COLUMN_WIDTH - COLUMN_SPACING, 0);
    const capacity = Math.floor(available / COLUMN_TOTAL_WIDTH);
    const groups = monthWeekGroups;

    let weeksToShow = 0;
    let remaining = capacity > 0 ? capacity : Number.MAX_SAFE_INTEGER;

    for (const group of groups) {
      if (weeksToShow > 0 && group.weeks > remaining) break;
      weeksToShow += group.weeks;
      if (capacity > 0) {
        remaining -= group.weeks;
        if (remaining <= 0) break;
      }
    }

    if (weeksToShow === 0 && groups.length) {
      weeksToShow = groups[0].weeks;
    }

    if (capacity > 0) {
      weeksToShow = Math.min(weeksToShow, capacity);
    }

    weeksToShow = Math.min(weeksToShow, total, SIX_MONTH_WEEK_WINDOW);
    return Math.max(weeksToShow, 1);
  });

  const visibleWeeks = $derived.by(() => weeks.slice(-visibleWeekCount));
  const visibleMonthLabels = $derived.by(() => monthLabels.slice(-visibleWeekCount));
  const visibleContentWidth = $derived.by(() =>
    visibleWeekCount > 0 ? visibleWeekCount * COLUMN_TOTAL_WIDTH - CELL_GAP : 0,
  );
  const contentWidthPx = $derived.by(() => Math.max(visibleContentWidth, 0));
  const visibleMonthCount = $derived.by(() => {
    const months = new Set<number>();
    visibleWeeks.forEach((week) =>
      week.forEach((day) => {
        months.add(day.month);
      }),
    );
    return months.size;
  });
</script>

<section class="flex flex-col gap-5 rounded-2xl border border-[#d0d7de] bg-[var(--app-color-100)] px-6 py-5">
  <header class="flex items-center justify-between">
    <div class="text-sm font-medium text-[#24292f]">Practice calendar</div>
    <div class="text-xs text-[#6e7781]">
      Last {visibleMonthCount} {visibleMonthCount === 1 ? 'month' : 'months'}
    </div>
  </header>

  <div class="flex gap-3 overflow-hidden" bind:this={gridContainer}>
    <div class="grid grid-rows-7 gap-[2px] text-[10px] leading-none text-[#6e7781]">
      {#each AXIS_LABELS as label}
        <span class="flex h-[12px] items-center justify-end pr-2">{label}</span>
      {/each}
    </div>
    <div class="flex flex-col gap-1.5" style={`width:${contentWidthPx}px`}>
      <div
        class="grid grid-flow-col auto-cols-[14px] text-[10px] text-[#57606a]"
        style={`width:${contentWidthPx}px`}
      >
        {#each visibleMonthLabels as label}
          <span class="flex h-4 items-center justify-center">{label ?? ''}</span>
        {/each}
      </div>
      <div class="flex gap-[2px]" style={`width:${contentWidthPx}px`}>
        {#each visibleWeeks as week}
          <div class="grid grid-rows-7 gap-[2px]">
            {#each week as day}
              <div
                class="h-[12px] w-[12px] rounded-[3px] border border-[#d0d7de] transition-colors duration-150"
                style={`background:${COLOR_SCALE[Math.max(Math.min(day.level, COLOR_SCALE.length - 1), 0)]}`}
                aria-label={formatTooltip(day)}
                title={formatTooltip(day)}
                data-date={day.date}
                data-count={day.count}
              ></div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <footer class="flex items-center justify-end gap-2 text-[11px] text-[#6e7781]">
    <span>Less</span>
    <div class="flex items-center gap-1.5">
      {#each COLOR_SCALE as color, index}
        <span
          class="h-2.5 w-2.5 rounded-[2px] border border-[#d0d7de]"
          style={`background:${color}`}
          aria-hidden="true"
          data-level={index}
        ></span>
      {/each}
    </div>
    <span>More</span>
  </footer>
</section>
