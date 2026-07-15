const SCHEMA_VERSION = 1;
const WISHLIST_KEY = `wishlists`;

export function loadWishlists() {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) {
        return null; // Return null to indicate first run
    }

    try {
        const parsed = JSON.parse(raw);
        
        // Schema versioning check
        if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.data)) {
            throw new Error("Invalid or outdated schema");
        }
        
        const wishlists = parsed.data;
        // Basic schema validation
        for (const wl of wishlists) {
            if (typeof wl.id !== 'string' || 
                typeof wl.name !== 'string' || 
                typeof wl.createdAt !== 'string' || 
                !Array.isArray(wl.productIds)) {
                throw new Error("Invalid wishlist schema");
            }
        }
        return wishlists;
    } catch (e) {
        console.error("Storage corruption detected:", e);
        backupCorruptedData(raw);
        
        const defaultWishlists = [];
        saveWishlists(defaultWishlists);
        
        document.dispatchEvent(new CustomEvent('storage-corrupted'));
        
        return defaultWishlists;
    }
}

export function saveWishlists(wishlists) {
    const payload = {
        schemaVersion: SCHEMA_VERSION,
        data: wishlists
    };
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(payload));
}

function backupCorruptedData(raw) {
    const backupKey = `wishlist_corrupted_backup_${Date.now()}`;
    localStorage.setItem(backupKey, raw);
    
    // Cap backups to 5
    const backupKeys = [];
    for (let i = 0; i < (localStorage.length || Object.keys(localStorage).length); i++) {
        // Handle both browser localStorage and our test mock
        const key = typeof localStorage.key === 'function' ? localStorage.key(i) : Object.keys(localStorage)[i];
        if (key && key.startsWith('wishlist_corrupted_backup_')) {
            backupKeys.push(key);
        }
    }
    
    if (backupKeys.length > 5) {
        backupKeys.sort();
        const keysToDelete = backupKeys.slice(0, backupKeys.length - 5);
        keysToDelete.forEach(k => localStorage.removeItem(k));
    }
}
