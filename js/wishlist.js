import { loadWishlists, saveWishlists } from './storage.js';

let wishlists = [];

export function initWishlists() {
    const loaded = loadWishlists();
    if (loaded === null) {
        wishlists = [];
        createWishlist("Default Wishlist");
    } else {
        wishlists = loaded;
    }
}

export function getAllWishlists() {
    // Return deep copy to prevent live reference mutation
    return structuredClone(wishlists);
}

export function getWishlistById(id) {
    const w = wishlists.find(w => w.id === id);
    return w ? structuredClone(w) : undefined;
}

function generateId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
}

export function createWishlist(name, mergedFrom = undefined, productIds = []) {
    const trimmedName = name.trim().substring(0, 50);
    if (!trimmedName) {
        throw new Error("Wishlist name cannot be empty");
    }
    
    const newWishlist = {
        id: generateId(),
        name: trimmedName,
        createdAt: new Date().toISOString(),
        productIds: [...productIds] // deep copy of array
    };
    
    if (mergedFrom) {
        newWishlist.mergedFrom = mergedFrom;
    }
    
    wishlists.push(newWishlist);
    saveWishlists(wishlists);
    return newWishlist;
}

export function deleteWishlist(id) {
    wishlists = wishlists.filter(w => w.id !== id);
    saveWishlists(wishlists);
}

export function addProductToWishlist(wishlistId, productId) {
    const wishlist = wishlists.find(w => w.id === wishlistId);
    if (!wishlist) {
        throw new Error("Wishlist not found");
    }
    
    // Per-wishlist duplicate checking
    if (wishlist.productIds.includes(productId)) {
        throw new Error("Already in wishlist");
    }
    
    wishlist.productIds.push(productId);
    saveWishlists(wishlists);
}

export function removeProductFromWishlist(wishlistId, productId) {
    const wishlist = wishlists.find(w => w.id === wishlistId);
    if (!wishlist) {
        throw new Error("Wishlist not found");
    }
    
    wishlist.productIds = wishlist.productIds.filter(id => id !== productId);
    saveWishlists(wishlists);
}

export function isProductInAllWishlists(productId) {
    if (wishlists.length === 0) return false;
    return wishlists.every(w => w.productIds.includes(productId));
}

export function isProductInWishlist(wishlistId, productId) {
    const w = wishlists.find(w => w.id === wishlistId);
    return w ? w.productIds.includes(productId) : false;
}

// For testing purposes
export function _setWishlists(newWishlists) {
    wishlists = newWishlists;
}
