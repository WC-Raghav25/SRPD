# SRPD Shop

A simple, fast retail web app for SRPD Shop — notebooks, stationery, daily utility items, and furniture.

## How to deploy (no coding needed)

### Step 1 — Upload to GitHub
1. Go to github.com → click **New repository**
2. Name it `srpd-shop`, keep it Public, click **Create repository**
3. Click **uploading an existing file**
4. Drag and drop ALL these files/folders exactly as they are
5. Click **Commit changes**

### Step 2 — Deploy on Vercel
1. Go to vercel.com → **Add New Project**
2. Connect your GitHub account → select `srpd-shop`
3. Click **Deploy** — no settings to change
4. In ~1 minute you'll get a live link like `https://srpd-shop.vercel.app`

## Admin Panel
- Tap the ⚙️ gear icon on the website
- Default passcode: **srpd2026**
- Change this in `src/components/SrpdShop.jsx` line 17

## Notes
- Products and orders are saved in the browser's local storage
- Each device/browser has its own data until Firebase is connected
- To connect a real database (Firebase), contact your developer
