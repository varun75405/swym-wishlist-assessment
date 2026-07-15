import { getWishlistById, createWishlist } from './wishlist.js';

export function mergeWishlists(wishlistIdA, wishlistIdB, customName = undefined) {
    if (wishlistIdA === wishlistIdB) {
        throw new Error("Cannot merge a wishlist with itself");
    }

    const wlA = getWishlistById(wishlistIdA);
    const wlB = getWishlistById(wishlistIdB);

    if (!wlA || !wlB) {
        throw new Error("One or both wishlists do not exist");
    }

    if (wlA.productIds.length === 0 && wlB.productIds.length === 0) {
        throw new Error("Nothing to merge. Both wishlists are empty.");
    }

    // Set-based O(N) approach for merging, guaranteeing A then unique B
    const mergedIds = [];
    const seen = new Set();

    // 1. Add all from A
    for (const id of wlA.productIds) {
        if (!seen.has(id)) {
            mergedIds.push(id);
            seen.add(id);
        }
    }

    // 2. Add unique from B
    for (const id of wlB.productIds) {
        if (!seen.has(id)) {
            mergedIds.push(id);
            seen.add(id);
        }
    }

    const newName = customName || `${wlA.name} + ${wlB.name}`;
    const mergedFrom = [wishlistIdA, wishlistIdB];

    // createWishlist will create a deep copy of the mergedIds array
    return createWishlist(newName, mergedFrom, mergedIds);
}
