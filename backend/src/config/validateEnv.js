/**
 * Production Environment Variables Validator
 * Validates all required secrets and configurations before server boot.
 * Fails fast with clear actionable error messages in production if critical variables are missing or insecure.
 */

const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // 1. Database Connection URI
  if (!process.env.MONGODB_URI) {
    if (isProduction) {
      errors.push('MONGODB_URI is required in production environment.');
    } else {
      warnings.push('MONGODB_URI is not set. Using default mongodb://localhost:27017/apurva_pizza_hub');
    }
  }

  // 2. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProduction) {
      errors.push('CRITICAL: JWT_SECRET must be configured in production!');
    } else {
      warnings.push('JWT_SECRET is not set in development. Using temporary development secret.');
    }
  } else if (jwtSecret.length < 32 && isProduction) {
    errors.push('CRITICAL: JWT_SECRET must be at least 32 characters long for cryptographic security in production.');
  }

  // 3. Port configuration
  const port = process.env.PORT;
  if (port && (isNaN(Number(port)) || Number(port) <= 0 || Number(port) > 65535)) {
    errors.push(`Invalid PORT configuration: "${port}". Must be a number between 1 and 65535.`);
  }

  // 4. SMS Gateway warning for OTP verification in production
  const hasSmsGateway = Boolean(
    process.env.FAST2SMS_API_KEY ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
  );

  if (isProduction && !hasSmsGateway) {
    warnings.push('No SMS Gateway configured (FAST2SMS_API_KEY or TWILIO credentials). OTPs will log securely to server console only.');
  }

  // Output warnings
  if (warnings.length > 0) {
    console.log('\n================== CONFIGURATION NOTICES ==================');
    warnings.forEach((w) => console.warn(`⚠️  ${w}`));
    console.log('===========================================================\n');
  }

  // Halt server immediately in production on configuration errors
  if (errors.length > 0) {
    console.error('\n🛑 ================= FATAL SECURITY CONFIGURATION ERRORS =================');
    errors.forEach((e) => console.error(`❌  ${e}`));
    console.error('=========================================================================\n');
    throw new Error(`Fatal Environment Configuration Failure: \n${errors.join('\n')}`);
  }

  return { isValid: true };
};

module.exports = validateEnv;
