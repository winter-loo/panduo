<script lang="ts">
  import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
  import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte';
  import '../app.css';

  let { children } = $props();
</script>

<NavigationMenu.Root viewport={false}>
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/" class={navigationMenuTriggerStyle()}>home</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/keyboard" class={navigationMenuTriggerStyle()}>keyboard</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/rect" class={navigationMenuTriggerStyle()}>rect</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/lab" class={navigationMenuTriggerStyle()}>lab</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/sight-reading" class={navigationMenuTriggerStyle()}>sight reading</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/main" class={navigationMenuTriggerStyle()}>main</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/animation" class={navigationMenuTriggerStyle()}>animation</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  </NavigationMenu.List>
</NavigationMenu.Root>

{@render children?.()}
