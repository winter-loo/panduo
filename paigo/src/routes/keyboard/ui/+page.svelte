<svelte:head>
  <title>Piano Keyboard</title>
</svelte:head>

<section class="frame">
  <div class="piano-key">
    <div class="black-key">
      <div class="black-key__core" />
    </div>

    <div class="white-key">
      <div class="white-key__core" />
    </div>
  </div>
</section>

<style>
  .frame {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
  }

  .piano-key {
    position: relative;
    width: 130px;
    height: 437px;
  }

  .black-key {
    position: absolute;
    top: 0;
    left: 62px;
    width: 68px;
    height: 286px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: #333;
    border-radius: 0 0 4px 4px;
  }

  .black-key__core {
    width: 100%;
    height: 266px;
    background: #4b4b4b;
    border-radius: 0 0 4px 4px;
  }

  .white-key {
    position: absolute;
    top: 8px;
    left: 0;
    width: 96px;
    height: 429px;
    padding: 4px 4px 16px;
    display: flex;
    background: #dadada;
    border-radius: 0 0 4px 4px;
    box-sizing: border-box;
  }

  .white-key__core {
    width: 100%;
    height: 100%;
    background: #fff;
    border-radius: 0 0 4px 4px;
  }
</style>
