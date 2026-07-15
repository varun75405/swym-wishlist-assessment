// test.js
import assert from 'assert';

// Mock localStorage and document
let storage = {};
global.localStorage = {
    getItem: key => storage[key] || null,
    setItem: (key, val) => { storage[key] = val; },
    removeItem: (key) => { delete storage[key]; },
    get length() { return Object.keys(storage).length; },
    key: (i) => Object.keys(storage)[i]
};

let dispatchedEvents = [];
global.document = {
    dispatchEvent: (evt) => { dispatchedEvents.push(evt.type); }
};
global.CustomEvent = class CustomEvent {
    constructor(type) { this.type = type; }
};

// Import modules to test
import { loadWishlists, saveWishlists } from './js/storage.js';
import { 
    createWishlist, addProductToWishlist, getWishlistById, 
    getAllWishlists, _setWishlists, initWishlists,
    deleteWishlist, removeProductFromWishlist
} from './js/wishlist.js';
import { mergeWishlists } from './js/merge.js';

function runTests() {
    console.log("Running Tests...");
    
    // --- 1. Test Storage Corruption & Versioning ---
    console.log("Test: Storage Corruption Recovery");
    storage = {};
    dispatchedEvents = [];
    localStorage.setItem('wishlists', 'invalid json string {]');
    const recovered = loadWishlists();
    assert.deepStrictEqual(recovered, [], "Should return empty array on corruption");
    assert.ok(dispatchedEvents.includes('storage-corrupted'), "Should dispatch storage-corrupted event");
    
    let backupKeys = Object.keys(storage).filter(k => k.startsWith('wishlist_corrupted_backup_'));
    assert.strictEqual(backupKeys.length, 1, "Should create one backup key");
    assert.strictEqual(storage[backupKeys[0]], 'invalid json string {]', "Backup should contain raw string");

    // Test Schema Mismatch
    console.log("Test: Schema Mismatch Recovery");
    storage = {};
    localStorage.setItem('wishlists', JSON.stringify({ schemaVersion: 999, data: [] })); // Wrong version
    const recoveredVersion = loadWishlists();
    assert.deepStrictEqual(recoveredVersion, [], "Should reset on schema mismatch");
    
    // Test First Run
    console.log("Test: First Run Default Seeding");
    storage = {}; // Empty storage
    _setWishlists([]);
    initWishlists();
    const firstRunWl = getAllWishlists();
    assert.strictEqual(firstRunWl.length, 1, "Should create a default wishlist on first run");
    assert.strictEqual(firstRunWl[0].name, "Default Wishlist");

    // --- 2. Test Per-Wishlist Duplicate Scope ---
    console.log("Test: Per-Wishlist Duplicate Checking");
    storage = {};
    _setWishlists([]);
    
    const wl1 = createWishlist("List 1");
    const wl2 = createWishlist("List 2");
    
    addProductToWishlist(wl1.id, "p1");
    addProductToWishlist(wl2.id, "p1"); // Should succeed, different wishlist
    
    let caughtError = false;
    try {
        addProductToWishlist(wl1.id, "p1"); // Should fail, same wishlist
    } catch (e) {
        caughtError = true;
        assert.strictEqual(e.message, "Already in wishlist");
    }
    assert.ok(caughtError, "Should prevent adding duplicate to the same wishlist");
    
    // --- 3. Test Merge Logic ---
    console.log("Test: Merge Deterministic Ordering & Deduplication");
    storage = {};
    _setWishlists([]);
    
    const wlA = createWishlist("A");
    const wlB = createWishlist("B");
    
    // Populate A: p1, p2, p3
    addProductToWishlist(wlA.id, "p1");
    addProductToWishlist(wlA.id, "p2");
    addProductToWishlist(wlA.id, "p3");
    
    // Populate B: p3, p4, p2
    addProductToWishlist(wlB.id, "p3");
    addProductToWishlist(wlB.id, "p4");
    addProductToWishlist(wlB.id, "p2");
    
    const merged = mergeWishlists(wlA.id, wlB.id);
    assert.deepStrictEqual(merged.productIds, ["p1", "p2", "p3", "p4"]);
    assert.strictEqual(merged.name, "A + B");
    assert.deepStrictEqual(merged.mergedFrom, [wlA.id, wlB.id]);
    
    const mergedReverse = mergeWishlists(wlB.id, wlA.id, "Custom Name");
    assert.deepStrictEqual(mergedReverse.productIds, ["p3", "p4", "p2", "p1"]);
    assert.strictEqual(mergedReverse.name, "Custom Name", "Should support custom naming");
    
    // Test Deep Copy
    merged.productIds.push("p99");
    const originalA = getWishlistById(wlA.id);
    assert.ok(!originalA.productIds.includes("p99"), "Merge should deep copy arrays, not reference originals");
    
    // --- 4. Test Merge Edge Cases (Empty, Self) ---
    console.log("Test: Merge Edge Cases");
    const empty1 = createWishlist("Empty 1");
    const empty2 = createWishlist("Empty 2");
    caughtError = false;
    try {
        mergeWishlists(empty1.id, empty2.id);
    } catch(e) {
        caughtError = true;
        assert.strictEqual(e.message, "Nothing to merge. Both wishlists are empty.");
    }
    assert.ok(caughtError, "Should block merging two empty wishlists");
    
    caughtError = false;
    try {
        mergeWishlists(wlA.id, wlA.id);
    } catch(e) {
        caughtError = true;
        assert.strictEqual(e.message, "Cannot merge a wishlist with itself");
    }
    assert.ok(caughtError, "Should block merging a wishlist with itself");
    
    // --- 5. Test Wishlist Management (Delete, Remove Product, Name Trimming) ---
    console.log("Test: Wishlist Management");
    
    // Delete
    deleteWishlist(empty1.id);
    assert.strictEqual(getWishlistById(empty1.id), undefined, "Should delete the wishlist");
    
    // Remove Product
    removeProductFromWishlist(wlA.id, "p2");
    assert.deepStrictEqual(getWishlistById(wlA.id).productIds, ["p1", "p3"], "Should remove product");
    
    // Name trim
    const trimmed = createWishlist("   Spacey   ");
    assert.strictEqual(trimmed.name, "Spacey", "Should trim names");
    
    caughtError = false;
    try {
        createWishlist("   ");
    } catch(e) {
        caughtError = true;
    }
    assert.ok(caughtError, "Should block empty/whitespace-only names");
    
    // Deep copies return check
    const all = getAllWishlists();
    all[0].name = "Mutated";
    assert.notStrictEqual(getAllWishlists()[0].name, "Mutated", "getAllWishlists should return deep copies");

    console.log("All tests passed!");
}

runTests();
