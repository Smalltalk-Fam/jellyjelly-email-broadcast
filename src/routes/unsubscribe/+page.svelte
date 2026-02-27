<script lang="ts">
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Unsubscribe — JellyJelly</title>
</svelte:head>

<div class="container">
  <div class="card">
    <h1>JellyJelly</h1>

    {#if form?.success}
      <div class="success">
        <h2>You've been unsubscribed</h2>
        <p>
          <strong>{form.email}</strong> has been removed from our mailing list.
          You won't receive any more campaign emails from us.
        </p>
        <a href="https://jellyjelly.com" class="btn">Back to JellyJelly</a>
      </div>
    {:else if !data.valid}
      <div class="error">
        <h2>Oops</h2>
        <p>{data.error}</p>
        <a href="https://jellyjelly.com" class="btn">Back to JellyJelly</a>
      </div>
    {:else}
      <div class="confirm">
        <h2>Unsubscribe</h2>
        <p>
          Are you sure you want to unsubscribe <strong>{data.email}</strong> from
          JellyJelly campaign emails?
        </p>
        <form method="POST">
          <input type="hidden" name="token" value={data.token} />
          <button type="submit" class="btn btn-danger">Yes, unsubscribe me</button>
        </form>
        <a href="https://jellyjelly.com" class="link">Cancel</a>
      </div>
    {/if}

    {#if form?.error}
      <p class="error-msg">{form.error}</p>
    {/if}
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0a;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .card {
    max-width: 480px;
    width: 100%;
    background: #1a1a2e;
    border-radius: 16px;
    padding: 48px 32px;
    text-align: center;
    color: #e0e0e0;
  }
  h1 {
    margin: 0 0 32px;
    font-size: 28px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  h2 { margin: 0 0 16px; color: #fff; }
  p { margin: 0 0 24px; line-height: 1.6; color: #aaa; }
  strong { color: #e0e0e0; }
  .btn {
    display: inline-block;
    padding: 12px 28px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }
  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
  }
  .link {
    display: block;
    margin-top: 16px;
    color: #8b5cf6;
    text-decoration: underline;
    font-size: 14px;
  }
  .error-msg {
    color: #ef4444;
    font-size: 14px;
    margin-top: 16px;
  }
</style>
