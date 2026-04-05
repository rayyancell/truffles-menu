/* ═══════════════════════════════════════════
   TRUFFLES – Menu Dashboard Script (V13 DYNAMIC)
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  console.log("Truffles Script V13 (Dynamic Categories) Started");

  // ── State ──
  let dishes = []; 
  let categories = [];
  let chefItems = [];
  let cart = []; 
  let activeCat = 'all';
  let activeFilter = 'all';
  let viewMode = 'list';
  let viewedProductIndex = -1; 
  let currentCurrency = 'PKR'; 
  let currentLang = 'en';
  let tempQuantity = 1;
  let trackingOrderId = null;
  let statusEventSource = null;
  const FX_RATE = 280; 

  // Helper
  const getById = (id) => document.getElementById(id);

  // ── Rendering ──
  function formatPrice(amount) {
    const symbol = currentCurrency === 'USD' ? '$' : 'Rs. ';
    const value = currentCurrency === 'USD' ? amount : amount * FX_RATE;
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
  }

  function renderCategories() {
    const scroll = getById('categoriesScroll');
    if (!scroll) return;
    scroll.innerHTML = categories.map(cat => `
      <button class="cat-card ${activeCat === cat.id ? 'active' : ''}" data-cat="${cat.id}" onclick="setCategory('${cat.id}')">
        <div class="cat-icon-wrap"><span class="material-icons-round">${cat.icon}</span></div>
        <span class="cat-label"><span class="cat-text-meas">${cat.name}</span></span>
      </button>
    `).join('');

    const cards = scroll.querySelectorAll('.cat-card');
    cards.forEach(card => {
      const label = card.querySelector('.cat-label');
      const meas = card.querySelector('.cat-text-meas');
      if (meas && label && meas.scrollWidth > label.clientWidth) {
        const text = meas.textContent;
        label.innerHTML = `<span class="marquee-inner"><span class="mq-text">${text}&nbsp;&nbsp;&nbsp;&nbsp;</span><span class="mq-text">${text}&nbsp;&nbsp;&nbsp;&nbsp;</span></span>`;
      }
    });
  }

  window.setCategory = (id) => {
    activeCat = id;
    renderCategories();
    renderDishes();
  };

  function renderDishes() {
    const container = getById('dishesContainer');
    if (!container) return;
    let filtered = dishes.filter(d => 
      (activeCat === 'all' || d.category === activeCat) && 
      (activeFilter === 'all' || d.type === activeFilter) &&
      (d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    container.innerHTML = filtered.map(dish => `
      <div class="dish-card" onclick="openProductView('${dish.id}')">
        <div class="dish-img-wrap"><img src="${dish.image}" alt="${dish.name}"></div>
        <div class="dish-info">
          <div class="dish-name">${dish.name} <span class="dish-type-icon">${dish.type === 'veg' ? '🟢' : '🔴'}</span></div>
          <p class="dish-calories">${dish.calories} cal</p>
          <p class="dish-price">${formatPrice(dish.price)}</p>
        </div>
        <button class="add-btn" onclick="event.stopPropagation(); addToCartById('${dish.id}')">
          <span class="material-icons-round">add</span>
        </button>
      </div>
    `).join('');
    container.className = (viewMode === 'grid') ? 'dishes-container grid-view' : 'dishes-container';
  }

  function updateGlobalUI() {
    const count = cart.length;
    ['cartCount', 'fabBadge', 'prodCartCount'].forEach(id => {
      const el = getById(id);
      if (el) { el.textContent = count; count > 0 ? el.classList.add('show') : el.classList.remove('show'); }
    });
    renderCart();
  }

  function renderCart() {
    const body = getById('cartBody'); if (!body) return;
    if (cart.length === 0) { body.innerHTML = `<div class="empty-state" style="margin-top: 40px;"><p>Your cart is empty</p></div>`; getById('cartFooter').style.display = 'none'; return; }
    let total = 0;
    body.innerHTML = cart.map((dish, i) => { 
      total += dish.price; 
      return `<div class="cart-item" style="display:flex; gap:12px; margin-bottom:12px; align-items:center;">
          <div style="width:50px; height:50px; overflow:hidden; border-radius:8px;"><img src="${dish.image}" style="width:100%; height:100%; object-fit:cover;"></div>
          <div style="flex:1"><div style="font-weight:600; font-size:0.9rem;">${dish.name}</div><div style="color:var(--gold); font-size:0.8rem;">${formatPrice(dish.price)}</div></div>
          <button onclick="removeFromCart(${i})" style="background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer;"><span class="material-icons-round">close</span></button>
        </div>`; 
    }).join('');
    getById('cartTotal').textContent = formatPrice(total);
    getById('cartFooter').style.display = 'block';
  }

  // Actions
  window.openProductView = (dishId) => {
    viewedProductIndex = dishes.findIndex(d => String(d.id) === String(dishId));
    const dish = dishes[viewedProductIndex];
    if (!dish) return;
    getById('prodImage').src = dish.image; getById('prodTitle').textContent = dish.name; getById('prodTypeIcon').textContent = dish.type === 'veg' ? '🟢' : '🔴'; getById('prodPrice').textContent = formatPrice(dish.price).replace(/^\D+\s?/, ''); getById('prodCalories').textContent = dish.calories + ' cal'; getById('prodIngredients').innerHTML = dish.ingredients.map(ing => `<div class="ing-pill">${ing}</div>`).join('');
    getById('productView').classList.add('open'); document.body.style.overflow = 'hidden';
  };

  window.addToCartById = (id) => { const dish = dishes.find(d => String(d.id) === String(id)); if (dish) { cart.push(dish); updateGlobalUI(); showToast(`Added ${dish.name}`); } };
  
  window.orderChefSpecial = (id) => {
    const item = chefItems.find(i => String(i.id) === String(id));
    if (item) {
      if (!item.price) { showToast("Price not configured"); return; }
      cart.push({ ...item, isChefSpecial: true });
      updateGlobalUI();
      showToast(`Added ${item.name}`);
    }
  };

  window.removeFromCart = (index) => { cart.splice(index, 1); updateGlobalUI(); };
  function showToast(msg) { const t = getById('toast'); const m = getById('toastMsg'); if (t && m) { m.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); } }

  const closeAllLevels = () => { ['langOverlay', 'langSheet', 'trackOverlay', 'trackSheet', 'cartDrawer', 'cartOverlay', 'confirmOverlay', 'confirmSheet', 'checkoutOverlay', 'checkoutSheet', 'productView'].forEach(id => { const el = getById(id); if (el) el.classList.remove('open'); }); document.body.style.overflow = ''; };
  const openCartDrawer = () => { getById('cartDrawer').classList.add('open'); getById('cartOverlay').classList.add('open'); };

  // Listeners
  if (getById('themeToggle')) getById('themeToggle').onclick = () => document.body.classList.toggle('light-mode');
  if (getById('currencyToggle')) getById('currencyToggle').onclick = () => { currentCurrency = currentCurrency === 'USD' ? 'PKR' : 'USD'; renderDishes(); updateGlobalUI(); };
  if (getById('langToggle')) getById('langToggle').onclick = () => { getById('langOverlay').classList.add('open'); getById('langSheet').classList.add('open'); };
  if (getById('trackOpenBtn')) getById('trackOpenBtn').onclick = () => { getById('trackOverlay').classList.add('open'); getById('trackSheet').classList.add('open'); getById('trackInput').value = '#' + (localStorage.getItem('lastOrder') || '').slice(-4); };
  ['langCloseBtn', 'trackCloseBtn', 'cartClose', 'qtyMinus', 'prodBackBtn', 'cancelCheckoutBtn', 'closeSucessBtn', 'cartOverlay', 'langOverlay', 'trackOverlay', 'confirmOverlay'].forEach(id => { const el = getById(id); if (el) el.onclick = closeAllLevels; });

  if (getById('prodAddOrderBtn')) { getById('prodAddOrderBtn').onclick = () => { const dish = dishes[viewedProductIndex]; if (!dish) return; tempQuantity = 1; getById('qtyCount').textContent = tempQuantity; getById('confirmPrice').textContent = formatPrice(dish.price); getById('confirmOverlay').classList.add('open'); getById('confirmSheet').classList.add('open'); }; }
  ['fab', 'cartBtn', 'prodCartBtn'].forEach(id => { const el = getById(id); if (el) el.onclick = openCartDrawer; });
  if (getById('qtyPlus')) getById('qtyPlus').onclick = () => { tempQuantity++; getById('qtyCount').textContent = tempQuantity; getById('confirmPrice').textContent = formatPrice(dishes[viewedProductIndex].price * tempQuantity); };
  if (getById('confirmAddBtn')) { getById('confirmAddBtn').onclick = () => { const dish = dishes[viewedProductIndex]; for (let i = 0; i < tempQuantity; i++) cart.push(dish); updateGlobalUI(); closeAllLevels(); showToast("Added to order"); }; }

  if (getById('checkoutBtn')) {
    getById('checkoutBtn').onclick = () => { 
      if (cart.length === 0) return; 
      const counts = {}; cart.forEach(it => counts[it.name] = (counts[it.name] || 0) + 1); 
      getById('checkoutSummaryList').innerHTML = Object.keys(counts).map(n => {
        const item = cart.find(i=>i.name===n);
        return `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${counts[n]}x ${n}</span><span>${formatPrice(counts[n]*item.price)}</span></div>`;
      }).join(''); 
      
      const subtotal = cart.reduce((s,i)=>s+i.price,0);
      const tax = cart.reduce((s,i) => s + (i.price * (i.tax || 0) / 100), 0);
      
      getById('checkoutSubtotal').textContent = formatPrice(subtotal);
      getById('checkoutTaxAmount').textContent = formatPrice(tax);
      getById('checkoutTotalAmount').textContent = formatPrice(subtotal + tax);
      
      getById('checkoutStep1').style.display = 'block'; 
      getById('checkoutStep2').style.display = 'none'; 
      getById('checkoutStep3').style.display = 'none'; 
      getById('checkoutOverlay').classList.add('open'); 
      getById('checkoutSheet').classList.add('open'); 
    };
  }
  if (getById('nextToDetailsBtn')) getById('nextToDetailsBtn').onclick = () => { getById('checkoutStep1').style.display = 'none'; getById('checkoutStep2').style.display = 'block'; };
  if (getById('backToSummaryBtn')) getById('backToSummaryBtn').onclick = () => { getById('checkoutStep1').style.display = 'block'; getById('checkoutStep2').style.display = 'none'; };
  
  if (getById('finishOrderBtn')) {
    getById('finishOrderBtn').onclick = async () => {
      const name = getById('customerName').value.trim(); 
      const phone = getById('customerPhone').value.trim();
      const table = getById('tableNumber').value.trim(); 
      if (!name || !table || !phone) return alert("Enter Name, Phone and Table Number");
      
      const itemsArr = cart.map(i => ({ 
        name: i.name, 
        quantity: 1, 
        price: i.price, 
        tax: i.tax || 0 
      }));
      
      const subtotal = cart.reduce((s,i)=>s+i.price,0);
      const totalTax = cart.reduce((s,i) => s + (i.price * (i.tax || 0) / 100), 0);
      
      const orderData = { 
        customerName: name, 
        customerPhone: phone, 
        tableNumber: table, 
        items: itemsArr, 
        total: subtotal + totalTax,
        tax: totalTax
      };
      
      try { 
        const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) }); 
        if (res.ok) { 
          const order = await res.json(); 
          trackingOrderId = order.id; 
          localStorage.setItem('lastOrder', order.id); 
          getById('orderIdDisplay').textContent = '#' + String(order.id).slice(-4); 
          cart = []; 
          updateGlobalUI(); 
          getById('checkoutStep2').style.display = 'none'; 
          getById('checkoutStep3').style.display = 'block'; 
          updateStatusUI('Pending'); 
          initStatusUpdates(); 
        } 
      } catch(e) {}
    };
  }

  function initStatusUpdates() { 
    if (statusEventSource) return; 
    statusEventSource = new EventSource('/api/events'); 
    statusEventSource.onmessage = (e) => { 
      const { event, data } = JSON.parse(e.data); 
      if (event === 'order_status_updated' && trackingOrderId && String(data.id) === String(trackingOrderId)) updateStatusUI(data.status); 
      if (event === 'chef_special_updated') renderChefSpecial(data);
    }; 
  }
  function updateStatusUI(status) { const s = getById('orderStatusDisplay'); const rs = getById('resStatus'); if (s) { s.textContent = status.toUpperCase(); s.style.color = status === 'Completed' ? '#22c55e' : '#d4af37'; } if (rs) { rs.textContent = status.toUpperCase(); rs.className = status === 'Completed' ? 'status-badge-completed' : 'status-badge-pending'; } }
  
  let chefAutoScrollTimer = null;
  let chefCurrentIndex = 0;

  function startChefAutoScroll(items) {
    if (chefAutoScrollTimer) clearInterval(chefAutoScrollTimer);
    if (!items || items.length <= 1) return;
    chefCurrentIndex = 0;
    chefAutoScrollTimer = setInterval(() => {
      const slider = getById('chefSpecialSlider');
      if (!slider) { clearInterval(chefAutoScrollTimer); return; }
      chefCurrentIndex = (chefCurrentIndex + 1) % items.length;
      const bannerWidth = slider.querySelector('.banner')?.offsetWidth || slider.offsetWidth;
      slider.scrollTo({ left: chefCurrentIndex * (bannerWidth + 15), behavior: 'smooth' });
    }, 3000);
  }

  function renderChefSpecial(data) {
    const section = getById('chefSpecialSection');
    const slider = getById('chefSpecialSlider');
    if (!section || !slider) return;
    if (data && data.isEnabled && data.items && data.items.length > 0) {
      chefItems = data.items;
      slider.innerHTML = data.items.map(item => `
        <div class="banner" style="background-image: url('${item.image}')">
          <div class="banner-gradient"></div>
          <div class="banner-content">
            <span class="banner-badge">CHEF'S SPECIAL</span>
            <h3 class="banner-title">${item.name || 'Chef Special'}</h3>
            <p class="banner-sub">${item.description || ''}</p>
            ${item.price ? `<p class="banner-sub" style="color:var(--gold); font-size:1.1rem; font-weight:700; margin-top:5px; margin-bottom: 0;">Rs. ${(item.price * FX_RATE).toLocaleString()}</p>` : ''}
            <button class="banner-btn" onclick="orderChefSpecial('${item.id}')">
              <span>Order Now</span>
              <span class="material-icons-round">arrow_forward</span>
            </button>
          </div>
        </div>
      `).join('');
      section.style.display = 'block';
      setTimeout(() => { section.style.opacity = '1'; startChefAutoScroll(data.items); }, 10);
    } else {
      if (chefAutoScrollTimer) clearInterval(chefAutoScrollTimer);
      chefItems = [];
      section.style.opacity = '0';
      setTimeout(() => section.style.display = 'none', 500);
    }
  }

  if (getById('trackSearchBtn')) getById('trackSearchBtn').onclick = async () => { 
    const id = getById('trackInput').value.replace('#', ''); 
    if (!id) return; 
    try { 
      const res = await fetch(`/api/orders/${id}`); 
      if (res.ok) { 
        const order = await res.json(); 
        trackingOrderId = order.id; 
        getById('resName').textContent = order.customerName; 
        getById('resMeta').innerHTML = `Table #${order.tableNumber}`; 
        getById('resItems').innerHTML = order.items.map(it => `<div>${it.quantity}x ${it.name}</div>`).join(''); 
        getById('resTotal').textContent = formatPrice(order.total); 
        updateStatusUI(order.status); 
        getById('trackResult').style.display = 'block'; 
        getById('trackEmpty').style.display = 'none'; 
        initStatusUpdates(); 
      } else { 
        getById('trackResult').style.display = 'none'; 
        getById('trackEmpty').style.display = 'block'; 
      } 
    } catch(e) {} 
  };
  
  document.querySelectorAll('.lang-option').forEach(opt => opt.onclick = () => { currentLang = opt.dataset.lang; getById('langBadge').textContent = currentLang.toUpperCase(); closeAllLevels(); });
  document.querySelectorAll('.pill').forEach(btn => btn.onclick = () => { document.querySelectorAll('.pill').forEach(p => p.classList.remove('active')); btn.classList.add('active'); activeFilter = btn.dataset.filter; renderDishes(); });
  document.querySelectorAll('.view-btn').forEach(btn => btn.onclick = () => { document.querySelectorAll('.view-btn').forEach(v => v.classList.remove('active')); btn.classList.add('active'); viewMode = btn.dataset.view; renderDishes(); });

  let searchQuery = '';
  if (getById('searchInput')) getById('searchInput').oninput = (e) => { searchQuery = e.target.value.trim(); renderDishes(); };

  async function loadInitialData() {
    try { 
      const resC = await fetch('/api/categories'); if (resC.ok) categories = await resC.json();
      const resD = await fetch('/api/dishes'); if (resD.ok) dishes = await resD.json();
      const resS = await fetch('/api/chef-special'); if (resS.ok) renderChefSpecial(await resS.json());
    } catch(e) {}
    renderCategories(); renderDishes(); updateGlobalUI();
    initStatusUpdates(); // initialize SSE globally
  }
  loadInitialData();
});
