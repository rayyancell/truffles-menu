const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Authentication Configuration
const ADMIN_PASSWORD = 'admin123';
const ADMIN_TOKEN = 'truffles-secret-token-' + ADMIN_PASSWORD;

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (token === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
// Host-based routing middleware
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const isAdminHost = host.startsWith('admin.') || host.includes('admin-truffles');
  
  // If it's the root path, serve the appropriate file based on host
  if (req.path === '/') {
    if (isAdminHost) {
      return res.sendFile(path.join(__dirname, '../frontend', 'admin.html'));
    } else {
      return res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    }
  }
  next();
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data files paths
// Vercel uses a read-only filesystem, so we must write to /tmp when deployed
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const DISHES_FILE = path.join(DATA_DIR, 'dishes.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CATS_FILE = path.join(DATA_DIR, 'categories.json');
const CHEF_FILE = path.join(DATA_DIR, 'chef_special.json');

// Real-time clients (SSE)
let clients = [];
function sendEventToAll(event, data) {
  const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
  clients.forEach(c => {
    try {
      if (c.res && !c.res.writableEnded) {
        c.res.write(payload);
      }
    } catch (err) {
      console.error("SSE Broadcast error for client", c.id, err);
    }
  });
}

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DISHES_FILE)) {
  const initialDishes = [
    {
      id: 1,
      name: 'Truffle Arancini',
      category: 'starters',
      type: 'non-veg',
      calories: 420,
      price: 18.00,
      image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Risotto', 'Black Truffle', 'Parmesan', 'Garlic Aioli']
    },
    {
      id: 2,
      name: 'Wild Mushroom Soup',
      category: 'starters',
      type: 'veg',
      calories: 210,
      price: 14.00,
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Porcini Mushrooms', 'Cream', 'Truffle Oil', 'Parsley']
    },
    {
      id: 3,
      name: 'Bbq Chicken Pizza Delight',
      category: 'pizza',
      type: 'non-veg',
      calories: 550,
      price: 27.00,
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Chicken', 'Mozzarella', 'BBQ Sauce', 'Onion', 'Dough']
    },
    {
      id: 4,
      name: 'Hawaiian Supreme',
      category: 'pizza',
      type: 'non-veg',
      calories: 570,
      price: 28.00,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Pineapple', 'Ham', 'Mozzarella', 'Tomato Sauce', 'Dough']
    },
    {
      id: 5,
      name: 'Italian Supreme Pizza',
      category: 'pizza',
      type: 'non-veg',
      calories: 610,
      price: 30.00,
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Italian Sausage', 'Pepperoni', 'Olives', 'Peppers', 'Mozzarella']
    },
    {
      id: 6,
      name: 'White Truffle Pizza',
      category: 'pizza',
      type: 'veg',
      calories: 480,
      price: 42.00,
      image: 'https://images.unsplash.com/photo-1595854341625-f2e0f1200b30?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Alba Truffles', 'Burrata', 'Ricotta', 'Garlic Oil', 'Dough']
    },
    {
      id: 7,
      name: 'Tagliolini al Tartufo',
      category: 'mains',
      type: 'veg',
      calories: 520,
      price: 36.00,
      image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Tagliolini', 'Parmigiano Reggiano', 'Butter', 'Black Truffle']
    },
    {
      id: 8,
      name: 'Wagyu Truffle Burger',
      category: 'mains',
      type: 'non-veg',
      calories: 780,
      price: 45.00,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Wagyu Beef', 'Truffle Mayo', 'Brioche Bun', 'Aged Cheddar']
    },
    {
      id: 9,
      name: 'Honey Truffle Panna Cotta',
      category: 'desserts',
      type: 'veg',
      calories: 320,
      price: 16.00,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Heavy Cream', 'Vanilla Bean', 'Honey', 'Truffle Essence']
    },
    {
      id: 10,
      name: 'Dark Chocolate Fondant',
      category: 'desserts',
      type: 'veg',
      calories: 450,
      price: 18.00,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Dark Chocolate', 'Butter', 'Eggs', 'Sugar']
    },
    {
      id: 11,
      name: 'Gold Leaf Espresso Martini',
      category: 'drinks',
      type: 'veg',
      calories: 180,
      price: 22.00,
      image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Vodka', 'Espresso', 'Coffee Liqueur', 'Gold Leaf']
    },
    {
      id: 12,
      name: 'Truffle Infused Old Fashioned',
      category: 'drinks',
      type: 'veg',
      calories: 160,
      price: 24.00,
      image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=600&auto=format&fit=crop',
      ingredients: ['Bourbon', 'Truffle Bitters', 'Orange Peel', 'Sugar']
    },
  ];
  fs.writeFileSync(DISHES_FILE, JSON.stringify(initialDishes, null, 2));
}
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(CATS_FILE)) {
  const initialCats = [
    { id: 'all', name: 'ALL', icon: 'restaurant_menu' },
    { id: 'starters', name: 'STARTERS', icon: 'restaurant' },
    { id: 'mains', name: 'MAINS', icon: 'lunch_dining' },
    { id: 'pizza', name: 'PIZZA', icon: 'local_pizza' },
    { id: 'desserts', name: 'DESSERTS', icon: 'icecream' },
    { id: 'drinks', name: 'DRINKS', icon: 'local_bar' }
  ];
  fs.writeFileSync(CATS_FILE, JSON.stringify(initialCats, null, 2));
}
if (!fs.existsSync(CHEF_FILE)) {
  fs.writeFileSync(CHEF_FILE, JSON.stringify({
    isEnabled: true,
    items: [
      {
        id: "1",
        name: "White Truffle Pizza",
        description: "Wood-fired with Alba truffles & burrata",
        price: 42.00,
        image: "https://images.unsplash.com/photo-1595854341625-f2e0f1200b30?q=80&w=900&auto=format&fit=crop"
      }
    ]
  }, null, 2));
}

// Helper Functions
const readData = (file) => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Migration for old data
  if (file.includes('orders.json')) {
    return data.map(order => ({
      ...order,
      status: order.status || 'Pending',
      items: order.items.map(i => ({
        ...i,
        quantity: i.quantity || 1
      }))
    }));
  }
  return data;
};
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ── Auth API ──
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_TOKEN });
  } else {
    res.status(401).send('Invalid Password');
  }
});

// ── Dishes API ──
app.get('/api/dishes', (req, res) => {
  res.json(readData(DISHES_FILE));
});

app.post('/api/dishes', authenticate, (req, res) => {
  const dishes = readData(DISHES_FILE);
  const newDish = { id: Date.now(), ...req.body };
  dishes.push(newDish);
  writeData(DISHES_FILE, dishes);
  res.status(201).json(newDish);
});

app.put('/api/dishes/:id', authenticate, (req, res) => {
  const dishes = readData(DISHES_FILE);
  const index = dishes.findIndex(d => d.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).send('Dish not found');
  dishes[index] = { ...dishes[index], ...req.body };
  writeData(DISHES_FILE, dishes);
  res.json(dishes[index]);
});

app.delete('/api/dishes/:id', authenticate, (req, res) => {
  const dishes = readData(DISHES_FILE);
  const filtered = dishes.filter(d => d.id !== parseInt(req.params.id));
  writeData(DISHES_FILE, filtered);
  res.status(204).send();
});

// ── Orders API ──
app.get('/api/orders', authenticate, (req, res) => {
  res.json(readData(ORDERS_FILE));
});

app.post('/api/orders', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const newOrder = {
    id: Date.now(),
    date: new Date().toISOString(),
    status: 'Pending',
    ...req.body
  };
  orders.push(newOrder);
  writeData(ORDERS_FILE, orders);
  
  // Real-time broadcast
  sendEventToAll('order_placed', newOrder);
  
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id/status', authenticate, (req, res) => {
  const idValue = req.params.id;
  const newStatus = req.body.status;
  
  const orders = readData(ORDERS_FILE);
  const index = orders.findIndex(o => String(o.id) === String(idValue));
  
  if (index === -1) return res.status(404).send('Order not found');
  
  orders[index].status = newStatus;
  writeData(ORDERS_FILE, orders);
  
  // Real-time broadcast
  sendEventToAll('order_status_updated', orders[index]);
  
  res.json(orders[index]);
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  
  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

app.get('/api/orders/:id', (req, res) => {
  const idValue = req.params.id;
  const orders = readData(ORDERS_FILE);
  
  // Search by full ID or last 4 digits (short ID)
  const order = orders.find(o => 
    String(o.id) === String(idValue) || 
    String(o.id).endsWith(String(idValue))
  );

  if (!order) return res.status(404).send('Not found');
  res.json(order);
});

app.delete('/api/orders/:id', authenticate, (req, res) => {
  const idValue = req.params.id;
  const orders = readData(ORDERS_FILE);
  const index = orders.findIndex(o => String(o.id) === String(idValue));
  
  if (index === -1) return res.status(404).send('Order not found');
  
  // Validation: Only completed orders can be deleted
  if (orders[index].status !== 'Completed') {
    return res.status(400).send('Only completed orders can be deleted');
  }
  
  const removedOrder = orders.splice(index, 1)[0];
  writeData(ORDERS_FILE, orders);
  
  // Real-time broadcast
  sendEventToAll('order_removed', { id: idValue });
  
  console.log(`[Admin] Order ${idValue} removed.`);
  res.status(200).json(removedOrder);
});

// ── Categories API ──
app.get('/api/categories', (req, res) => {
  res.json(readData(CATS_FILE));
});

app.post('/api/categories', authenticate, (req, res) => {
  const cats = readData(CATS_FILE);
  const newCat = { ...req.body };
  if (!newCat.id) newCat.id = newCat.name.toLowerCase().replace(/\s/g, '_');
  cats.push(newCat);
  writeData(CATS_FILE, cats);
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', authenticate, (req, res) => {
  const cats = readData(CATS_FILE);
  const index = cats.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).send('Category not found');
  cats[index] = { ...cats[index], ...req.body };
  writeData(CATS_FILE, cats);
  res.json(cats[index]);
});

app.delete('/api/categories/:id', authenticate, (req, res) => {
  const cats = readData(CATS_FILE);
  const filtered = cats.filter(c => c.id !== req.params.id);
  writeData(CATS_FILE, filtered);
  res.status(204).send();
});

// ── Chef Special API ──
app.get('/api/chef-special', (req, res) => {
  res.json(readData(CHEF_FILE));
});

app.put('/api/chef-special/status', authenticate, (req, res) => {
  const data = readData(CHEF_FILE);
  data.isEnabled = req.body.isEnabled;
  writeData(CHEF_FILE, data);
  sendEventToAll('chef_special_updated', data);
  res.json(data);
});

app.post('/api/chef-special/items', authenticate, (req, res) => {
  const data = readData(CHEF_FILE);
  if (!data.items) data.items = [];
  const newItem = { id: Date.now().toString(), ...req.body };
  data.items.push(newItem);
  writeData(CHEF_FILE, data);
  sendEventToAll('chef_special_updated', data);
  res.status(201).json(newItem);
});

app.put('/api/chef-special/items/:id', authenticate, (req, res) => {
  const data = readData(CHEF_FILE);
  if (!data.items) data.items = [];
  const index = data.items.findIndex(i => String(i.id) === String(req.params.id));
  if (index === -1) return res.status(404).send('Item not found');
  data.items[index] = { ...data.items[index], ...req.body };
  writeData(CHEF_FILE, data);
  sendEventToAll('chef_special_updated', data);
  res.json(data.items[index]);
});

app.delete('/api/chef-special/items/:id', authenticate, (req, res) => {
  const data = readData(CHEF_FILE);
  if (!data.items) data.items = [];
  data.items = data.items.filter(i => String(i.id) !== String(req.params.id));
  writeData(CHEF_FILE, data);
  sendEventToAll('chef_special_updated', data);
  res.status(204).send();
});

// ── Upload API ──
app.post('/api/upload', authenticate, (req, res) => {
  const { image, name } = req.body;
  if (!image) return res.status(400).send('No image provided');
  
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const extension = image.split(';')[0].split('/')[1] || 'png';
  const fileName = `${Date.now()}_${name.replace(/\s+/g, '_')}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) return res.status(500).send('Upload failed');
    res.json({ url: `/uploads/${fileName}` });
  });
});

// Serve Admin Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Export the Express API for Vercel
module.exports = app;
