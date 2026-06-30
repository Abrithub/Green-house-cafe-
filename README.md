# Green House Cafe & Restaurant

A mobile-first MERN QR menu web app for **Green House** cafe and restaurant.

## What's included

- React + Vite frontend (menu, cart, search, profile, QR stand)
- Express + MongoDB backend
- Menu, orders, and tables stored in MongoDB
- Auto-seed on first run from `server/src/data.js`
- Birr pricing, green branding, table-aware QR links

## Project structure

- `client` — React frontend
- `server` — Express API + MongoDB models

---

## Step 1 — MongoDB setup (required for real use)

### Option A: Local MongoDB

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start MongoDB on your PC
3. Copy env file:

```bash
cd server
copy .env.example .env
```

`.env` should contain:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/green-house
```

### Option B: MongoDB Atlas (free cloud)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get your connection string
3. Put it in `server/.env`:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/green-house
```

---

## Run locally

### Terminal 1 — Backend

```bash
cd server
npm install
npm run dev
```

On first run with MongoDB connected, the database auto-seeds with menu items, tables 1–20, promos, and combos.

### Terminal 2 — Frontend

```bash
cd client
npm install
npm run dev
```

Open: [http://localhost:5173/?table=7](http://localhost:5173/?table=7)

---

## QR code (local)

Generate QR for table 7:

```bash
npm run qr
```

Print stand page: [http://localhost:5173/qr-stand?table=7](http://localhost:5173/qr-stand?table=7)

For **production QR codes**, see [Deploy online (Step 4)](#deploy-online-step-4).

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server + DB status |
| GET | `/api/bootstrap?table=7` | Full menu for a table |
| GET | `/api/tables` | All tables |
| GET | `/api/orders` | List saved orders |
| GET | `/api/orders/:orderId` | Single order |
| POST | `/api/orders` | Place order (saved to MongoDB) |
| POST | `/api/admin/login` | Admin sign-in |
| GET | `/api/admin/menu` | List all menu items (admin) |
| POST | `/api/admin/menu` | Create menu item |
| PATCH | `/api/admin/menu/:slug` | Update menu item / price |
| DELETE | `/api/admin/menu/:slug` | Hide item from menu |
| GET | `/api/admin/categories` | List categories (admin) |
| POST | `/api/kitchen/login` | Kitchen sign-in |
| GET | `/api/kitchen/orders` | Active kitchen orders |
| PATCH | `/api/kitchen/orders/:orderId/status` | Advance order status |

---

## Admin dashboard

Open: [http://localhost:5173/admin](http://localhost:5173/admin)

Default password: `greenhouse` (set `ADMIN_PASSWORD` in `server/.env`)

From the admin screen you can:

- Search and filter menu items
- Change prices inline (blur the field to save)
- Add new items with customizations
- Hide items from the customer menu
- Edit descriptions, images, tags, and visibility

Changes write directly to MongoDB — no code edits or re-seed required.

---

## Kitchen display

Open: [http://localhost:5173/kitchen](http://localhost:5173/kitchen)

Uses the same staff password as admin (`ADMIN_PASSWORD` in `server/.env`).

The kitchen screen shows:

- **Kanban board** — New → Preparing → Cooking → Ready
- **Auto-refresh** every 5 seconds
- **Sound alert** when a new order arrives (toggle on/off)
- **One-tap status** — advance orders or cancel

Place a test order from the customer menu (`/?table=7`), then watch it appear on the kitchen board.

---

## Deploy online (Step 4)

The app runs as **one service**: Express serves the React build and the API on the same domain. That keeps QR codes simple — one URL like `https://menu.yourdomain.com/?table=7`.

### What you need

1. **MongoDB Atlas** — free cluster ([mongodb.com/atlas](https://www.mongodb.com/atlas))
2. **A host** — [Render](https://render.com) free tier works (see `render.yaml`)
3. **Your domain** (optional) — e.g. `menu.greenhouse.et`

### Deploy on Render (recommended)

1. Push this project to GitHub
2. In Render: **New → Blueprint** → connect the repo (`render.yaml` is included)
3. Set **MONGO_URI** to your Atlas connection string when prompted
4. Deploy — Render sets `RENDER_EXTERNAL_URL` automatically (e.g. `https://green-house-cafe.onrender.com`)
5. Open the live URL and test: `/api/health`, `/?table=7`, `/admin`, `/kitchen`

**Production env vars** (Render dashboard → Environment):

| Variable | Example |
|----------|---------|
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/green-house` |
| `ADMIN_PASSWORD` | strong staff password |
| `ADMIN_SECRET` | long random string |
| `PUBLIC_URL` | `https://menu.yourdomain.com` (custom domain only) |
| `CLIENT_URL` | same as `PUBLIC_URL` if you use a custom domain |

`NODE_ENV=production` is set automatically by `render.yaml`.

### Custom domain

1. In Render → your service → **Settings → Custom Domains**
2. Add `menu.yourdomain.com` and follow DNS instructions
3. Set `PUBLIC_URL` and `CLIENT_URL` to `https://menu.yourdomain.com`
4. Regenerate QR codes (below)

### Run production build locally

```bash
npm run build --prefix client
set NODE_ENV=production
npm run start --prefix server
```

Open: [http://localhost:5000/?table=7](http://localhost:5000/?table=7)

### Production QR codes

After your site is live, generate QR codes for all tables:

**Windows (PowerShell):**

```powershell
$env:PUBLIC_URL="https://menu.yourdomain.com"
npm run qr:all
```

**One table only:**

```powershell
$env:PUBLIC_URL="https://menu.yourdomain.com"
node scripts/generate-qr-menu.cjs --table=7
```

This creates:

- `client/public/qr/table-1.png` … `table-20.png`
- `client/public/qr-menu.png` (default, table 7)

Rebuild and redeploy so the new images are served, **or** copy the `qr/` folder into your static host.

### Print table stands

| Table | Print this URL |
|-------|----------------|
| 7 | `https://menu.yourdomain.com/qr-stand?table=7` |
| 12 | `https://menu.yourdomain.com/qr-stand?table=12` |

Each stand page shows the correct QR for that table.

---

```bash
cd server
npm run seed          # seed only if empty
npm run seed:force    # wipe and re-seed
```

---

## Roadmap (one by one)

- [x] **Step 1** — MongoDB models (menu, orders, tables)
- [x] **Step 2** — Admin dashboard (edit menu/prices)
- [x] **Step 3** — Kitchen order screen
- [x] **Step 4** — Deploy online + production QR
- [ ] **Step 5** — Amharic translations

---

## Edit menu prices manually

Use the admin dashboard at `/admin` instead.

For a full reset from code, edit `server/src/data.js` then re-seed:

```bash
cd server
npm run seed:force
```
