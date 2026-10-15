import { render } from 'preact';
import { App } from './app';
import { PIECE_SPRITE } from './board/pieces';
import './styles.css';

// Figuren-Sprite einmalig ins Dokument
document.body.insertAdjacentHTML('afterbegin', PIECE_SPRITE);

render(<App />, document.getElementById('app')!);

// Service Worker nur im Build (vollständig offline nach dem ersten Laden)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service Worker:', e));
  });
}

// Speicher möglichst dauerhaft halten (iOS räumt sonst nach Wochen ohne Nutzung)
navigator.storage?.persist?.().catch(() => undefined);
