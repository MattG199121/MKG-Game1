import './styles.css';
import { SheppertonApp } from './ui/SheppertonApp';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root was not found.');

root.innerHTML = `
  <main class="boot-screen">
    <div class="boot-mark" aria-hidden="true">SL</div>
    <h1>Shepperton Life RPG</h1>
    <div class="loading-dots" aria-label="Loading"><i></i><i></i><i></i></div>
    <p>Waking up the village…</p>
  </main>`;

window.addEventListener('error', (event) => {
  console.error('Shepperton Life RPG error', event.error);
});

requestAnimationFrame(() => {
  try {
    new SheppertonApp(root);
  } catch (error) {
    console.error(error);
    root.innerHTML = `
      <main class="boot-screen error-screen">
        <div class="boot-mark">!</div>
        <h1>The village did not load</h1>
        <p>Your save has not been changed. Refresh the page to try again.</p>
        <button class="button primary" onclick="location.reload()">Try again</button>
      </main>`;
  }
});
