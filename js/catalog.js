let productsCache = [];

export async function loadCatalog() {
    try {
        const response = await fetch('data/products.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        productsCache = await response.json();
        return productsCache;
    } catch (e) {
        console.error("Failed to load catalog. Note: fetch will fail over file:// protocol. Please use a local web server (e.g., npx serve).", e);
        throw e;
    }
}

export function getProductById(id) {
    return productsCache.find(p => p.id === id);
}

export function getAllProducts() {
    return productsCache;
}
