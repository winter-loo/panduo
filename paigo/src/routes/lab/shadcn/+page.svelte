<script lang="ts">
  import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
  import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte';
</script>

<NavigationMenu.Root viewport={false}>
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/docs" class={navigationMenuTriggerStyle()}>Docs</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  </NavigationMenu.List>
</NavigationMenu.Root>
