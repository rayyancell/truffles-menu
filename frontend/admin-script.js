/* ═══════════════════════════════════════════
   TRUFFLES – Admin Dashboard Logic (V15 UPLOAD)
   ═══════════════════════════════════════════ */

window.editDish = null;
window.deleteDish = null;
window.deleteCategory = null;
window.updateStatus = null;
window.deleteRemoteOrder = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Admin Dashboard V15 (Upload) Started");
  const API_URL = '/api';
  const RATE = 280;
  // Use sessionStorage so the token clears when the tab/browser is closed
  let authToken = sessionStorage.getItem('adminToken');

  // ── Auth Handling ──
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // Clear outdated or malformed tokens on first load
  if (!authToken || String(authToken).indexOf('truffles-') === -1) {
    authToken = null;
    sessionStorage.removeItem('adminToken');
    if (loginOverlay) loginOverlay.style.display = 'flex';
  } else {
    if (loginOverlay) loginOverlay.style.display = 'none';
  }

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const password = document.getElementById('loginPassword').value;
      try {
        const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        if (res.ok) {
          const data = await res.json();
          authToken = data.token;
          sessionStorage.setItem('adminToken', authToken);
          loginOverlay.style.display = 'none';
          initDashboard();
        } else {
          loginError.style.display = 'block';
        }
      } catch (err) {
        console.error("Login failed", err);
      }
    };
  }

  // Helper fetch with auth
  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
      }
    }).then(async res => {
      if (res.status === 401) {
        sessionStorage.removeItem('adminToken');
        window.location.reload();
      }
      return res;
    });
  };

  // View Elements
  const dishesView = document.getElementById('dishesView');
  const ordersView = document.getElementById('ordersView');
  const categoriesView = document.getElementById('categoriesView');
  const chefView = document.getElementById('chefView');

  // Tables
  const dishesTableBody = document.getElementById('dishesTableBody');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const catsTableBody = document.getElementById('catsTableBody');

  // Modals & Forms
  const dishModal = document.getElementById('dishModal');
  const catModal = document.getElementById('catModal');
  const dishForm = document.getElementById('dishForm');
  const catForm = document.getElementById('catForm');
  const dishCategorySelect = document.getElementById('dishCategory');
  const dishImageInput = document.getElementById('dishImage');
  const dishFileInput = document.getElementById('dishFileInput');
  const imagePreview = document.getElementById('imagePreview');

  let cachedCategories = []; // prevent duplicate-population bug

  // ── Navigation ──
  document.querySelectorAll('.nav-item').forEach(item => {
    const view = item.dataset.view;
    if (!view) return; // Skip items without a view (like Logout)

    item.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      dishesView.style.display = view === 'dishes' ? 'block' : 'none';
      ordersView.style.display = view === 'orders' ? 'block' : 'none';
      categoriesView.style.display = view === 'categories' ? 'block' : 'none';
      chefView.style.display = view === 'chef' ? 'block' : 'none';
      if (view === 'dishes') fetchDishes();
      else if (view === 'orders') fetchOrders();
      else if (view === 'categories') fetchCategories();
      else if (view === 'chef') fetchChefSpecial();
    };
  });

  // ── Image Upload Handling ──
  if (dishFileInput) {
    dishFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        imagePreview.style.backgroundImage = `url(${base64})`;
        // Upload immediately or wait for submit? 
        // Better for user feedback: upload now and set the URL.
        const res = await authFetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, name: file.name })
        });
        if (res.ok) {
          const data = await res.json();
          dishImageInput.value = data.url;
        }
      };
      reader.readAsDataURL(file);
    };
  }

  // ── Chef Image Upload Handling ──
  const chefFileInput = document.getElementById('chefFileInput');
  const chefImagePreview = document.getElementById('chefImagePreview');
  const chefImageInput = document.getElementById('chefImage');
  if (chefFileInput) {
    chefFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        chefImagePreview.style.backgroundImage = `url(${base64})`;
        const res = await authFetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, name: file.name })
        });
        if (res.ok) {
          const data = await res.json();
          chefImageInput.value = data.url;
        }
      };
      reader.readAsDataURL(file);
    };
  }

  // ── Global Handlers ──
  window.editDish = async (id) => {
    const res = await authFetch(`${API_URL}/dishes`);
    const dishes = await res.json();
    const dish = dishes.find(d => String(d.id) === String(id));
    if (dish) {
      document.getElementById('modalTitle').textContent = 'Edit Dish';
      document.getElementById('dishId').value = dish.id;
      document.getElementById('dishName').value = dish.name;
      document.getElementById('dishCategory').value = dish.category;
      document.getElementById('dishType').value = dish.type || 'non-veg';
      document.getElementById('dishPrice').value = Math.round(dish.price * RATE);
      dishImageInput.value = dish.image;
      imagePreview.style.backgroundImage = `url(${dish.image})`;
      document.getElementById('dishIngredients').value = dish.ingredients.join(', ');
      document.getElementById('dishTax').value = dish.tax || 0;
      dishModal.style.display = 'flex';
    }
  };

  window.deleteDish = async (id) => { if (confirm('Delete?')) { await authFetch(`${API_URL}/dishes/${id}`, { method: 'DELETE' }); fetchDishes(); } };
  window.updateStatus = async (id, status) => { await authFetch(`${API_URL}/orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); fetchOrders(); };
  window.deleteRemoteOrder = async (id) => { if (confirm("Remove order?")) { await authFetch(`${API_URL}/orders/${id}`, { method: 'DELETE' }); fetchOrders(); } };
  window.deleteCategory = async (id) => { if (id !== 'all' && confirm("Delete category?")) { await authFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' }); fetchCategories(); } };
  window.editCategory = async (id) => {
    const res = await authFetch(`${API_URL}/categories`);
    const cats = await res.json();
    const cat = cats.find(c => c.id === id);
    if (cat) {
      document.getElementById('catId').value = cat.id;
      document.getElementById('catName').value = cat.name;
      document.getElementById('catIcon').value = cat.icon;
      document.getElementById('catModalTitle').textContent = 'Edit Category';
      document.getElementById('catModal').style.display = 'flex';
    }
  };

  window.editChefItem = async (id) => {
    const res = await authFetch(`${API_URL}/chef-special`);
    const data = await res.json();
    const item = (data.items || []).find(i => String(i.id) === String(id));
    if (item) {
      document.getElementById('chefModalTitle').textContent = 'Edit Chef Special';
      document.getElementById('chefItemId').value = item.id;
      document.getElementById('chefItemName').value = item.name;
      document.getElementById('chefItemDesc').value = item.description;
      document.getElementById('chefItemPrice').value = item.price ? Math.round(item.price * RATE) : '';
      document.getElementById('chefItemTax').value = item.tax || '';
      document.getElementById('chefImage').value = item.image;
      document.getElementById('chefImagePreview').style.backgroundImage = `url(${item.image})`;
      document.getElementById('chefModal').style.display = 'flex';
    }
  };

  window.deleteChefItem = async (id) => {
    if (confirm('Delete Chef Special item?')) {
      await authFetch(`${API_URL}/chef-special/items/${id}`, { method: 'DELETE' });
      fetchChefSpecial();
    }
  };

  // ── Data Fetching ──
  async function fetchCategories() {
    const res = await authFetch(`${API_URL}/categories`);
    cachedCategories = await res.json();
    if (catsTableBody) catsTableBody.innerHTML = cachedCategories.map(cat => `<tr><td><span class="material-icons-round">${cat.icon}</span></td><td>${cat.name}</td><td><code>${cat.id}</code></td><td><div class="action-btns">${cat.id !== 'all' ? `<button class="icon-btn" onclick="editCategory('${cat.id}')"><span class="material-icons-round">edit</span></button><button class="icon-btn delete-btn" onclick="deleteCategory('${cat.id}')"><span class="material-icons-round">delete</span></button>` : ''}</div></td></tr>`).join('');
    // Always reset to prevent duplication
    if (dishCategorySelect) {
      dishCategorySelect.innerHTML = cachedCategories
        .filter(c => c.id !== 'all')
        .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
        .join('');
    }
  }

  let cachedDishes = [];

  function renderDishTable(query = '') {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? cachedDishes.filter(dish => {
          const catObj = cachedCategories.find(c => c.id === dish.category);
          const catName = catObj ? catObj.name.toLowerCase() : dish.category.toLowerCase();
          return dish.name.toLowerCase().includes(q) || catName.includes(q);
        })
      : cachedDishes;

    if (!dishesTableBody) return;
    if (filtered.length === 0) {
      dishesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary); font-style:italic;">No items found</td></tr>`;
      return;
    }
    dishesTableBody.innerHTML = filtered.map(dish => {
      const catObj = cachedCategories.find(c => c.id === dish.category);
      const catDisplay = catObj ? catObj.name : dish.category;
      return `<tr><td><img src="${dish.image}" class="dish-img"></td><td>${dish.name}</td><td>${catDisplay}</td><td>Rs. ${(dish.price * RATE).toLocaleString()}</td><td><div class="action-btns"><button class="icon-btn" onclick="editDish('${dish.id}')"><span class="material-icons-round">edit</span></button><button class="icon-btn delete-btn" onclick="deleteDish('${dish.id}')"><span class="material-icons-round">delete</span></button></div></td></tr>`;
    }).join('');
  }

  async function fetchDishes() {
    const res = await authFetch(`${API_URL}/dishes`);
    cachedDishes = await res.json();
    const searchEl = document.getElementById('dishSearchInput');
    renderDishTable(searchEl ? searchEl.value : '');
    // Wire search input once
    if (searchEl && !searchEl._wired) {
      searchEl._wired = true;
      searchEl.oninput = (e) => renderDishTable(e.target.value);
    }
  }

  async function fetchOrders() {
    const res = await authFetch(`${API_URL}/orders`);
    const orders = await res.json();
    if (ordersTableBody) {
      orders.sort((a,b) => b.id - a.id);
      ordersTableBody.innerHTML = orders.map(order => createOrderRow(order)).join('');
    }
  }

  async function fetchChefSpecial() {
    const res = await authFetch(`${API_URL}/chef-special`);
    if (res.ok) {
      const data = await res.json();
      const chefEnabledToggle = document.getElementById('chefEnabled');
      if (chefEnabledToggle) chefEnabledToggle.checked = Boolean(data.isEnabled);
      
      const chefTableBody = document.getElementById('chefTableBody');
      if (chefTableBody) {
        chefTableBody.innerHTML = (data.items || []).map(item => `
          <tr>
            <td><img src="${item.image}" class="dish-img"></td>
            <td>${item.name}</td>
            <td>${item.description}</td>
            <td>${item.price ? 'Rs. ' + (item.price * RATE).toLocaleString() : '-'}</td>
            <td>
              <div class="action-btns">
                <button class="icon-btn" onclick="editChefItem('${item.id}')"><span class="material-icons-round">edit</span></button>
                <button class="icon-btn delete-btn" onclick="deleteChefItem('${item.id}')"><span class="material-icons-round">delete</span></button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // ── Modals & Forms ──
  const addDishBtn = document.getElementById('addDishBtn');
  if (addDishBtn) addDishBtn.onclick = () => { document.getElementById('modalTitle').textContent = 'Add Dish'; dishForm.reset(); document.getElementById('dishId').value = ''; imagePreview.style.backgroundImage = ''; dishModal.style.display = 'flex'; };
  const addCatBtn = document.getElementById('addCatBtn');
  if (addCatBtn) addCatBtn.onclick = () => { 
    document.getElementById('catModalTitle').textContent = 'Add Category'; 
    catForm.reset(); 
    document.getElementById('catId').value = ''; 
    catModal.style.display = 'flex'; 
  };

  const addChefItemBtn = document.getElementById('addChefItemBtn');
  if (addChefItemBtn) addChefItemBtn.onclick = () => {
    document.getElementById('chefModalTitle').textContent = 'Add Chef Special';
    document.getElementById('chefItemForm').reset();
    document.getElementById('chefItemId').value = '';
    document.getElementById('chefImagePreview').style.backgroundImage = '';
    document.getElementById('chefModal').style.display = 'flex';
  };

  ['closeModal', 'closeCatModal', 'closeChefModal'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.onclick = () => {
      if (document.getElementById('dishModal')) document.getElementById('dishModal').style.display = 'none';
      if (document.getElementById('catModal')) document.getElementById('catModal').style.display = 'none';
      if (document.getElementById('chefModal')) document.getElementById('chefModal').style.display = 'none';
    };
  });

  if (dishForm) {
    dishForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('dishId').value;
      const data = { 
        name: document.getElementById('dishName').value, 
        category: document.getElementById('dishCategory').value,
        type: document.getElementById('dishType').value,
        price: parseFloat(document.getElementById('dishPrice').value) / RATE, 
        tax: parseFloat(document.getElementById('dishTax').value) || 0,
        image: dishImageInput.value, 
        ingredients: document.getElementById('dishIngredients').value.split(',').map(s => s.trim()) 
      };
      await authFetch(id ? `${API_URL}/dishes/${id}` : `${API_URL}/dishes`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      dishModal.style.display = 'none'; fetchDishes();
    };
  }

  if (catForm) {
    catForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('catId').value;
      const data = { name: document.getElementById('catName').value, icon: document.getElementById('catIcon').value };
      await authFetch(id ? `${API_URL}/categories/${id}` : `${API_URL}/categories`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      catModal.style.display = 'none'; fetchCategories();
    };
  }

  const chefEnabledToggle = document.getElementById('chefEnabled');
  if (chefEnabledToggle) {
    chefEnabledToggle.onchange = async (e) => {
      await authFetch(`${API_URL}/chef-special/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: e.target.checked })
      });
    };
  }

  const chefItemForm = document.getElementById('chefItemForm');
  if (chefItemForm) {
    chefItemForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('chefItemId').value;
      const priceVal = document.getElementById('chefItemPrice').value;
      const data = {
        name: document.getElementById('chefItemName').value,
        description: document.getElementById('chefItemDesc').value,
        price: priceVal ? parseFloat(priceVal) / RATE : 0,
        tax: parseFloat(document.getElementById('chefItemTax').value) || 0,
        image: document.getElementById('chefImage').value
      };
      await authFetch(id ? `${API_URL}/chef-special/items/${id}` : `${API_URL}/chef-special/items`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      document.getElementById('chefModal').style.display = 'none';
      fetchChefSpecial();
    };
  }

  // Init
  window.initDashboard = () => {
    fetchCategories().then(() => { if (dishesView.style.display !== 'none') fetchDishes(); });
    setupSSE();
  };

  if (authToken) initDashboard();

  // ── Real-time Updates (SSE) ──
  function setupSSE() {
    const evtSource = new EventSource(`${API_URL}/events`);
    
    evtSource.onmessage = (event) => {
      const { event: eventName, data } = JSON.parse(event.data);
      console.log(`[SSE] Received: ${eventName}`, data);
      
      if (eventName === 'order_placed') {
        handleNewOrder(data);
      } else if (eventName === 'order_status_updated') {
        handleStatusUpdate(data);
      } else if (eventName === 'order_removed') {
        handleOrderRemoval(data.id);
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE connection error, retrying in 5s...", err);
      evtSource.close();
      setTimeout(setupSSE, 5000);
    };
  }

  function handleNewOrder(order) {
    // 1. Notification Sound
    playNotificationSound();

    // 2. Browser Toast/Notification
    showToast(`New Order from ${order.customerName} (Table ${order.tableNumber})`);

    // 3. Open Print Preview Modal
    openPrintPreview(order);

    // 4. Update UI if on orders view
    if (ordersTableBody) {
      const rowHtml = createOrderRow(order);
      // Prepend to top
      const tempWrapper = document.createElement('tbody');
      tempWrapper.innerHTML = rowHtml;
      const newRow = tempWrapper.firstChild;
      
      // Add highlight class
      newRow.classList.add('new-order-highlight');
      
      ordersTableBody.insertBefore(newRow, ordersTableBody.firstChild);
      
      // Remove highlight after animation
      setTimeout(() => newRow.classList.remove('new-order-highlight'), 3000);
    }
  }

  function handleStatusUpdate(order) {
    const row = document.getElementById(`order-${order.id}`);
    if (row) {
      // Find the status badge specifically (not the type badge)
      const badge = row.querySelector('.status-pending, .status-completed');
      const actionCell = row.querySelector('td:last-child div');
      
      if (badge) {
        badge.className = `status-badge ${order.status === 'Completed' ? 'status-completed' : 'status-pending'}`;
        badge.textContent = order.status.toUpperCase();
      }
      
      if (actionCell && order.status === 'Completed') {
        actionCell.innerHTML = `✅<button class="btn-danger" style="padding:6px;border-radius:4px;font-size:0.7rem;" onclick="deleteRemoteOrder('${order.id}')">DEL</button>`;
      }
    }
  }

  function handleOrderRemoval(id) {
    const row = document.getElementById(`order-${id}`);
    if (row) {
      row.classList.add('order-removed');
      setTimeout(() => row.remove(), 500);
    }
  }

  function createOrderRow(order) {
    return `<tr id="order-${order.id}">
      <td>#${String(order.id).slice(-4)}</td>
      <td>${order.customerName}</td>
      <td>${order.customerPhone || 'N/A'}</td>
      <td>${order.tableNumber}</td>
      <td>${order.items.map(i => i.quantity + 'x ' + i.name).join('<br>')}</td>
      <td>Rs. ${(order.total * RATE).toLocaleString()}</td>
      <td><span class="status-badge ${order.status === 'Completed' ? 'status-completed' : 'status-pending'}">${(order.status || 'Pending').toUpperCase()}</span></td>
      <td>
        <div style="display:flex;gap:8px;">
          <button class="icon-btn" onclick="reprintOrder('${order.id}')" title="Print Receipt"><span class="material-icons-round">print</span></button>
          ${order.status !== 'Completed' ? `<button class="btn btn-outline" style="padding:6px;font-size:0.7rem;cursor:pointer;" onclick="updateStatus('${order.id}','Completed')">DONE</button>` : '✅'}
          <button class="btn-danger" style="padding:6px;border-radius:4px;font-size:0.7rem;" ${order.status !== 'Completed' ? 'disabled' : ''} onclick="deleteRemoteOrder('${order.id}')">DEL</button>
        </div>
      </td>
    </tr>`;
  }

  // ── Receipt Printing Logic ──
  const printedOrders = new Set();

  function openPrintPreview(order) {
    if (printedOrders.has(order.id)) return;
    printedOrders.add(order.id);
    
    // Populate Professional Receipt Template
    const now = new Date(order.date || Date.now());
    document.getElementById('p-order-id').textContent = '#' + String(order.id).slice(-4);
    document.getElementById('p-date').textContent = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
    document.getElementById('p-time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('p-customer').textContent = order.customerName;
    document.getElementById('p-phone').textContent = order.customerPhone || 'N/A';
    document.getElementById('p-table').textContent = order.tableNumber || 'N/A';
    
    // Items List
    const itemsContainer = document.getElementById('p-items-container');
    itemsContainer.innerHTML = order.items.map(it => `
      <div class="receipt-item-row">
        <span>${it.quantity}x ${it.name}</span>
        <span>${((it.price * RATE) * it.quantity).toLocaleString()}</span>
      </div>
    `).join('');

    document.getElementById('p-tax').textContent = ((order.tax || 0) * RATE).toLocaleString();
    document.getElementById('p-total').textContent = (order.total * RATE).toLocaleString();

    // Show Preview Modal
    console.log("[Admin] Opening print preview for order:", order.id);
    document.getElementById('receipt-preview-modal').classList.add('show');
  }

  // Handle Preview Modal Actions
  const confirmPrintBtn = document.getElementById('confirmPrintBtn');
  const cancelPrintBtn = document.getElementById('cancelPrintBtn');

  if (confirmPrintBtn) {
    confirmPrintBtn.onclick = () => {
      window.print();
      document.getElementById('receipt-preview-modal').classList.remove('show');
    };
  }

  if (cancelPrintBtn) {
    cancelPrintBtn.onclick = () => {
      document.getElementById('receipt-preview-modal').classList.remove('show');
    };
  }

  window.reprintOrder = async (id) => {
    const res = await authFetch(`${API_URL}/orders/${id}`);
    if (res.ok) {
       const order = await res.json();
       printedOrders.delete(order.id); // Allow re-preview
       openPrintPreview(order);
    }
  };

  window.toggleLogoutOption = () => {
    const opt = document.getElementById('logoutAccountOption');
    const icon = document.getElementById('logoutIcon');
    const isShowing = opt.style.display === 'flex';
    opt.style.display = isShowing ? 'none' : 'flex';
    icon.textContent = isShowing ? 'expand_more' : 'expand_less';
  };

  const CATEGORY_ICONS = [
    // General
    { icon: 'restaurant', label: 'Restaurant' },
    { icon: 'lunch_dining', label: 'Lunch' },
    { icon: 'dinner_dining', label: 'Dinner' },
    { icon: 'breakfast_dining', label: 'Breakfast' },
    { icon: 'menu_book', label: 'Menu' },
    { icon: 'flatware', label: 'Cutlery' },
    // Pizza & Fast Food
    { icon: 'local_pizza', label: 'Pizza' },
    { icon: 'fastfood', label: 'Fast Food' },
    { icon: 'kebab_dining', label: 'Kebab' },
    { icon: 'takeout_dining', label: 'Takeout' },
    // Sandwiches & Wraps
    { icon: 'bakery_dining', label: 'Sandwich / Wrap' },
    { icon: 'egg_alt', label: 'Eggs' },
    // Rice & Biryani
    { icon: 'rice_bowl', label: 'Biryani / Rice' },
    { icon: 'set_meal', label: 'Set Meal' },
    { icon: 'ramen_dining', label: 'Ramen / Noodles' },
    // Curries (Handi, Karahi, Daal)
    { icon: 'soup_kitchen', label: 'Handi / Soup' },
    { icon: 'outdoor_grill', label: 'Karahi / Grill' },
    { icon: 'local_fire_department', label: 'Daal / Hot' },
    { icon: 'cooking', label: 'Cooking' },
    // Salads & Vegetables
    { icon: 'eco', label: 'Salad / Veg' },
    { icon: 'grass', label: 'Greens' },
    { icon: 'spa', label: 'Fresh / Herbs' },
    { icon: 'energy_savings_leaf', label: 'Raita / Leaf' },
    // Bread (Naan & Roti)
    { icon: 'grain', label: 'Naan / Roti' },
    // Desserts
    { icon: 'icecream', label: 'Ice Cream' },
    { icon: 'cake', label: 'Cake / Dessert' },
    { icon: 'cookie', label: 'Cookie' },
    // Drinks & Juices
    { icon: 'local_bar', label: 'Bar / Drinks' },
    { icon: 'local_cafe', label: 'Cafe' },
    { icon: 'coffee', label: 'Coffee / Tea' },
    { icon: 'emoji_food_beverage', label: 'Beverage' },
    { icon: 'wine_bar', label: 'Wine' },
    { icon: 'liquor', label: 'Liquor' },
    { icon: 'water_drop', label: 'Juice / Water' },
    { icon: 'blender', label: 'Blender / Shake' },
    { icon: 'sports_bar', label: 'Sports Bar' },
    // Extras
    { icon: 'tapas', label: 'Tapas / Starters' },
    { icon: 'star', label: 'Special' },
    { icon: 'favorite', label: 'Favourite' },
    { icon: 'whatshot', label: 'Hot / Trending' },
    { icon: 'workspace_premium', label: 'Premium' },
  ];

  window.openIconPicker = () => {
    const grid = document.getElementById('iconGrid');
    const modal = document.getElementById('iconPickerModal');
    const renderIcons = (list) => {
      grid.innerHTML = list.map(({ icon, label }) => `
        <div onclick="selectCategoryIcon('${icon}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px; border-radius:8px; border:1px solid var(--border); transition:0.2s; background:rgba(255,255,255,0.02);" class="icon-option">
          <span class="material-icons-round" style="font-size:26px; color:var(--gold);">${icon}</span>
          <span style="font-size:0.6rem; opacity:0.7; text-align:center; word-break:break-word; line-height:1.2;">${label}</span>
        </div>
      `).join('');
    };
    renderIcons(CATEGORY_ICONS);
    // Add search on each keyup
    const searchEl = document.getElementById('iconSearch');
    if (searchEl) {
      searchEl.value = '';
      searchEl.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        renderIcons(CATEGORY_ICONS.filter(({ icon, label }) => icon.includes(q) || label.toLowerCase().includes(q)));
      };
    }
    modal.style.display = 'flex';
  };

  window.selectCategoryIcon = (icon) => {
    document.getElementById('catIcon').value = icon;
    document.getElementById('iconPickerModal').style.display = 'none';
  };

  document.getElementById('closeIconPicker').onclick = () => {
    document.getElementById('iconPickerModal').style.display = 'none';
  };

  function playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // A4
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio notification failed", e);
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      background: var(--gold); color: var(--bg-primary);
      padding: 16px 24px; border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 9999; font-weight: 700;
      animation: slideInRight 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Add styles for toast animations if not present
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `;
  document.head.appendChild(style);

  // dashboard init handles SSE now
});
