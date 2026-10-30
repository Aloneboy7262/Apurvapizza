# 🍕 Apurva Pizza Hub - Complete Deployment & Operational Guide

Welcome to **Apurva Pizza Hub**, a state-of-the-art restaurant management system and digital storefront engineered specifically for wood-fired pizzerias and food brands in India.

This system connects your customers, kitchen staff, delivery riders, and manager into one seamless, real-time operating platform.

---

## 📱 System Portals Overview

Apurva Pizza Hub is divided into four easy-to-use portals:

1. **🍕 Customer Storefront (`Port 5173`)**:
   - Works on any mobile phone, tablet, or desktop browser.
   - 3D interactive wood-fired pizza visualizer and custom half-and-half pizza builder.
   - Flexible order types: **Doorstep Delivery**, **Dine-In (with table selection)**, and **Counter Takeaway**.
   - Dual payment support: **Cash on Delivery (COD)** and instant **Razorpay UPI, Google Pay, PhonePe & Cards**.
   - Live order tracking with melodic kitchen status alerts.

2. **🛠️ Admin Management Console (`Port 3001`)**:
   - Master dashboard for store owners and branch managers.
   - **Order Fulfillment Controls**: Toggle Delivery, Dine-In, or Takeaway on/off anytime with 1 tap.
   - **Table Management**: Set total tables (1–100) and custom numbering prefix (e.g., `Table `, `T-`).
   - **Customer Privacy Protection**: Customer phone numbers are masked (`98••••••10`) to prevent lead theft.
   - **Customer Reviews & Inquiries**: View star ratings, customer food photos, post official store replies, and answer support messages.
   - **100% Editable Menu**: Edit prices, offer prices, crusts, sizes, inventory stock, ingredients, and photos on the fly.
   - **Payment Controls**: Configure Cash on Delivery limits and enter Razorpay Live API keys with zero code changes.

3. **👨‍🍳 Indian English Kitchen Display System - KDS (`Port 3001/kitchen`)**:
   - Designed for touch tablets mounted above the prep counter.
   - Indian English voice synthesis announcements (*"New Kitchen Ticket! Order #... Bhatti shuru kijiye"*).
   - 3-Stage Workflow: **1. Naya Order (KOT)** ➔ **2. 🔥 Bhatti Chalu (Cooking)** ➔ **3. ✓ Tayar / Pack & Ready (Handover)**.
   - One-tap 80mm thermal KOT and receipt printing.

4. **🛵 Delivery Rider Portal (`Port 3001/driver`)**:
   - Mobile-optimized interface for delivery boys on motorbikes.
   - 1-tap **"Call Customer"** and **"WhatsApp I'm Outside"** buttons.
   - 1-tap **Google Maps Turn-by-Turn GPS Navigation** to customer doorsteps.
   - High-contrast **Cash Collection Banner** and 4-digit PIN verification.

---

## 🔑 Default Staff Credentials

Use these credentials to log in on your computer or phone:

| Role | Portal URL | Username | Phone | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `http://localhost:3001` | `admin` | `9876543210` | `Admin@Apurva2026!` |
| **Kitchen Chef (KDS)** | `http://localhost:3001` | `chef_kitchen` | `9876543211` | `Kitchen@Apurva2026!` |
| **Delivery Rider** | `http://localhost:3001/driver` | `rider_deoria` | `9876543212` | `Driver@Apurva2026!` |
| **Customer Test Account** | `http://localhost:5173` | *(phone login)* | `9876543213` | `Customer@Apurva2026!` |

*(Note: Customers can also register directly on the storefront using any 10-digit mobile number with instant OTP verification).*

---

## 🚀 Step-by-Step Non-Technical Deployment Guide

Follow these simple steps to deploy and run Apurva Pizza Hub on your computer, office server, or cloud VPS (Ubuntu/Debian).

### Prerequisites: What You Need
- A computer or cloud VPS with **Node.js 18+** or **Docker**.
- Internet connection for fetching restaurant photos and map tiles.

---

### Method A: Quick Local / Wi-Fi Launch (Simplest for Store Laptops)

Use this method to run the store locally and access it from all your phones and tablets on the store's Wi-Fi network.

#### Step 1: Open Terminal / Command Prompt
Open your terminal and navigate to the project directory:
```bash
cd "/home/afroj/Desktop/Apurva pizza hub"
```

#### Step 2: Install Dependencies (Only needed once)
```bash
npm run install:all
```
*(This automatically installs required packages for backend, customer storefront, and admin portal).*

#### Step 3: Start the Backend & Frontends
Run the all-in-one start command:
```bash
npm run dev
```
*(Or start each independently: `npm run dev:backend`, `npm run dev:frontend`, and `npm run dev:admin`).*

#### Step 4: Open on Your Phone
Find your computer's local Wi-Fi IP address (for example, `192.168.1.2`). Make sure your phone is connected to the same Wi-Fi router or hotspot, then open:
- **Customer Storefront**: `http://192.168.1.2:5173`
- **Admin Management Panel**: `http://192.168.1.2:3001`
- **Kitchen Display System**: `http://192.168.1.2:3001` *(Log in with chef account)*
- **Delivery Rider Portal**: `http://192.168.1.2:3001/driver`

---

### Method B: Cloud Production Deployment (Using Docker)

Use this method when deploying on a Cloud VPS (DigitalOcean, AWS, Linode, Hostinger VPS) for public internet access.

#### Step 1: Clone or Copy the Code to Your Server
```bash
git clone <your-repository-url> apurva-pizza-hub
cd apurva-pizza-hub
```

#### Step 2: Create Your Production Configuration File
Copy the example production file:
```bash
cp .env.production.example .env
```

#### Step 3: Generate a Secure Secret Key
Run this single command to create a secure 32-character key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Open `.env` in any text editor (like `nano .env`) and paste the generated string into `JWT_SECRET`:
```env
JWT_SECRET=paste_your_generated_string_here
```
Also change `ADMIN_PASSWORD`, `KITCHEN_PASSWORD`, and `DRIVER_PASSWORD` to your own private passwords.

#### Step 4: Launch All Services with Docker
Run this command to build and start MongoDB, Backend, Customer Frontend, and Admin KDS:
```bash
docker-compose up --build -d
```
All services will start in the background:
- Customer Storefront: Exposed on Port `80` (or `5173`)
- Admin & Kitchen KDS: Exposed on Port `3001`
- Backend API & MongoDB: Safely isolated internally

#### Step 5: Stop or Restart Anytime
- **To view live container logs**:
  ```bash
  docker-compose logs -f
  ```
- **To restart containers**:
  ```bash
  docker-compose restart
  ```
- **To stop all services**:
  ```bash
  docker-compose down
  ```

---

## 💳 Connecting Razorpay Online Payments (Zero Code Changes)

Once deployed, you can activate Razorpay UPI (Google Pay, PhonePe, Paytm, BHIM) and Cards in 2 minutes:

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Settings ➔ API Keys** and click **Generate Key**.
3. Copy your **Key ID** and **Key Secret**.
4. Open the **Admin Panel (`http://localhost:3001` or your domain)** and log in with your admin account.
5. In the left menu, click **Payment Controls**.
6. Under **Razorpay Gateway Master**:
   - Turn **Enable Razorpay Gateway** to **ON**.
   - Paste your **Razorpay Key ID**.
   - Paste your **Razorpay Key Secret**.
   - Click **Save Payment Settings**.
7. Done! Razorpay UPI will immediately appear at checkout for your customers.

---

## 🛠️ Daily Manager Operations Guide

### 1. How to Pause or Enable Dine-In, Delivery, or Takeaway
- Open **Admin Panel ➔ Delivery & Order Fulfillment**.
- Under **Order Fulfillment & Dine-In Table Management**, toggle **Allow Home Delivery**, **Allow Dine-In**, or **Allow Takeaway**.
- The customer checkout page updates automatically in real-time.

### 2. How to Change Table Numbering System
- In the same card, enter your total tables (e.g. `16`) and prefix (e.g. `Table ` or `T-`).
- The live table preview grid displays your tables immediately. Customers see the updated table pills on checkout.

### 3. How to Pause the Half & Half Split Pizza Builder
- If the kitchen is experiencing a dinner rush, toggle **Split Pizza (Half & Half) Builder** to **PAUSED**.
- You can write a custom notice (e.g. *"Half & Half Pizza Builder paused during peak rush hours"*).

### 4. How to Manage Customer Reviews & Post Replies
- In the Admin Panel, click **Reviews & Ratings** in the sidebar.
- Filter by star ratings (1★ to 5★) or search by customer name.
- Click **Reply to Customer** on any review, write your official response, and tap **Publish Official Reply**. Customers will see your response under the product.

### 5. How to Answer Customer Inquiries
- In the Admin Panel, click **Customer Inquiries** in the sidebar.
- View inquiries submitted through the Contact Us page.
- Enter resolution notes and mark the inquiry as **Resolved**.

### 6. How to Edit Menu Items, Prices & Photos
- In the Admin Panel, click **Menu & Combos Catalog**.
- Click the pencil icon on any item:
  - Change prices, offer discounts, sizes, and crusts.
  - Upload photos from your computer or paste image links.
  - Mark items **In Stock** or **Out of Stock**.
  - Edit prep time, dietary flags (100% Pure Veg / Non-Veg), and ingredients.

---

## 🔒 Security Hardening Highlights

Apurva Pizza Hub includes 14 enterprise security safeguards out of the box:
- **Zero Payment Spoofing**: Orders cannot be forced to "Paid" without valid Razorpay cryptographic signature verification or admin confirmation.
- **Customer PII Defense**: Phone numbers are masked (`98••••••10`) in all admin views to prevent customer contact harvesting.
- **Role-Based Authorization**: Kitchen staff accounts are strictly prohibited from viewing sales analytics or modifying payment settings.
- **Strict 5 KM Geofence**: Server verifies doorstep delivery coordinates against the store latitude/longitude.
- **Rate-Limiting & Anti-Brute Force**: OTP requests and login endpoints are strictly protected against automated attacks.
- **NoSQL Injection Sanitization**: All inbound JSON payloads are sanitized against MongoDB query injection operators.

---

## ❓ Frequently Asked Questions (FAQ)

### Q1: Can I use this without Docker?
Yes! Simply run `npm run dev` in the project root. Node.js will automatically use the built-in development database and start all three portals.

### Q2: How do customers get OTPs without an SMS gateway?
In demo/development mode, OTPs are printed securely directly to the server terminal console. To send real SMS messages to customer mobile phones, enter your **Fast2SMS API Key** or **Twilio credentials** in `.env`.

### Q3: How do I backup my database?
If using Docker, all database files are stored in the Docker volume `mongo-data`. You can back it up using:
```bash
docker exec -t apurva-mongodb mongodump --out /data/db/backup
```

---

*Made with passion for Wood-Fired Pizza excellence by Apurva Pizza Hub.*
