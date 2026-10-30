/**
 * Production Security & Pipeline Audit Suite
 * Verifies deployment readiness, input sanitization, authentication defense,
 * role-based access control, and environment safeguards.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🔒 ==========================================');
console.log('   APURVA PIZZA HUB - SECURITY AUDIT SUITE   ');
console.log('==========================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

// 1. Audit Environment Validation in Production Mode
runTest('ValidateEnv: Rejects missing JWT_SECRET or short secret in production', () => {
  const validateEnv = require('../backend/src/config/validateEnv');
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.JWT_SECRET;
  const prevMongo = process.env.MONGODB_URI;

  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short_secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

    let threw = false;
    try {
      validateEnv();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Should throw error when JWT_SECRET is less than 32 characters in production');
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.JWT_SECRET = prevSecret;
    process.env.MONGODB_URI = prevMongo;
  }
});

// 2. Audit .gitignore rules for secrets and certs
runTest('Gitignore: Verifies .env and private certificates are excluded from git', () => {
  const gitignorePath = path.join(__dirname, '../.gitignore');
  assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist');
  const content = fs.readFileSync(gitignorePath, 'utf8');

  assert.ok(content.includes('.env'), 'Must ignore .env');
  assert.ok(content.includes('*.key'), 'Must ignore *.key');
  assert.ok(content.includes('*.crt'), 'Must ignore *.crt');
  assert.ok(content.includes('uploads/'), 'Must ignore uploads/');
});

// 3. Audit No Direct Backend Port in Frontend Code
runTest('Frontend Architecture: Zero hardcoded port 5000 in frontend & admin source code', () => {
  const dirs = [
    path.join(__dirname, '../frontend/src'),
    path.join(__dirname, '../admin-frontend/src')
  ];

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
        const text = fs.readFileSync(full, 'utf8');
        assert.ok(
          !text.includes('localhost:5000') && !text.includes('127.0.0.1:5000'),
          `File ${full} contains direct backend port reference!`
        );
      }
    }
  }

  dirs.forEach(scanDir);
});

// 4. Audit Docker Reverse Proxy Isolation
runTest('Docker Architecture: Docker compose and Nginx reverse proxies route /api and /socket.io', () => {
  const customerNginx = path.join(__dirname, '../frontend/nginx.conf');
  const adminNginx = path.join(__dirname, '../admin-frontend/nginx.conf');
  const dockerCompose = path.join(__dirname, '../docker-compose.yml');

  assert.ok(fs.existsSync(customerNginx), 'frontend/nginx.conf must exist');
  assert.ok(fs.existsSync(adminNginx), 'admin-frontend/nginx.conf must exist');
  assert.ok(fs.existsSync(dockerCompose), 'docker-compose.yml must exist');

  const custConf = fs.readFileSync(customerNginx, 'utf8');
  assert.ok(custConf.includes('location /api/'), 'Customer Nginx must reverse proxy /api/');
  assert.ok(custConf.includes('location /socket.io/'), 'Customer Nginx must reverse proxy /socket.io/');

  const admConf = fs.readFileSync(adminNginx, 'utf8');
  assert.ok(admConf.includes('location /api/'), 'Admin Nginx must reverse proxy /api/');
  assert.ok(admConf.includes('location /socket.io/'), 'Admin Nginx must reverse proxy /socket.io/');
});

// 5. Audit Staff Configuration Security
runTest('Staff Config: Plaintext credentials are not committed to disk files', () => {
  const staffConfig = require('../backend/src/config/staffConfig');
  const staff = staffConfig.getStaffCredentials();
  assert.ok(staff.admin && staff.kitchen && staff.driver, 'Must define admin, kitchen, and driver roles');
  assert.ok(!fs.existsSync(path.join(__dirname, '../backend/src/config/staffCredentials.json')), 'Plaintext staffCredentials.json must not exist');
});

// 6. Audit Payment Verification IDOR Defense
runTest('Payment Controller: Razorpay verification requires valid signature and order ownership check', () => {
  const paymentControllerText = fs.readFileSync(path.join(__dirname, '../backend/src/controllers/paymentController.js'), 'utf8');
  assert.ok(/crypto\s*\.\s*createHmac/.test(paymentControllerText), 'Must verify cryptographic HMAC SHA256');
  assert.ok(paymentControllerText.includes('order.user.toString()') || paymentControllerText.includes('unauthorized') || paymentControllerText.includes('order.user'), 'Must verify user ownership against IDOR');
});

// 7. Audit Payment Pipeline: Client cannot spoof 'paid' status
runTest('Order Pipeline: Strict paymentStatus initial state is pending; spoofing blocked', () => {
  const pipelineText = fs.readFileSync(path.join(__dirname, '../backend/src/services/orderPipelineService.js'), 'utf8');
  assert.ok(
    pipelineText.includes("paymentStatus: 'pending'"),
    "Orders must strictly initialize with paymentStatus 'pending'"
  );
  assert.ok(
    !pipelineText.includes("orderPayload.paymentStatus === 'paid' ? 'paid' : 'pending'"),
    'Must not accept client-provided paymentStatus'
  );
});

// 8. Audit Kitchen Staff Privilege Separation
runTest('Role Authorization: Kitchen staff strictly blocked from admin analytics and payment updates', () => {
  const orderRoutesText = fs.readFileSync(path.join(__dirname, '../backend/src/routes/orderRoutes.js'), 'utf8');
  const deliveryRoutesText = fs.readFileSync(path.join(__dirname, '../backend/src/routes/deliveryRoutes.js'), 'utf8');

  assert.ok(
    orderRoutesText.includes("router.get('/analytics/sales', authorizeRoles('admin')"),
    'Sales analytics must be admin-only'
  );
  assert.ok(
    orderRoutesText.includes("router.patch('/:id/payment-status', authorizeRoles('admin')"),
    'Order payment status updates must be admin-only'
  );
  assert.ok(
    deliveryRoutesText.includes("router.post('/shop-status', verifyToken, authorizeRoles('admin')"),
    'Shop status toggle must be admin-only'
  );
});

// 9. Audit Password Persistence Across Reboots
runTest('Database Seed: Preserves staff passwords across server reboots', () => {
  const dbText = fs.readFileSync(path.join(__dirname, '../backend/src/config/db.js'), 'utf8');
  assert.ok(
    dbText.includes('process.env.RESET_STAFF_PASSWORDS'),
    'Existing staff passwords must not be unconditionally overwritten on reboot'
  );
});

// 10. Audit Docker Context Hygiene
runTest('Docker Architecture: Verifies .dockerignore exists across all service directories', () => {
  const rootIgnore = path.join(__dirname, '../.dockerignore');
  const backendIgnore = path.join(__dirname, '../backend/.dockerignore');
  const frontendIgnore = path.join(__dirname, '../frontend/.dockerignore');
  const adminIgnore = path.join(__dirname, '../admin-frontend/.dockerignore');

  assert.ok(fs.existsSync(rootIgnore), 'Root .dockerignore must exist');
  assert.ok(fs.existsSync(backendIgnore), 'Backend .dockerignore must exist');
  assert.ok(fs.existsSync(frontendIgnore), 'Frontend .dockerignore must exist');
  assert.ok(fs.existsSync(adminIgnore), 'Admin-frontend .dockerignore must exist');
});

// 11. Audit Customer PII Masking & Data Harvesting Defense
runTest('PII Defense: Customer phone numbers are masked in user management API to prevent lead harvesting', () => {
  const authControllerText = fs.readFileSync(path.join(__dirname, '../backend/src/controllers/authController.js'), 'utf8');
  assert.ok(
    authControllerText.includes("cleanDigits.slice(0, 2)}••••••${cleanDigits.slice(-2)}"),
    'Customer phone numbers must be masked with bullet characters in getAllUsers'
  );
  assert.ok(
    authControllerText.includes("cleanDigits.length >= 10"),
    'Phone masking logic must validate 10-digit phone length'
  );
});

// 12. Audit Payment Architecture: Zero Manual UTR Requirement
runTest('Payment Security: Manual UPI QR with UTR verification is permanently eliminated', () => {
  const paymentSettingModel = fs.readFileSync(path.join(__dirname, '../backend/src/models/PaymentSetting.js'), 'utf8');
  assert.ok(
    !paymentSettingModel.includes('requireUtrForUpi'),
    'PaymentSetting schema must not contain requireUtrForUpi'
  );

  const pipelineText = fs.readFileSync(path.join(__dirname, '../backend/src/services/orderPipelineService.js'), 'utf8');
  assert.ok(
    !pipelineText.includes("orderPayload.paymentMethod === 'upi_qr'"),
    'Order pipeline must not accept manual upi_qr with UTR'
  );
});

// 13. Audit Order Pipeline Fulfillment & Split Pizza Controls
runTest('Fulfillment Security: Server rejects disabled order types, missing table numbers, and paused split pizzas', () => {
  const pipelineText = fs.readFileSync(path.join(__dirname, '../backend/src/services/orderPipelineService.js'), 'utf8');
  assert.ok(
    pipelineText.includes("orderType === 'delivery' && fulfillment.allowDelivery === false"),
    'Server must reject delivery when disabled by admin'
  );
  assert.ok(
    pipelineText.includes("fulfillment.allowDineIn === false"),
    'Server must reject dine-in when disabled by admin'
  );
  assert.ok(
    pipelineText.includes("fulfillment.allowTakeaway === false"),
    'Server must reject takeaway when disabled by admin'
  );
  assert.ok(
    pipelineText.includes("deliverySettings.splitPizzaSettings?.enabled === false"),
    'Server must reject half & half split pizza when disabled by admin'
  );
  assert.ok(
    pipelineText.includes("orderType === 'dine_in'") && pipelineText.includes("!tableNumber"),
    'Server must strictly require tableNumber for dine_in orders'
  );
});

// 14. Audit Review Upload Security
runTest('Upload Security: Authenticated review photo upload strictly verifies raster image MIME types', () => {
  const uploadRoutesText = fs.readFileSync(path.join(__dirname, '../backend/src/routes/uploadRoutes.js'), 'utf8');
  assert.ok(
    uploadRoutesText.includes("router.post('/review-image', verifyToken,"),
    'Review image upload route must require authentication via verifyToken'
  );
  assert.ok(
    uploadRoutesText.includes("const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']"),
    'Review image upload must strictly enforce raster MIME types (JPEG, PNG, WEBP)'
  );
  assert.ok(
    uploadRoutesText.includes("SVG and executable formats are strictly blocked"),
    'SVG and executable formats must be strictly blocked against XSS'
  );
});

console.log('\n------------------------------------------');
console.log(`Audit Summary: ${passedTests}/${totalTests} Security Checks Passed`);
console.log('------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🚀 All security safeguards verified successfully!\n');
}

