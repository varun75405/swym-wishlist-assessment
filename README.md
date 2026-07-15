# AURA Storefront

A simple e-commerce storefront with a robust, client-side wishlist feature, built with vanilla HTML, CSS, and JavaScript. Data is persisted purely via `localStorage`.

## Setup & Running

This project uses `fetch()` to load the product catalog from `data/products.json`.
Due to browser security policies (CORS), `fetch()` will fail if you open `index.html` directly using the `file://` protocol.

**You must serve this project via a local web server.**
If you have Node.js installed, you can run:
```bash
npx serve .
```
And open the provided localhost URL in your browser.

## Architecture Notes

The application is structured into domain-specific modules:
- `storage.js`: Handles `localStorage` reads/writes, validates data schemas, and safely backs up and recovers from corrupted JSON.
- `catalog.js`: Loads and provides the product catalog (the single source of truth).
- `wishlist.js`: Manages wishlist creation, deletion, and duplicate checks within a specific wishlist.
- `merge.js`: Contains the highly specific and optimized logic for merging two wishlists.
- `ui.js`: DOM updates, modal management, toasts, and logic branching based on application state.

### Merge Logic
The wishlist merge feature takes two existing wishlists (A and B) and creates a *new* wishlist.
It uses an O(N) Set-based approach to deduplicate items.
Ordering is strictly deterministic:
1. All items from Wishlist A retain their original order.
2. Only new, unique items from Wishlist B are appended in their original order.
Merging empty wishlists is explicitly blocked. The original wishlists are left fully intact, and a deep copy is created to prevent mutation by reference.
