const mongoose = require('mongoose');

const DEFAULT_REFUND_POLICY = `## Cancellation & Refund Policy

Last Updated: October 2026

At **Apurva Pizza Hub**, customer satisfaction and food safety are our highest priorities. Because our pizzas and fast food items are freshly prepared to order in our stone ovens, we have established the following clear and fair cancellation and refund guidelines.

---

### 1. Order Cancellation
* **Before Preparation**: You may cancel your order free of charge within **5 minutes** of placing it, or before the kitchen begins food preparation.
* **During / After Preparation**: Once your order has moved to the "Baking / In Oven" or "Ready" stage, cancellations are **not permitted**, as food prepared specifically for you cannot be restocked or reused.
* **Store Cancellations**: If Apurva Pizza Hub is unable to fulfill your order due to unforeseen circumstances (e.g., ingredient outage, severe weather, or delivery address outside serviceable range), our team will cancel your order immediately and initiate a **100% full refund**.

---

### 2. Eligibility for Refunds
You are entitled to a full refund or an immediate complimentary replacement in the following scenarios:
* **Incorrect Items**: The items delivered do not match the items ordered on your receipt.
* **Damaged / Spilled Food**: Food that arrives severely damaged, crushed, or spilled during transit.
* **Quality Issues**: Undercooked, burnt, or spoiled food reported within **2 hours** of delivery with photographic proof.
* **Severe Delivery Delay**: Order delivery delayed beyond 90 minutes without prior communication or justification.

---

### 3. Non-Refundable Situations
Refunds will **not** be issued if:
* An incorrect or unreachable delivery address / contact phone number was provided at checkout.
* The customer is unavailable to receive the order after the delivery partner arrives at the location.
* Food taste preferences where the order was prepared accurately according to standard menu specifications.

---

### 4. Refund Processing Timeframe (Turnaround Time)
* **Online Payments (Razorpay / Debit Card / Credit Card / Net Banking)**: Refunds are automatically initiated back to the original source payment account within **24 hours** and will reflect in your bank account or card statement within **5 to 7 business days**, in accordance with standard RBI and banking settlement timelines.
* **Direct UPI QR Payments**: For verified UPI orders, refunds will be credited back to your original UPI VPA ID within **24 to 48 hours** following verification of your 12-digit UTR reference number.
* **Cash on Delivery (COD)**: For qualifying COD complaints, our support team will disburse refunds directly via instant UPI transfer or store credit upon receipt of your UPI ID.

---

### 5. How to Request a Refund or Support
If you encounter any problem with your order, please reach out to us with your **Order ID** and photos of the food:
* **Phone / WhatsApp**: +91 73796 82620
* **Email**: support@apurvapizzahub.com
* **Operating Hours**: 10:00 AM – 11:00 PM (Monday to Sunday)
* **Outlet Address**: Main Market Road, Near SBI Bank, Pathardewa, Deoria, Uttar Pradesh - 274404`;

const DEFAULT_SHIPPING_POLICY = `## Shipping & Delivery Policy

Last Updated: October 2026

**Apurva Pizza Hub** operates a dedicated local delivery fleet to deliver hot, fresh, wood-fired pizzas and fast food directly to your doorstep in Pathardewa and neighboring communities in Deoria district.

---

### 1. Serviceable Delivery Locations
We currently deliver to the following areas:
* **Pathardewa Central & Main Market** (Pin code: 274404)
* **Tarkulwa & Surrounding Localities**
* **Rampur Karkhana & Adjoining Villages**
* **Designated Delivery Radial Zones within 15 km of our Pathardewa Kitchen**

You can verify whether your exact location is deliverable using our interactive GPS map pin selector at Checkout.

---

### 2. Estimated Delivery Time
* **Standard Delivery Time**: **30 to 45 minutes** from order confirmation.
* **Fresh Baking Process**: Each pizza is hand-stretched and stone-baked fresh upon order receipt (12–15 minutes), followed by thermal-bag packaging and dispatch.
* **Peak Times & Weather Delays**: During evening peak hours (7:00 PM – 9:30 PM), weekend surges, or adverse weather conditions (heavy rain/fog), delivery may take **45 to 60 minutes**. You will receive real-time notifications on your screen.

---

### 3. Shipping & Delivery Charges
* **Free Delivery Zone**: Orders placed within our local radius (<5 km) or meeting our minimum cart requirement qualify for **100% Free Delivery**.
* **Extended Distance Fee**: For locations beyond 5 km, a transparent distance-based fee (calculated per kilometer) is added at checkout before payment.
* **Zero Hidden Charges**: The total amount displayed at checkout is fully inclusive of delivery charges, packaging, and applicable taxes.

---

### 4. Real-Time Order Tracking
Customers can track the live progress of their order at every step:
1. **Order Received / Pending**
2. **In Kitchen (Baking in Stone Oven)**
3. **Out for Delivery (Assigned to Delivery Partner)**
4. **Delivered to Doorstep**

Live order tracking is accessible from the **Profile > Active Orders** tab or the on-screen Order Tracker HUD.

---

### 5. Delivery Handover & COD Guidelines
* For **Prepaid & Razorpay Orders**: Contactless delivery is available upon request in order notes.
* For **Cash on Delivery (COD)**: Please keep the exact cash amount or be ready to scan the rider's UPI QR upon arrival.
* Our delivery partner will make up to two phone calls upon arriving at your address. If you cannot be reached within 10 minutes of arrival, the order will be marked undeliverable.`;

const DEFAULT_TERMS = `## Terms and Conditions

Last Updated: October 2026

Welcome to **Apurva Pizza Hub** (accessible via our website and web applications). By browsing, registering, or placing an order with Apurva Pizza Hub, you agree to be legally bound by these Terms and Conditions.

---

### 1. General & Business Information
* **Business Entity**: Apurva Pizza Hub & Fast Food
* **Registered Address**: Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404
* **Services Provided**: Preparing, marketing, selling, and delivering freshly baked pizzas, fast food items, beverages, and desserts.

---

### 2. User Accounts & Registration
* You may create an account using your mobile phone number and a secure password.
* You are responsible for maintaining the confidentiality of your credentials and for all activities conducted under your account.
* You must provide true, accurate, and current contact and address details to ensure prompt food delivery.

---

### 3. Pricing, Menu & Availability
* All prices listed on Apurva Pizza Hub are in **Indian Rupees (INR)** and include all applicable taxes.
* Prices and item availability are subject to change without prior notice. In the event an ordered item is out of stock, our team will promptly inform you and issue an instant refund or suitable substitute.
* Special discount coupons and promotional offers are subject to specific validity dates, minimum order values, and usage limits configured in our system.

---

### 4. Payments & Billing
We support the following secure payment methods:
1. **Online Payment Gateway (Razorpay)**: Supports Credit/Debit Cards (Visa, MasterCard, RuPay), UPI, Net Banking, and Digital Wallets.
2. **Dynamic Store UPI QR**: Scan-and-pay via Google Pay, PhonePe, Paytm, or BHIM with a mandatory 12-digit UTR reference entry.
3. **Cash on Delivery (COD)**: Subject to maximum order thresholds configured by management.

All online transactions are processed through RBI-authorized, encrypted, PCI-DSS Level 1 compliant gateways.

---

### 5. Food Safety & Allergen Disclaimer
* While we follow strict food hygiene and safety standards, our kitchen handles wheat, gluten, dairy (mozzarella, cheese blends), yeast, and seasonings. Customers with severe dietary allergies are requested to review product details or contact our kitchen staff before ordering.

---

### 6. Intellectual Property
All brand logos, images, pizza photographs, software code, and textual content displayed on this website are the intellectual property of Apurva Pizza Hub and protected under applicable copyright and trademark laws.

---

### 7. Limitation of Liability & Governing Law
* Apurva Pizza Hub shall not be liable for any indirect, incidental, or consequential damages resulting from inability to use the service.
* These Terms and Conditions shall be governed by and construed in accordance with the **laws of India**. Any disputes arising shall be subject to the exclusive jurisdiction of the competent courts in **Deoria, Uttar Pradesh, India**.`;

const DEFAULT_PRIVACY_POLICY = `## Privacy Policy

Last Updated: October 2026

**Apurva Pizza Hub** ("we", "our", or "us") values your trust and is dedicated to protecting your personal information. This Privacy Policy outlines how we collect, store, utilize, and protect your information when you visit our website or order food through our platform.

---

### 1. Information We Collect
We collect only the information necessary to fulfill your food orders and provide high-quality customer service:
* **Personal & Contact Details**: Full Name, Mobile Phone Number, and Email Address.
* **Delivery Information**: Detailed house address, landmark, area, pin code, and GPS coordinates (latitude & longitude) obtained via map selection for accurate driver navigation.
* **Order History**: Products ordered, customization options, transaction timestamps, and payment method used.
* **Technical Information**: IP address, browser type, operating system, and device identifiers used to maintain session security and prevent fraudulent orders.

---

### 2. How We Use Your Information
* To process, prepare, and deliver your food orders to your exact address.
* To send real-time order confirmation, baking status, and delivery alerts via SMS or WhatsApp.
* To verify online payments and prevent unauthorized or duplicate transactions.
* To provide responsive customer support and issue refunds when applicable.
* To analyze menu preferences and enhance user experience on our platform.

---

### 3. Payment Security & PCI-DSS Compliance
* **We do not store your banking passwords, card CVVs, or UPI PINs.**
* All digital payments made on Apurva Pizza Hub are securely processed through **Razorpay**, an RBI-authorized, PCI-DSS Level 1 certified payment gateway.
* Your payment data is protected using industry-standard TLS/SSL (Transport Layer Security) encryption.

---

### 4. Disclosure of Information to Third Parties
We **never** sell, rent, or trade your personal data to third-party marketing companies. We only disclose information to:
* **Our In-House Delivery Staff**: Customer name, delivery address, and contact number solely for the purpose of completing food delivery.
* **Payment Processors**: Necessary billing information transferred securely to Razorpay for payment authorization.
* **Law Enforcement**: When legally required by applicable Indian laws or government authorities.

---

### 5. Data Retention & Your Rights
* We retain your order history and account details as long as your account remains active or as required for accounting and legal compliance.
* You have the right to review, update, or request the deletion of your account and personal information at any time by contacting our support team at **support@apurvapizzahub.com**.

---

### 6. Contact Us
For any privacy-related questions or data requests:
* **Email**: support@apurvapizzahub.com
* **Phone**: +91 73796 82620
* **Address**: Apurva Pizza Hub, Main Market Road, Near SBI Bank, Pathardewa, Deoria, UP - 274404`;

const DEFAULT_ABOUT_US = `## About Apurva Pizza Hub

### Authentic Wood-Fired Craft in Pathardewa, Deoria

Welcome to **Apurva Pizza Hub**, the home of handcrafted pizzas, gourmet burgers, crispy sides, and refreshing shakes in Pathardewa. Born out of a deep passion for authentic, artisanal Italian-style baking, we set out with a simple mission: **to serve the freshest, tastiest, and highest quality pizzas at affordable prices**.

---

### What Sets Our Pizzas Apart?
1. **Fresh In-House Dough Made Daily**: We never use frozen bases. Our pizza dough is made from scratch every morning, slowly cold-fermented for superior flavor, light digestion, and that signature airy, crispy crust.
2. **Authentic Stone Oven Baking**: Our pizzas are baked on traditional stone decks at high temperatures, creating the perfect leopard-spotted char and melting the cheese to bubbling perfection.
3. **100% Real Dairy Mozzarella**: We use pure, premium dairy cheese — no artificial cheese blends or liquid vegetable oil substitutes.
4. **Locally Sourced Farm Ingredients**: Our sauces are simmered from ripe tomatoes and Italian herbs, accompanied by fresh capsicum, mushrooms, sweet corn, and premium toppings.
5. **Strict Hygiene Standards**: Cleanliness is our pride. Our open kitchen follows stringent safety and sanitization protocols at every stage.

---

### Our Promise to You
Whether you are ordering a quick personal pizza for lunch, sharing a family feast on movie night, or hosting a birthday party with friends, we promise:
* Freshly baked right when you order — never reheated.
* Hot, fast delivery within **30 to 45 minutes**.
* Friendly, transparent customer service with 100% satisfaction guarantee.

---

### Visit Our Outlet
* **Location**: Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404
* **Phone / WhatsApp**: +91 73796 82620
* **Operating Hours**: 10:00 AM – 11:00 PM (Open 7 Days a Week)`;

const policySettingSchema = new mongoose.Schema(
  {
    contact: {
      businessName: {
        type: String,
        default: 'Apurva Pizza Hub',
        trim: true
      },
      legalEntityName: {
        type: String,
        default: 'Apurva Pizza Hub & Fast Food',
        trim: true
      },
      supportEmail: {
        type: String,
        default: 'support@apurvapizzahub.com',
        trim: true
      },
      supportPhone: {
        type: String,
        default: '+91 73796 82620',
        trim: true
      },
      operatingAddress: {
        type: String,
        default: 'Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404',
        trim: true
      },
      city: {
        type: String,
        default: 'Pathardewa',
        trim: true
      },
      state: {
        type: String,
        default: 'Uttar Pradesh',
        trim: true
      },
      pincode: {
        type: String,
        default: '274404',
        trim: true
      },
      operatingHours: {
        type: String,
        default: '10:00 AM – 11:00 PM (Monday to Sunday)',
        trim: true
      }
    },
    refundPolicy: {
      type: String,
      default: DEFAULT_REFUND_POLICY
    },
    shippingPolicy: {
      type: String,
      default: DEFAULT_SHIPPING_POLICY
    },
    termsAndConditions: {
      type: String,
      default: DEFAULT_TERMS
    },
    privacyPolicy: {
      type: String,
      default: DEFAULT_PRIVACY_POLICY
    },
    aboutUs: {
      type: String,
      default: DEFAULT_ABOUT_US
    }
  },
  {
    timestamps: true
  }
);

/**
 * Singleton Pattern: Retrieve or initialize default policies
 */
policySettingSchema.statics.getOrCreatePolicy = async function () {
  let policy = await this.findOne();
  if (!policy) {
    policy = await this.create({});
  }
  return policy;
};

/**
 * Static Helper: Return raw defaults for resetting
 */
policySettingSchema.statics.getDefaults = function () {
  return {
    contact: {
      businessName: 'Apurva Pizza Hub',
      legalEntityName: 'Apurva Pizza Hub & Fast Food',
      supportEmail: 'support@apurvapizzahub.com',
      supportPhone: '+91 73796 82620',
      operatingAddress: 'Main Market Road, Near State Bank of India (SBI), Pathardewa, Deoria, Uttar Pradesh - 274404',
      city: 'Pathardewa',
      state: 'Uttar Pradesh',
      pincode: '274404',
      operatingHours: '10:00 AM – 11:00 PM (Monday to Sunday)'
    },
    refundPolicy: DEFAULT_REFUND_POLICY,
    shippingPolicy: DEFAULT_SHIPPING_POLICY,
    termsAndConditions: DEFAULT_TERMS,
    privacyPolicy: DEFAULT_PRIVACY_POLICY,
    aboutUs: DEFAULT_ABOUT_US
  };
};

module.exports = mongoose.model('PolicySetting', policySettingSchema);
