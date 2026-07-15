import { loadCatalog } from './catalog.js';
import { initWishlists } from './wishlist.js';
import { initUI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCatalog();
        initWishlists();
        initUI();
    } catch (e) {
        console.error("Failed to initialize app:", e);
        document.body.innerHTML = `
            <div style="padding: 2rem; color: #fff; background: #c0392b; text-align: center; font-family: sans-serif;">
                <h2>Application Failed to Load</h2>
                <p>${e.message}</p>
                <p>If you are testing locally, please ensure you are running a local web server (e.g., <code>npx serve</code>) rather than opening the file directly via <code>file://</code> protocol.</p>
            </div>
        `;
    }
});
