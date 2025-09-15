<script lang="ts">
  import { pianoLoading } from '$lib/stores/pianoLoading';
</script>

{#if $pianoLoading.loading}
  <div
    class="vk-loading-overlay"
    role="status"
    aria-live="polite"
    aria-label={$pianoLoading.message}
  >
    <div class="vk-loading-card">
      <div class="vk-spinner" aria-hidden="true"></div>
      <div class="vk-text">{$pianoLoading.message}</div>
      {#if $pianoLoading.needsUnlock}
        <button class="vk-btn" onclick={() => $pianoLoading.onUnlock?.()} aria-label="Enable audio">
          Enable Audio
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .vk-loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  .vk-loading-card {
    min-width: 220px;
    max-width: 80vw;
    padding: 16px 18px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .vk-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #ccd3ff;
    border-top-color: #6b82ff;
    border-radius: 50%;
    animation: vk-spin 1s linear infinite;
  }
  .vk-text {
    font:
      14px/1.3 system-ui,
      -apple-system,
      Segoe UI,
      Roboto,
      Helvetica,
      Arial,
      sans-serif;
    color: #333;
  }
  .vk-btn {
    margin-left: 8px;
    padding: 6px 10px;
    border: 1px solid #6b82ff;
    background: #6b82ff;
    color: #fff;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
  .vk-btn:hover {
    filter: brightness(0.95);
  }
  @keyframes vk-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
