import { getAllProducts, getProductById } from './catalog.js';
import { 
    getAllWishlists, createWishlist, deleteWishlist, 
    addProductToWishlist, removeProductFromWishlist, 
    isProductInAllWishlists, isProductInWishlist, getWishlistById
} from './wishlist.js';
import { mergeWishlists } from './merge.js';

let currentWishlistViewId = null;
let pendingProductIdForAdd = null;
let previousFocusElement = null;

export function initUI() {
    renderCatalog();
    renderSidebar();
    
    document.getElementById('create-wishlist-btn').addEventListener('click', () => {
        openModal('create-modal', document.getElementById('new-wishlist-name'));
    });
    
    document.getElementById('confirm-create-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-wishlist-name');
        const name = nameInput.value;
        if (name.trim()) {
            try {
                createWishlist(name);
                closeModal('create-modal');
                nameInput.value = '';
                renderSidebar();
                renderCatalog(); // re-evaluate "already in all wishlists"
                showToast('Wishlist created');
            } catch (e) {
                showToast(e.message);
            }
        }
    });

    document.getElementById('cancel-create-btn').addEventListener('click', () => {
        closeModal('create-modal');
    });
    
    document.getElementById('close-picker-btn').addEventListener('click', () => {
        closeModal('picker-modal');
        pendingProductIdForAdd = null;
    });

    document.getElementById('open-merge-btn').addEventListener('click', () => {
        setupMergeModal();
        openModal('merge-modal', document.getElementById('merge-wishlist-a'));
    });

    document.getElementById('close-merge-btn').addEventListener('click', () => {
        closeModal('merge-modal');
    });

    document.getElementById('confirm-merge-btn').addEventListener('click', handleMerge);

    document.addEventListener('storage-corrupted', () => {
        showToast('Local data was corrupted and has been reset to defaults.');
        renderSidebar();
        renderCatalog();
    });

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
        }
    });
}

export function renderCatalog() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; // safe, not user generated
    const products = getAllProducts();
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const img = document.createElement('img');
        img.src = p.image;
        img.alt = p.title;
        card.appendChild(img);
        
        const details = document.createElement('div');
        details.className = 'product-details';
        
        const title = document.createElement('h3');
        title.textContent = p.title;
        details.appendChild(title);
        
        const cat = document.createElement('span');
        cat.className = 'product-category';
        cat.textContent = p.category;
        details.appendChild(cat);
        
        const price = document.createElement('div');
        price.className = 'product-price';
        price.textContent = `$${p.price.toFixed(2)}`;
        details.appendChild(price);
        
        const btn = document.createElement('button');
        btn.className = 'btn add-to-wishlist-btn';
        
        if (isProductInAllWishlists(p.id) && getAllWishlists().length > 0) {
            btn.textContent = 'Already in all wishlists';
            btn.disabled = true;
        } else {
            btn.textContent = 'Add to Wishlist';
            btn.onclick = () => handleAddClick(p.id);
        }
        
        details.appendChild(btn);
        card.appendChild(details);
        grid.appendChild(card);
    });
}

function handleAddClick(productId) {
    const wishlists = getAllWishlists();
    
    if (wishlists.length === 0) {
        // Auto-create default
        const wl = createWishlist("My Wishlist");
        performAdd(wl.id, productId);
        renderSidebar();
    } else if (wishlists.length === 1) {
        // Add directly to the only wishlist
        performAdd(wishlists[0].id, productId);
    } else {
        // Show picker
        pendingProductIdForAdd = productId;
        const pickerList = document.getElementById('picker-list');
        pickerList.innerHTML = '';
        
        wishlists.forEach(wl => {
            const btn = document.createElement('button');
            btn.className = 'btn picker-btn';
            
            // XSS Prevention: Using textContent
            btn.textContent = wl.name;
            
            if (isProductInWishlist(wl.id, productId)) {
                btn.disabled = true;
                btn.textContent += ' (Already Added)';
            } else {
                btn.onclick = () => {
                    performAdd(wl.id, pendingProductIdForAdd);
                    closeModal('picker-modal');
                };
            }
            pickerList.appendChild(btn);
        });
        
        openModal('picker-modal', pickerList.querySelector('button:not([disabled])') || document.getElementById('close-picker-btn'));
    }
}

function performAdd(wishlistId, productId) {
    try {
        addProductToWishlist(wishlistId, productId);
        showToast('Added to wishlist');
        renderCatalog(); // re-evaluates button states
        if (currentWishlistViewId === wishlistId) {
            renderWishlistContents(wishlistId); // Refresh view if open
        }
    } catch (e) {
        showToast(e.message);
    }
}

function renderSidebar() {
    const list = document.getElementById('wishlists-list');
    list.innerHTML = '';
    const wishlists = getAllWishlists();
    
    wishlists.forEach(wl => {
        const item = document.createElement('div');
        item.className = `sidebar-item ${currentWishlistViewId === wl.id ? 'active' : ''}`;
        
        const nameSpan = document.createElement('button');
        nameSpan.textContent = wl.name; // XSS Safe
        nameSpan.className = 'sidebar-item-name-btn';
        
        // Make the item clickable to view
        nameSpan.onclick = () => {
            currentWishlistViewId = wl.id;
            renderSidebar();
            renderWishlistContents(wl.id);
        };
        
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.setAttribute('aria-label', `Delete ${wl.name}`);
        delBtn.innerHTML = '&times;'; // HTML entity is safe
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${wl.name}"?`)) { // Browser prompt is XSS safe natively for string param
                deleteWishlist(wl.id);
                if (currentWishlistViewId === wl.id) {
                    currentWishlistViewId = null;
                    document.getElementById('wishlist-view').innerHTML = '';
                }
                renderSidebar();
                renderCatalog();
                showToast('Wishlist deleted');
                
                // Focus management
                const createBtn = document.getElementById('create-wishlist-btn');
                if (createBtn) createBtn.focus();
            }
        };
        
        item.appendChild(nameSpan);
        item.appendChild(delBtn);
        list.appendChild(item);
    });
}

function renderWishlistContents(wishlistId) {
    const view = document.getElementById('wishlist-view');
    view.innerHTML = '';
    
    const wl = getWishlistById(wishlistId);
    if (!wl) return;
    
    const header = document.createElement('div');
    header.className = 'wishlist-view-header';
    
    const title = document.createElement('h2');
    title.textContent = wl.name;
    header.appendChild(title);
    view.appendChild(header);
    
    if (wl.productIds.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `<p>No products yet.</p><button class="btn" id="empty-state-cta">Browse Storefront</button>`;
        view.appendChild(emptyState);
        
        document.getElementById('empty-state-cta').onclick = () => {
            // Scroll to top and explicitly focus the grid
            window.scrollTo(0,0);
            const grid = document.getElementById('product-grid');
            grid.setAttribute('tabindex', '-1');
            grid.focus();
        };
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'wishlist-grid';
    
    wl.productIds.forEach(pid => {
        const p = getProductById(pid);
        if (!p) return;
        
        const card = document.createElement('div');
        card.className = 'wishlist-card';
        
        const img = document.createElement('img');
        img.src = p.image;
        img.alt = p.title;
        card.appendChild(img);
        
        const details = document.createElement('div');
        details.className = 'wishlist-card-details';
        
        const pTitle = document.createElement('h4');
        pTitle.textContent = p.title;
        details.appendChild(pTitle);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-outline';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => {
            removeProductFromWishlist(wl.id, pid);
            renderWishlistContents(wl.id);
            renderCatalog(); // re-evaluates 'already in all wishlists'
        };
        details.appendChild(removeBtn);
        
        card.appendChild(details);
        grid.appendChild(card);
    });
    
    view.appendChild(grid);
}

function setupMergeModal() {
    const selA = document.getElementById('merge-wishlist-a');
    const selB = document.getElementById('merge-wishlist-b');
    selA.innerHTML = '<option value="">Select Wishlist A</option>';
    selB.innerHTML = '<option value="">Select Wishlist B</option>';
    
    const wishlists = getAllWishlists();
    wishlists.forEach(wl => {
        const optA = document.createElement('option');
        optA.value = wl.id;
        optA.textContent = wl.name;
        selA.appendChild(optA);
        
        const optB = document.createElement('option');
        optB.value = wl.id;
        optB.textContent = wl.name;
        selB.appendChild(optB);
    });
    
    const newNameInput = document.getElementById('merge-new-name');
    if (newNameInput) newNameInput.value = '';

    const updateName = () => {
        if (selA.value && selB.value) {
            const nameA = selA.options[selA.selectedIndex].text;
            const nameB = selB.options[selB.selectedIndex].text;
            if (newNameInput) newNameInput.value = `${nameA} + ${nameB}`;
        }
    };
    selA.onchange = updateName;
    selB.onchange = updateName;
}

function handleMerge() {
    const selA = document.getElementById('merge-wishlist-a');
    const selB = document.getElementById('merge-wishlist-b');
    const btn = document.getElementById('confirm-merge-btn');
    
    if (!selA.value || !selB.value) {
        showToast("Please select two wishlists");
        return;
    }
    
    btn.disabled = true;
    
    const newNameInput = document.getElementById('merge-new-name');
    const customName = newNameInput ? newNameInput.value.trim() : undefined;
    
    setTimeout(() => {
        try {
            const newWl = mergeWishlists(selA.value, selB.value, customName);
            showToast("Wishlists merged successfully");
            closeModal('merge-modal');
            renderSidebar();
            currentWishlistViewId = newWl.id;
            renderWishlistContents(newWl.id);
        } catch (e) {
            showToast(e.message);
        } finally {
            btn.disabled = false;
        }
    }, 50); // slight delay to allow UI to show disabled state for rapid clicks
}

export function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function openModal(id, focusElement) {
    previousFocusElement = document.activeElement;
    document.getElementById(id).classList.add('active');
    if (focusElement) focusElement.focus();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if (previousFocusElement) {
        previousFocusElement.focus();
        previousFocusElement = null;
    }
}
