const SB_URL = "https://jjfjqanesiqgktocjaez.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZmpxYW5lc2lxZ2t0b2NqYWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTgyNTcsImV4cCI6MjA4OTA3NDI1N30.ZJxC1H8r1oj8WGR3wJb7hf3-26P_BT8B5avcyZujftg";

// Core API function
async function api(path, method = 'GET', data = null) {
    const options = {
        method, headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    };
    if (data) options.body = JSON.stringify(data);
    const response = await fetch(`${SB_URL}/rest/v1/${path}`, options);
    return method === 'GET' ? response.json() : response;
}

// Hamburger Menu Logic
function setupNav() {
    const btn = document.getElementById('menuBtn');
    const close = document.getElementById('closeBtn');
    const overlay = document.getElementById('menuOverlay');
    if(btn && close && overlay) {
        btn.onclick = () => { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
        close.onclick = () => { overlay.classList.remove('active'); document.body.style.overflow = 'auto'; };
    }
}

// Load Products (For Men, Women, Kids pages)
// Inside your existing script.js, update the loadProducts function:

async function loadProducts(category) {
    setupNav();
    let query = `products?category=eq.${category}`;
    
    const sort = document.getElementById('priceSort')?.value;
    const size = document.getElementById('sizeFilter')?.value;
    if (sort === 'low') query += `&order=price.asc`;
    if (sort === 'high') query += `&order=price.desc`;

    let data = await api(query);
    if (size) data = data.filter(item => item.sizes.includes(size));

    const grid = document.getElementById('main-grid');
    if(!grid) return;
    
    grid.innerHTML = data.map(shoe => `
        <div class="shoe-card">
            <!-- Grab the FIRST image from the array -->
            <div class="shoe-img"><img src="${shoe.image_urls[0]}" alt="${shoe.name}"></div>
            <div class="shoe-info">
                <div style="display:flex; justify-content:space-between; margin-bottom: 15px;">
                    <div><h3 style="font-size: 1.4rem;">${shoe.name}</h3>
                    <!-- Change $ to ₹ -->
                    <p style="color:#666; font-weight:600;">₹${shoe.price.toLocaleString('en-IN')}</p></div>
                </div>
                <div style="display:flex; gap:5px; margin-bottom: 20px; flex-wrap: wrap;">
                    ${shoe.sizes.map(s => `<span style="padding:4px 8px; border:2px solid black; border-radius:4px; font-weight:800; font-size:12px;">UK ${s}</span>`).join('')}
                </div>
                <a href="checkout.html?id=${shoe.id}" class="btn-main" style="width:100%;">VIEW PRODUCT</a>
            </div>
        </div>
    `).join('');
}

// --- Global Navbar & Auth Setup ---
function setupGlobal() {
    // 1. Setup Hamburger Menu
    const btn = document.getElementById('menuBtn');
    const close = document.getElementById('closeBtn');
    const overlay = document.getElementById('menuOverlay');
    
    if(btn && close && overlay) {
        btn.onclick = () => { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
        close.onclick = () => { overlay.classList.remove('active'); document.body.style.overflow = 'auto'; };
    }

    // 2. Check Authentication State
    const user = JSON.parse(localStorage.getItem('step_user'));
    const accBtns = document.querySelectorAll('.account-pill'); // Class given to ACCOUNT buttons in nav
    
    if (user) {
        accBtns.forEach(btn => {
            btn.innerText = 'LOGOUT';
            btn.href = '#';
            btn.onclick = (e) => {
                e.preventDefault();
                localStorage.removeItem('step_user');
                window.location.reload();
            };
        });
    }
}

// Update loadProducts to call setupGlobal() and update button text
// --- 4. UPGRADED PRODUCT GRID (WITH INVENTORY LOGIC) ---
async function loadProducts(category) {
    setupGlobal();
    const grid = document.getElementById('main-grid');
    if(!grid) return;

    // Inject Skeletons
    grid.innerHTML = Array(6).fill(`
        <div class="skeleton-card-wrapper">
            <div class="skeleton-box skel-img-box"></div>
            <div class="skel-content-box"><div class="skeleton-box skel-line-long"></div><div class="skeleton-box skel-line-short"></div><div class="skeleton-box skel-button-pill"></div></div>
        </div>
    `).join('');

    try {
        let query = `products?category=eq.${category}`;
        const sort = document.getElementById('priceSort')?.value;
        const size = document.getElementById('sizeFilter')?.value;
        if (sort === 'low') query += `&order=price.asc`;
        if (sort === 'high') query += `&order=price.desc`;

        let data = await api(query);
        if (!Array.isArray(data)) data =[];

        if (size) {
            data = data.filter(item => {
                const s = Array.isArray(item.sizes) ? item.sizes : (typeof item.sizes === 'string' ? item.sizes.split(',') :[]);
                return s.includes(size);
            });
        }

        if (data.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px;"><h2>NO DROPS FOUND.</h2><p style="color: #666; font-weight: 600;">Inventory is currently empty.</p></div>`;
            return;
        }

        grid.innerHTML = data.map((shoe, index) => {
            const price = Number(shoe.price || 0);
            const name = shoe.name || 'Unknown Item';
            const stock = Number(shoe.stock === undefined ? 10 : shoe.stock); // Fallback to 10 if missing
            
            let img = 'https://via.placeholder.com/400';
            if (Array.isArray(shoe.image_urls) && shoe.image_urls.length > 0) img = shoe.image_urls[0];
            else if (typeof shoe.image_urls === 'string') img = shoe.image_urls.replace(/[{}"']/g, '').split(',')[0];
            
            let sizes = Array.isArray(shoe.sizes) ? shoe.sizes : (typeof shoe.sizes === 'string' ? shoe.sizes.replace(/[{}"']/g, '').split(',') :[]);

            // --- INVENTORY PSYCHOLOGY LOGIC ---
            let badgeHtml = '';
            let btnHtml = `<a href="checkout.html?id=${shoe.id}" class="btn-main" style="width:100%;">VIEW PRODUCT</a>`;
            let cardClass = 'shoe-card';

            if (stock === 0) {
                badgeHtml = `<div class="scarcity-badge badge-sold-out">SOLD OUT</div>`;
                btnHtml = `<button class="btn-main btn-disabled" style="width:100%;" disabled>OUT OF STOCK</button>`;
                cardClass += ' is-sold-out'; // Triggers greyscale CSS
            } else if (stock <= 5) {
                badgeHtml = `<div class="scarcity-badge badge-low-stock">ONLY ${stock} LEFT</div>`;
            }

            return `
            <div class="${cardClass}" style="opacity: 1; animation: pageFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s forwards;">
                <div class="shoe-img shoe-img-container">
                    ${badgeHtml}
                    <img src="${img}" alt="${name}" loading="lazy">
                </div>
                <div class="shoe-info">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 15px;">
                        <div>
                            <h3 style="font-size: 1.3rem;">${name}</h3>
                            <p style="color:#666; font-weight:800; margin-top: 5px;">₹${price.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div style="display:flex; gap:5px; margin-bottom: 20px; flex-wrap: wrap;">
                        ${sizes.slice(0, 4).map(s => `<span style="padding:4px 8px; border:2px solid black; border-radius:4px; font-weight:800; font-size:12px;">UK ${s}</span>`).join('')}
                        ${sizes.length > 4 ? '<span style="font-size: 12px; font-weight: 800; padding:4px;">+ MORE</span>' : ''}
                    </div>
                    ${btnHtml}
                </div>
            </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Render Crash:", err);
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px;"><h2>SYSTEM ERROR.</h2></div>`;
    }
}
// --- CART ENGINE ---
function getCart() {
    return JSON.parse(localStorage.getItem('step_cart')) ||[];
}

function saveCart(cart) {
    localStorage.setItem('step_cart', JSON.stringify(cart));
    updateCartBadges();
}

function updateCartBadges() {
    const cart = getCart();
    document.querySelectorAll('.cart-count').forEach(badge => {
        badge.innerText = cart.length;
        // Pulse animation on add
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    });
}

// Update setupGlobal to refresh cart badges
const originalSetupGlobal = window.setupGlobal || function(){};
window.setupGlobal = function() {
    originalSetupGlobal();
    updateCartBadges();
}