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

Professional setup: **Vercel (frontend)** + **Render (API)** + **MongoDB Atlas**.

| Part | Host | Folder |
|------|------|--------|
| Customer menu, admin, kitchen UI | [Vercel](https://vercel.com) | `client/` |
| Orders, menu API, auth | [Render](https://render.com) | `server/` |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) | — |

### 1 — Deploy API on Render

1. [render.com](https://render.com) → **New → Blueprint** → connect [Abrithub/Green-house-cafe-](https://github.com/Abrithub/Green-house-cafe-)
2. Set **`MONGO_URI`** (Atlas connection string)
3. After deploy, copy your API URL — e.g. `https://green-house-api.onrender.com`
4. In Render → **Environment**, set:
   - `CLIENT_URL` = your Vercel URL (set after step 2)
   - `ALLOW_VERCEL_PREVIEWS` = `true` (already in `render.yaml`)

Test: `https://your-api.onrender.com/api/health`

### 2 — Deploy frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import **Abrithub/Green-house-cafe-**
2. Set **Root Directory** = `client`
3. Framework: **Vite** (auto-detected)
4. Add **Environment Variable**:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://green-house-api.onrender.com` (your Render API URL, no trailing slash) |

5. Click **Deploy**

Your live app:
- Menu: `https://your-app.vercel.app/?table=7`
- Admin: `https://your-app.vercel.app/admin`
- Kitchen: `https://your-app.vercel.app/kitchen`

6. Go back to Render and set **`CLIENT_URL`** = `https://your-app.vercel.app`

### 3 — Production QR codes

```powershell
$env:PUBLIC_URL="https://your-app.vercel.app"
npm run qr:all
git add client/public/qr
git commit -m "Production QR codes"
git push
```

Redeploy on Vercel (automatic on push). Print stands: `/qr-stand?table=7`

### Local dev with production API (optional)

Create `client/.env.local`:

```env
VITE_API_URL=https://green-house-api.onrender.com
```

### All-in-one Render (alternative)

To host frontend + API on one Render URL, set `SERVE_CLIENT=true` and use the original full-stack `render.yaml` build. Vercel is recommended for faster global frontend delivery.

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
