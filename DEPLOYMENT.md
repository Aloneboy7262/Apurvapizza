# 🍕 Apurva Pizza Hub - Complete Production Deployment Guide
### *Zero-Jargon, Step-by-Step Guide for Non-Technical Founders & Store Owners*

This guide walks you through every single step to buy your domain, purchase your cloud server (VPS), configure everything with simple copy-paste commands, and get your pizza business live on the internet with:
* **Customer Storefront:** `https://yourdomain.com` (and `https://www.yourdomain.com`)
* **Staff / Kitchen / Rider Portal:** `https://admin.yourdomain.com`

---

## 1. Cost Breakdown in Indian Rupees (₹ INR)

You do **not** need expensive cloud setups (like AWS/Google Cloud billing thousands of rupees). A reliable Virtual Private Server (VPS) handles your entire database, customer orders, 3D pizza customizer, and real-time kitchen screens.

| Item | What It Does | Recommended Provider | Cost in INR (₹) | Billing Cycle |
| :--- | :--- | :--- | :--- | :--- |
| **Domain Name** | Your brand website address (e.g., `apurvapizzahub.com` or `.in`) | Hostinger.in or Namecheap | **₹799 – ₹999** for `.com`<br>*(or ₹399 – ₹599 for `.in`)* | Paid Yearly |
| **Cloud VPS Server** | A 24/7 dedicated virtual computer in a Mumbai/Singapore data center | Hostinger VPS (Plan: **KVM 2**) | **₹499 – ₹699 / month**<br>*(~₹5,900 / year)* | Paid Monthly or Yearly |
| **Docker Engine** | Free engine that runs your MongoDB, Backend, and Web portals | Open Source | **₹0 (FREE)** | Included |
| **SSL Certificate** | Green/lock icon (`https://`) ensuring encrypted, safe payments | Let's Encrypt (Certbot) | **₹0 (FREE)** | Auto-renews free |
| **MongoDB Database** | Stores customer orders, users, reviews, menu items | Self-hosted in Docker container | **₹0 (FREE)** | No cloud DB fees |
| **Nginx Web Server** | Routes traffic to storefront or admin panel | Open Source | **₹0 (FREE)** | Included |

### 💰 Total Investment:
* **First Month:** ~₹1,300 to ₹1,700 total (Domain for full year + 1st month VPS).
* **Ongoing Monthly Cost:** Only **~₹499 to ₹699 / month** for hosting everything!

> [!CAUTION]
> **What NOT to buy:**
> Never purchase **"Shared Web Hosting"**, **"WordPress Hosting"**, or **"cPanel Hosting"** (e.g., cheap ₹99/mo plans). Shared hosting cannot run Node.js real-time Socket.io servers or MongoDB containers. You **must select a VPS (Virtual Private Server)**.

---

## 2. Where & What to Buy (Exact Purchase Walkthrough)

### Step 2.1: Buying Your Domain Name

1. Open **[Hostinger India](https://www.hostinger.in)** or **[Namecheap](https://www.namecheap.com)**.
2. In the domain search bar, type your preferred business name (e.g., `apurvapizzahub.com` or `apurvapizza.in`).
3. Click **Add to Cart**.
4. During checkout:
   * **Uncheck** any paid add-ons (like "Business Email" or "Website Builder" if prompted). Hostinger already provides free WHOIS privacy protection.
5. Pay using your preferred method (**UPI, Google Pay, PhonePe, Paytm, NetBanking, or Debit/Credit Card**).
6. Keep the domain dashboard open.

---

### Step 2.2: Buying Your Cloud VPS (Virtual Private Server)

We strongly recommend **Hostinger VPS** because they have data centers in India/Singapore, accept Indian UPI payments, have 24/7 chat support, and offer a simple dashboard.

1. Go to **[Hostinger.in VPS Hosting](https://www.hostinger.in/vps-hosting)**.
2. Look for the plan named **KVM 2**:
   * **Specs:** 2 vCPU cores, 8 GB RAM, 100 GB NVMe Disk Space, 8 TB Bandwidth.
   * *(8 GB RAM easily handles your 3D pizza builder, customer traffic, live kitchen order display, and MongoDB without slowing down).*
   * *(Budget alternative: If you want to start smaller, **KVM 1** with 4 GB RAM at ~₹399/mo is also sufficient).*
3. Select your billing period (12 months gives the best discount, but you can also choose monthly).
4. Checkout with UPI / NetBanking / Card.

#### ⚙️ Initial Server Setup Wizard (Very Important):
Right after payment, Hostinger will ask you to configure your new VPS:
1. **Server Location:** Choose **India (Mumbai)** or **Singapore** for lowest latency and fastest loading speeds for Indian customers.
2. **Operating System Type:** Select **Plain OS** (Do NOT choose cPanel or WordPress).
3. **Select OS:** Choose **Ubuntu 24.04 64bit** (or **Ubuntu 22.04 64bit**).
4. **Root Password:** Enter a strong password (for example: `ApurvaServer@2026!#`).  
   👉 **Write this password down immediately in a safe notebook!** You will need it to log in.
5. Click **Finish Setup**. Within 2 minutes, your VPS will be ready.

#### 📋 Note Your Server Public IP:
On your Hostinger VPS dashboard, you will see a box labeled **IP Address**.
It looks like four numbers separated by dots (for example: `157.245.102.85`).  
**Copy this IP address** — you will use it in the next steps.

---

## 3. Connecting Your Domain to Your Server (DNS Settings)

This tells the entire internet that whenever anyone visits your domain, they should be routed to your cloud server.

1. In your Hostinger or Namecheap dashboard, click **Domains** → click **Manage** next to your domain.
2. Click on the **DNS / Nameservers** tab.
3. You will see a list of DNS records. Add or edit these **3 `A Records`** (replace `157.245.102.85` with your actual Server IP):

| Type | Name / Host | Points to / Value (Your Server IP) | TTL | Purpose |
| :---: | :---: | :---: | :---: | :--- |
| **A** | `@` | `157.245.102.85` | 300 (or 1/2 hour) | Directs `yourdomain.com` to your server |
| **A** | `www` | `157.245.102.85` | 300 (or 1/2 hour) | Directs `www.yourdomain.com` to your server |
| **A** | `admin` | `157.245.102.85` | 300 (or 1/2 hour) | Directs `admin.yourdomain.com` to your server |

*(Wait about 10–15 minutes for the global DNS network to recognize the new records. You can check status on [dnschecker.org](https://dnschecker.org) by typing your domain).*

---

## 4. Visual Architecture Overview

Here is how everything flows once configured:

```
                          ┌────────────────────────┐
                          │   Public Customers &   │
                          │   Restaurant Staff     │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │ DNS Routing (Internet) │
                          └───────────┬────────────┘
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │    Your VPS: Nginx + Free SSL  │
                      │   (Validates HTTPS Padlock 🔒) │
                      └───────┬────────────────┬───────┘
                              │                │
            If visiting:      │                │ If visiting:
            yourdomain.com    │                │ admin.yourdomain.com
                              ▼                ▼
         ┌──────────────────────────┐    ┌──────────────────────────┐
         │ Customer Frontend        │    │ Admin & Staff Panel      │
         │ (Port 5173 Container)    │    │ (Port 3001 Container)    │
         └────────────┬─────────────┘    └────────────┬─────────────┘
                      │                               │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ Node.js Backend API      │
                         │ (Port 5000 Container)    │
                         │ Real-time Socket.io KDS  │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ MongoDB Database         │
                         │ (Persistent Volume)      │
                         └──────────────────────────┘
```

---

## 5. Step-by-Step Server Setup (Copy & Paste)

### Step 5.1: Connect to Your VPS Terminal

You do not need any special software to access your server:

* **On Windows:** Press the `Windows Key + R`, type `cmd`, and press `Enter`.
* **On Mac or Linux:** Open the **Terminal** app.

Type this command (replace `157.245.102.85` with your real server IP) and press `Enter`:
```bash
ssh root@157.245.102.85
```

1. If it asks: `Are you sure you want to continue connecting (yes/no/[fingerprint])?`, type `yes` and press `Enter`.
2. It will ask for your **password**. Type your Root Password.
   > [!NOTE]
   > When typing passwords in a Linux terminal, **no letters or dots will appear on the screen** for security. This is normal. Just type your password carefully and hit `Enter`.

You are now logged into your cloud server!

---

### Step 5.2: Install Docker, Nginx, and Security Firewall

Copy this entire block of commands, paste it into your server terminal, and press `Enter`:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw nginx certbot python3-certbot-nginx

# Install official Docker engine & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Configure UFW security firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

*(This takes ~2–3 minutes to finish. Once done, Docker, Nginx, and security firewall are permanently active).*

---

### Step 5.3: Upload Your Project Code to the Server

#### Method A: If your project is on GitHub (Easiest & Recommended)
Run on your server:
```bash
cd /var/www
git clone https://github.com/<your-username>/<your-repo-name>.git apurva-pizza-hub
cd /var/www/apurva-pizza-hub
```

#### Method B: Direct Upload from Your Computer (Without GitHub)
On your **own computer** (not inside the SSH terminal), open a new Command Prompt / Terminal and run:
```bash
scp -r "/home/afroj/Desktop/Apurva pizza hub" root@YOUR_SERVER_IP:/var/www/apurva-pizza-hub
```
Once the files finish copying, go back to your server terminal and switch to that directory:
```bash
cd /var/www/apurva-pizza-hub
```

---

### Step 5.4: Set Up Your Production Settings (`.env`)

1. Copy the production template:
```bash
cp .env.production.example .env
```

2. Generate a secure secret key by running:
```bash
openssl rand -hex 32
```
*Copy the 64-character text printed on your screen.*

3. Open the `.env` file in the nano editor:
```bash
nano .env
```

4. Use the arrow keys on your keyboard to navigate and update the following values with your real domain (e.g. `apurvapizzahub.com`) and secure passwords:

```env
# Server Runtime
NODE_ENV=production
PORT=5000

# Database (Internal Docker network hostname: mongodb)
MONGODB_URI=mongodb://mongodb:27017/apurva_pizza_hub

# Paste the 64-character secret you generated with openssl rand -hex 32
JWT_SECRET=replace_with_your_64_character_generated_secret_key
JWT_EXPIRES_IN=7d

# Allowed Domains (Replace apurvapizzahub.com with your actual domain name)
ALLOWED_ORIGINS=https://apurvapizzahub.com,https://www.apurvapizzahub.com,https://admin.apurvapizzahub.com
FRONTEND_URL=https://apurvapizzahub.com
ADMIN_URL=https://admin.apurvapizzahub.com
CLIENT_URL=https://apurvapizzahub.com

# Ports for internal Docker containers
PORT_FRONTEND=5173
PORT_ADMIN=3001

# Production Staff Credentials (Set secure passwords you will remember)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=MySecureAdminPass2026!
ADMIN_PHONE=9876543210
ADMIN_NAME=System Administrator

KITCHEN_USERNAME=chef_kitchen
KITCHEN_PASSWORD=MySecureKitchenPass2026!
KITCHEN_PHONE=9876543211
KITCHEN_NAME=Kitchen Display Chef

DRIVER_USERNAME=rider_deoria
DRIVER_PASSWORD=MySecureDriverPass2026!
DRIVER_PHONE=9876543212
DRIVER_NAME=Fleet Rider

# Customer Test Account
CUSTOMER_TEST_USERNAME=customer_test
CUSTOMER_TEST_PASSWORD=Customer@Apurva2026!
CUSTOMER_TEST_PHONE=9876543213

# Live SMS Gateway (Fast2SMS Indian OTP Gateway)
FAST2SMS_API_KEY=your_fast2sms_api_key_here

# Frontends Configuration
VITE_API_URL=/api
VITE_SOCKET_URL=
VITE_CUSTOMER_URL=https://apurvapizzahub.com
```

5. **To save and exit in nano:**
   * Press `Ctrl + O`, then press `Enter` (Saves file).
   * Press `Ctrl + X` (Exits nano editor).

---

### Step 5.5: Start All Project Containers with Docker

Run this single command:
```bash
docker compose up --build -d
```

Docker will automatically:
1. Launch MongoDB 7.0 database with permanent storage on your server disk.
2. Build and launch the Node.js API with Socket.io real-time order notifications.
3. Build the customer storefront and expose it internally on port `5173`.
4. Build the admin and kitchen display panel and expose it internally on port `3001`.

Verify that all containers are running by typing:
```bash
docker compose ps
```
You should see 4 services with status **Up** (`apurva-mongodb`, `apurva-backend`, `apurva-customer-frontend`, `apurva-admin-kds-frontend`).

---

### Step 5.6: Configure Nginx Reverse Proxy for Domains

Now we tell Nginx to send visitors on `yourdomain.com` to the Customer container, and visitors on `admin.yourdomain.com` to the Admin container.

1. Open a new configuration file:
```bash
sudo nano /etc/nginx/sites-available/pizza-hub.conf
```

2. Paste this exact configuration block (replace `apurvapizzahub.com` with your real domain):

```nginx
# 1. Customer Storefront (Root domain and www)
server {
    server_name apurvapizzahub.com www.apurvapizzahub.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Staff Management & Kitchen Panel (Subdomain)
server {
    server_name admin.apurvapizzahub.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Save and exit (`Ctrl + O`, `Enter`, then `Ctrl + X`).

4. Enable the configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/pizza-hub.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
*(If `sudo nginx -t` outputs `syntax is ok` and `test is successful`, your routing is perfect).*

---

### Step 5.7: Activate Free SSL (HTTPS Padlock 🔒)

Run Certbot to generate and install free, auto-renewing SSL certificates (replace `apurvapizzahub.com` with your domain):

```bash
sudo certbot --nginx -d apurvapizzahub.com -d www.apurvapizzahub.com -d admin.apurvapizzahub.com
```

* When asked for an email address, type your personal email (used only if certificate renewal has issues).
* When asked to agree to the terms of service, type `Y` and press `Enter`.
* When asked if you want to share your email with EFF, type `N` and press `Enter`.

Certbot will verify your domains and output:
```
Successfully received certificate.
Deploying certificate
Successfully deployed certificate for apurvapizzahub.com to /etc/nginx/sites-enabled/pizza-hub.conf
...
Congratulations! You have successfully enabled HTTPS.
```

🎉 **Your website is now completely deployed and live on the internet!**

---

## 6. Accessing Your Live Website & Accounts

### 🛍 Customer Experience:
* **Website:** `https://apurvapizzahub.com`
* Customers can browse the wood-fired pizza menu, customize toppings in 3D, add items to cart, order via Cash on Delivery or Online Payment, and track orders live.

### 🛡 Staff Management Experience:
* **Staff Login Portal:** `https://admin.apurvapizzahub.com/login`

Staff members log in on the exact same portal, and the system automatically redirects them based on their role:

| Staff Member | Login Username | Password | Auto-Redirect Destination |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | *(Set in .env)* | `https://admin.apurvapizzahub.com/dashboard`<br>*(Sales charts, menu editor, staff management, policies)* |
| **Kitchen Chef** | `chef_kitchen` | *(Set in .env)* | `https://admin.apurvapizzahub.com/kitchen`<br>*(Real-time Kitchen Display System with chime alerts)* |
| **Delivery Rider** | `rider_deoria` | *(Set in .env)* | `https://admin.apurvapizzahub.com/rider`<br>*(Assigned deliveries, customer GPS route, COD verification)* |

---

## 7. Simple Maintenance Cheat Sheet (Commands to Keep)

Whenever you log into your server in the future, here are the only commands you will ever need:

| Action | Command to Run on Server |
| :--- | :--- |
| **View live logs of all containers** | `docker compose logs -f` |
| **View only backend / database logs** | `docker compose logs -f backend` |
| **Restart the website if needed** | `docker compose restart` |
| **Update website with new code** | `git pull && docker compose up --build -d` |
| **Check server CPU & RAM usage** | `docker stats` |
| **Test SSL certificate renewal** | `sudo certbot renew --dry-run` |

---

## 8. Common Beginner Troubleshooting

#### Q: "I type my password in SSH, but nothing happens!"
* **Explanation:** In Linux, passwords are completely invisible while typing. Just type your password steadily and press `Enter`.

#### Q: "Certbot says: Could not bind to IPv4 address or Challenge failed"
* **Fix:** Your domain DNS records have not propagated yet, or the A records have a typo. Check [dnschecker.org](https://dnschecker.org) to verify that `yourdomain.com` and `admin.yourdomain.com` both point to your server IP address. Wait 10 minutes and re-run the `sudo certbot ...` command.

#### Q: "What happens if the VPS reboots?"
* **Explanation:** In `docker-compose.yml`, all services are marked with `restart: always`. If Hostinger reboots your server for maintenance, your entire pizza website, backend, and MongoDB will automatically turn back on without you doing anything.
