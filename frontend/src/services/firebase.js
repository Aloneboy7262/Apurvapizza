/**
 * Firebase Phone Authentication Service for Apurva Pizza Hub
 * Provides Google Firebase Phone Auth OTP (10,000 free SMS / month)
 * Exclusively used for:
 *   1. New Customer Registration Phone Verification
 *   2. Forgot Password Phone Verification
 * (Normal login remains direct phone/password to preserve SMS quota and speed up ordering)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import api from './api';
import { firebaseConfig } from '../config/firebaseConfig';

// Check if actual production Firebase keys are supplied
export const isLiveFirebaseConfigured = () => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey.length > 20 &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    Boolean(firebaseConfig.projectId)
  );
};

// Initialize Firebase App instance safely
let app = null;
let auth = null;

try {
  if (isLiveFirebaseConfigured()) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (e) {
  console.warn('[Firebase] Initialization warning:', e.message);
}

export { auth };

/**
 * 1. REGISTRATION: Sign Up with Email & send verification link
 * Creates account in Firebase, sends verification email link, and immediately logs out.
 */
export const registerWithEmail = async (email, password) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (isLiveFirebaseConfigured() && auth) {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    const user = userCredential.user;

    // Send Firebase verification email link
    await sendEmailVerification(user);

    // Ensure session is signed out until email verification is confirmed
    await signOut(auth);

    return {
      success: true,
      user,
      message: 'Account created! A verification link has been sent to your email. Please check your inbox and verify your email before logging in.'
    };
  }

  return {
    success: true,
    message: 'Account created! Please check your email to verify your account.'
  };
};

/**
 * 2. LOGIN: Sign in with Email & enforce verification check
 * If user hasn't verified their email, immediately logs them out and throws error:
 * "Please check your email to verify your account."
 */
export const loginWithEmail = async (email, password) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (isLiveFirebaseConfigured() && auth) {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    const user = userCredential.user;

    // Strict Email Verification Rule
    if (!user.emailVerified) {
      await signOut(auth);
      const unverifiedError = new Error('Please check your email to verify your account.');
      unverifiedError.code = 'auth/unverified-email';
      throw unverifiedError;
    }

    const idToken = await user.getIdToken();
    return {
      success: true,
      user,
      idToken
    };
  }

  return { success: true };
};

/**
 * 3. FORGOT PASSWORD: Send Firebase password reset email
 */
export const sendPasswordReset = async (email) => {
  const cleanEmail = email.trim().toLowerCase();

  if (isLiveFirebaseConfigured() && auth) {
    await sendPasswordResetEmail(auth, cleanEmail);
  }

  return {
    success: true,
    message: 'If an account exists, a reset link has been sent to your email.'
  };
};

/**
 * Initialize invisible ReCAPTCHA for Firebase Phone Auth
 * @param {string} containerId - DOM element ID for ReCAPTCHA rendering
 * @returns {RecaptchaVerifier|null}
 */
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (!auth) return null;
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[Firebase] Container #${containerId} not found in DOM`);
      return null;
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('[Firebase] ReCAPTCHA solved successfully');
      },
      'expired-callback': () => {
        console.warn('[Firebase] ReCAPTCHA expired. Resetting...');
      }
    });

    return window.recaptchaVerifier;
  } catch (error) {
    console.warn('[Firebase] ReCAPTCHA initialization note:', error.message);
    return null;
  }
};

/**
 * Send OTP via Google Firebase Phone Auth or Server Gateway
 * @param {string} phone - 10-digit mobile number
 * @param {string} reason - 'register' | 'forgot_password'
 * @returns {Promise<{ mode: string, confirmationResult?: any, message: string }>}
 */

export const requestPhoneOtp = async (phone, reason = 'register') => {
  const cleanPhone = phone.trim().replace(/\D/g, '');
  const formattedPhone = `+91${cleanPhone}`;

  const isTunnel =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('.trycloudflare.com') ||
      window.location.hostname.includes('.loca.lt') ||
      window.location.hostname.includes('.ngrok') ||
      window.location.hostname.includes('.lhr.life'));

  // 1. Attempt live Firebase Phone Auth ONLY on authorized production domains
  if (!isTunnel && isLiveFirebaseConfigured() && auth) {
    try {
      let appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        appVerifier = setupRecaptcha('recaptcha-container');
      }

      if (appVerifier) {
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        return {
          mode: 'firebase',
          confirmationResult,
          message: `SMS OTP verification code sent to ${formattedPhone} via Firebase.`
        };
      }
    } catch (firebaseErr) {
      console.warn('[Firebase Phone Auth] Live SMS error, falling back to Server OTP Gateway:', firebaseErr.message || firebaseErr);
    }
  }

  // 2. High-resilience Server OTP Gateway (Instant dispatch via Fast2SMS / Twilio or Server OTP)
  const res = await api.post('/auth/send-otp', {
    phone: cleanPhone,
    reason
  });

  return {
    mode: 'server',
    devOtp: res.data?.devOtp || null,
    message: res.data.message || `Verification code sent to +91 ${cleanPhone}. Please check your phone SMS.`
  };
};

/**
 * Confirm OTP and acquire signed phone verification token
 * @param {Object} options
 * @param {string} options.phone - 10-digit mobile number
 * @param {string} options.otp - 6-digit OTP code entered by user
 * @param {any} [options.confirmationResult] - Firebase confirmationResult object if using Firebase
 * @param {string} [options.reason] - 'register' | 'forgot_password'
 * @returns {Promise<string>} verificationToken
 */
export const confirmPhoneOtp = async ({ phone, otp, confirmationResult, reason = 'register' }) => {
  const cleanPhone = phone.trim().replace(/\D/g, '');
  const cleanOtp = otp.trim();

  // If Firebase confirmationResult exists, verify with Firebase first
  if (confirmationResult && typeof confirmationResult.confirm === 'function') {
    try {
      const userCredential = await confirmationResult.confirm(cleanOtp);
      let firebaseIdToken = null;
      try {
        firebaseIdToken = await userCredential.user.getIdToken();
      } catch (idErr) {
        console.warn('Firebase token retrieval warning:', idErr.message);
      }

      // Exchange with backend for verified session token
      const res = await api.post('/auth/verify-otp', {
        phone: cleanPhone,
        firebaseToken: firebaseIdToken || 'firebase_verified',
        reason
      });

      return res.data.verificationToken || 'verified';
    } catch (fbErr) {
      console.warn('[Firebase] Code verification failed:', fbErr.message);
      let msg = fbErr.message || 'Invalid Firebase OTP code. Please check SMS.';
      if (fbErr.code === 'auth/invalid-verification-code') {
        msg = 'Incorrect 6-digit OTP. Please check your SMS and enter the code again.';
      } else if (fbErr.code === 'auth/code-expired') {
        msg = 'OTP has expired. Please click Resend OTP to get a new code.';
      }
      throw new Error(msg);
    }
  }

  // Direct Server OTP Verification
  const res = await api.post('/auth/verify-otp', {
    phone: cleanPhone,
    otp: cleanOtp,
    reason
  });

  if (res.data.success && res.data.verificationToken) {
    return res.data.verificationToken;
  }

  throw new Error(res.data.message || 'Failed to verify OTP code.');
};

