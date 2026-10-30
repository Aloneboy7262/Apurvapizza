import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Pizza,
  KeyRound,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThreeDFood from '../components/ThreeDFood';
import api from '../services/api';
import { requestPhoneOtp, confirmPhoneOtp } from '../services/firebase';

const checkStrongPassword = (pass, userName) => {
  const p = (pass || '').trim();
  if (p.length < 6) {
    return 'Password must be at least 6 characters long.';
  }

  // Reject common obvious/trivial sequences
  const trivial = [
    '123456',
    '1234567',
    '12345678',
    '123456789',
    '654321',
    'password',
    'pass123',
    'qwerty',
    'abcdef',
    '000000',
    '111111',
    '222222',
    '333333',
    '444444',
    '555555',
    '666666',
    '777777',
    '888888',
    '999999'
  ];
  if (trivial.includes(p.toLowerCase())) {
    return 'This password is too common and easily guessed. Please choose a stronger password.';
  }

  // Check repeated single character like "aaaaaa"
  if (/^(.)\1+$/.test(p)) {
    return 'Password cannot be a single repeating character.';
  }

  // Reject passwords that match or solely contain user name
  if (userName && typeof userName === 'string') {
    const cleanNameParts = userName.toLowerCase().split(/\s+/).filter((part) => part.length >= 3);
    const lower = p.toLowerCase();
    for (const part of cleanNameParts) {
      if (lower === part || lower === `${part}123` || lower === `${part}1234`) {
        return 'Password cannot be your name or a simple variation of it. Please choose something stronger.';
      }
    }
  }

  return null;
};

const Login = () => {
  const { login, register, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' (Sign In with Password) | 'register' (Sign Up via OTP)
  const [authMode, setAuthMode] = useState('login');

  // Registration & forgot-password steps:
  // For 'register': 'phone' -> 'verify-otp' -> 'set-password'
  // For 'forgot': 'forgot-phone' -> 'forgot-otp' -> 'forgot-new'
  const [step, setStep] = useState('login');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Common Phone state
  const [phone, setPhone] = useState('');

  // Password for direct sign-in
  const [password, setPassword] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpConfirmation, setOtpConfirmation] = useState(null);
  const [verificationToken, setVerificationToken] = useState('');

  // New user registration fields (Full Name and Password)
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const cleanCurrentPhone = phone.trim().replace(/\D/g, '');

  // -------------------------------------------------------------
  // TAB SWITCH HANDLER
  // -------------------------------------------------------------
  const switchTab = (mode) => {
    setAuthMode(mode);
    setErrorMessage('');
    setSuccessMessage('');
    setOtp('');
    if (mode === 'login') {
      setStep('login');
    } else {
      setStep('phone');
    }
  };

  // -------------------------------------------------------------
  // 1. DIRECT SIGN IN (PHONE + PASSWORD)
  // -------------------------------------------------------------
  const handleDirectLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (cleanCurrentPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      await login(cleanCurrentPhone, cleanPass);
      setSuccessMessage('Welcome back! Logging you in...');

      setTimeout(() => {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Incorrect credentials. Please verify your phone and password.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. SIGN UP: STEP 1 (SUBMIT PHONE & SEND OTP)
  // -------------------------------------------------------------
  const handleRegisterPhoneSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (cleanCurrentPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      // Check if phone already registered
      const checkRes = await api.post('/auth/check-phone', { phone: cleanCurrentPhone });
      if (checkRes.data.exists) {
        setAuthMode('login');
        setStep('login');
        setErrorMessage('This number is already registered! Please sign in using your password.');
        return;
      }

      await sendNewUserOtp(cleanCurrentPhone);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Unable to proceed. Please check connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendNewUserOtp = async (targetPhone) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const otpRes = await requestPhoneOtp(targetPhone, 'register');
      setOtpConfirmation(otpRes.confirmationResult || null);
      if (otpRes.devOtp) {
        setOtp(otpRes.devOtp);
        setSuccessMessage(`Demo OTP: ${otpRes.devOtp} (Auto-filled for testing)`);
      } else {
        setOtp('');
        setSuccessMessage(`SMS OTP code sent to +91 ${targetPhone}. Please check your phone messages.`);
      }
      setOtpTimer(30);
      setStep('verify-otp');
    } catch (err) {
      setErrorMessage(
        err.message || 'Failed to send SMS OTP to your number. Please check connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. SIGN UP: STEP 2 (VERIFY OTP)
  // -------------------------------------------------------------
  const handleRegisterOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setErrorMessage('Please enter the 6-digit OTP code received on SMS.');
      return;
    }

    try {
      setLoading(true);
      const token = await confirmPhoneOtp({
        phone: cleanCurrentPhone,
        otp: cleanOtp,
        confirmationResult: otpConfirmation,
        reason: 'register'
      });

      setVerificationToken(token);
      setSuccessMessage('');
      setStep('set-password');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid OTP code. Please check your SMS and re-enter.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. SIGN UP: STEP 3 (SET NAME & PASSWORD)
  // -------------------------------------------------------------
  const handleRegisterSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = newName.trim();
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const passError = checkStrongPassword(cleanPass, cleanName);
    if (passError) {
      setErrorMessage(passError);
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      await register({
        name: cleanName,
        phone: cleanCurrentPhone,
        password: cleanPass,
        role: 'customer',
        verificationToken
      });

      setSuccessMessage('Account created successfully! Welcome to Apurva Pizza Hub.');
      setTimeout(() => {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }, 600);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to complete registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. FORGOT PASSWORD FLOW
  // -------------------------------------------------------------
  const handleStartForgotPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (cleanCurrentPhone.length !== 10) {
      setStep('forgot-phone');
      return;
    }

    try {
      setLoading(true);
      const otpRes = await requestPhoneOtp(cleanCurrentPhone, 'forgot_password');
      setOtpConfirmation(otpRes.confirmationResult || null);
      if (otpRes.devOtp) {
        setOtp(otpRes.devOtp);
        setSuccessMessage(`Demo OTP: ${otpRes.devOtp} (Auto-filled for testing)`);
      } else {
        setOtp('');
        setSuccessMessage(`Password reset OTP sent to +91 ${cleanCurrentPhone}.`);
      }
      setOtpTimer(30);
      setStep('forgot-otp');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to send password reset code. Please try again.');
      setStep('forgot-phone');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPhoneSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (cleanCurrentPhone.length !== 10) {
      setErrorMessage('Please enter your 10-digit registered mobile number.');
      return;
    }

    try {
      setLoading(true);
      const otpRes = await requestPhoneOtp(cleanCurrentPhone, 'forgot_password');
      setOtpConfirmation(otpRes.confirmationResult || null);
      if (otpRes.devOtp) {
        setOtp(otpRes.devOtp);
        setSuccessMessage(`Demo OTP: ${otpRes.devOtp} (Auto-filled for testing)`);
      } else {
        setOtp('');
        setSuccessMessage(`Password reset OTP sent to +91 ${cleanCurrentPhone}.`);
      }
      setOtpTimer(30);
      setStep('forgot-otp');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to send password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      const token = await confirmPhoneOtp({
        phone: cleanCurrentPhone,
        otp: cleanOtp,
        confirmationResult: otpConfirmation,
        reason: 'forgot_password'
      });

      setVerificationToken(token);
      setStep('forgot-new');
      setSuccessMessage('');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    const passError = checkStrongPassword(cleanPass, 'Customer');
    if (passError) {
      setErrorMessage(passError);
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        phone: cleanCurrentPhone,
        newPassword: cleanPass,
        verificationToken
      });

      setSuccessMessage(res.data.message || 'Password reset successful! Logging you in...');
      await login(cleanCurrentPhone, cleanPass);
      setTimeout(() => {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }, 600);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isForgotStep = step.startsWith('forgot');

  return (
    <div
      className={`relative min-h-[92vh] w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#090503] text-slate-100' : 'bg-[#faf5ee] text-slate-900'
      }`}
    >
      {/* Invisible ReCAPTCHA Container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      {/* Background 3D Interactive Food Canvas */}
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-auto hidden md:block">
        <ThreeDFood variant="split" interactive={true} />
      </div>

      {/* Radial Gradient Dimmer */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none ${
          isDark
            ? 'bg-radial-gradient from-transparent via-[#090503]/50 to-[#090503]/90'
            : 'bg-radial-gradient from-transparent via-[#faf5ee]/60 to-[#faf5ee]/95'
        }`}
      />

      {/* Glow Orbs */}
      <div
        className={`absolute -top-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[90px] sm:blur-[120px] pointer-events-none ${
          isDark ? 'bg-orange-600/15' : 'bg-orange-400/20'
        }`}
      />
      <div
        className={`absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[90px] sm:blur-[120px] pointer-events-none ${
          isDark ? 'bg-amber-600/15' : 'bg-amber-300/25'
        }`}
      />

      {/* Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className={`backdrop-blur-md md:backdrop-blur-2xl rounded-3xl p-6 sm:p-8 transition-colors duration-300 ${
            isDark
              ? 'bg-slate-900/95 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-orange-500/30'
              : 'bg-white/95 shadow-[0_20px_50px_rgba(249,115,22,0.14)] border border-orange-200/90'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-5">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/25 mb-3 border border-orange-400/30"
            >
              <Pizza className="w-7 h-7 text-white" />
            </motion.div>
            <h1
              className={`text-2xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Apurva <span className="text-orange-500">Pizza Hub</span>
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
              {authMode === 'login' && step === 'login' && 'Sign in using your mobile number and password'}
              {authMode === 'register' && step === 'phone' && 'Create an account to start ordering delicious food'}
              {step === 'verify-otp' && `Enter 6-digit OTP sent to +91 ${phone}`}
              {step === 'set-password' && `Complete account for +91 ${phone}`}
              {step === 'forgot-phone' && 'Enter your phone number to reset password'}
              {step === 'forgot-otp' && `Enter OTP sent to +91 ${phone}`}
              {step === 'forgot-new' && `Set new password for +91 ${phone}`}
            </p>
          </div>

          {/* Mode Tabs (Sign In vs Create Account) - hidden during multi-step subflows */}
          {!isForgotStep && step !== 'verify-otp' && step !== 'set-password' && (
            <div
              className={`flex rounded-2xl p-1 mb-5 border transition-colors ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchTab('register')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Alert messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-4 p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                  errorMessage.includes('already register') || errorMessage.includes('already registered')
                    ? 'bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/60 text-amber-900 dark:text-amber-200'
                    : 'bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-500/50 text-red-900 dark:text-red-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-relaxed font-bold">{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-bold">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================= */}
          {/* TAB 1: DIRECT LOGIN (MOBILE NUMBER + PASSWORD ONLY)           */}
          {/* ============================================================= */}
          {authMode === 'login' && step === 'login' && (
            <form onSubmit={handleDirectLoginSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Mobile Number
                </label>
                <div
                  className={`flex items-center rounded-xl border overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all ${
                    isDark
                      ? 'bg-slate-950/90 border-slate-700'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div
                    className={`px-3.5 py-3 flex items-center gap-1.5 shrink-0 select-none border-r font-bold text-sm ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-orange-400'
                        : 'bg-slate-100 border-slate-200 text-orange-600'
                    }`}
                  >
                    <span className="text-base leading-none">🇮🇳</span>
                    <span className="font-extrabold">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    autoFocus
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className={`w-full px-3.5 py-3 bg-transparent text-sm font-semibold tracking-wider focus:outline-none ${
                      isDark
                        ? 'text-white placeholder-slate-500'
                        : 'text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 pl-1">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-slate-300' : 'text-slate-800'
                    }`}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleStartForgotPassword}
                    className="text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || cleanCurrentPhone.length !== 10 || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer border border-orange-400/30"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className={`text-xs font-semibold cursor-pointer transition-colors ${
                    isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-700 hover:text-orange-600'
                  }`}
                >
                  Don't have an account? <span className="text-orange-500 font-bold underline">Create one now</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* TAB 2: SIGN UP STEP 1 (PHONE INPUT)                           */}
          {/* ============================================================= */}
          {authMode === 'register' && step === 'phone' && (
            <form onSubmit={handleRegisterPhoneSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Mobile Number
                </label>
                <div
                  className={`flex items-center rounded-xl border overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all ${
                    isDark
                      ? 'bg-slate-950/90 border-slate-700'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div
                    className={`px-3.5 py-3.5 flex items-center gap-1.5 shrink-0 select-none border-r font-bold text-sm ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-orange-400'
                        : 'bg-slate-100 border-slate-200 text-orange-600'
                    }`}
                  >
                    <span className="text-base leading-none">🇮🇳</span>
                    <span className="font-extrabold">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    autoFocus
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className={`w-full px-3.5 py-3.5 bg-transparent text-base font-semibold tracking-wider focus:outline-none ${
                      isDark
                        ? 'text-white placeholder-slate-500'
                        : 'text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || cleanCurrentPhone.length !== 10}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer border border-orange-400/30"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending SMS OTP...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Continue & Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`text-xs font-semibold cursor-pointer transition-colors ${
                    isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-700 hover:text-orange-600'
                  }`}
                >
                  Already registered? <span className="text-orange-500 font-bold underline">Sign in with password</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* TAB 2: SIGN UP STEP 2 (OTP VERIFICATION)                      */}
          {/* ============================================================= */}
          {step === 'verify-otp' && (
            <form onSubmit={handleRegisterOtpSubmit} className="space-y-4">
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    OTP sent to:
                  </div>
                  <div className={`text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    +91 {phone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Number</span>
                </button>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-base tracking-widest text-center font-bold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              {/* Resend Timer */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Didn't receive the SMS code?</span>
                {otpTimer > 0 ? (
                  <span className="text-orange-500 font-semibold">Resend in {otpTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendNewUserOtp(cleanCurrentPhone)}
                    disabled={loading}
                    className="text-orange-500 hover:text-orange-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading || otp.length !== 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer border border-orange-400/30"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying OTP...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.button>
            </form>
          )}

          {/* ============================================================= */}
          {/* TAB 2: SIGN UP STEP 3 (SET NAME & PASSWORD)                   */}
          {/* ============================================================= */}
          {step === 'set-password' && (
            <form onSubmit={handleRegisterSetPasswordSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Full name"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all cursor-pointer border border-orange-400/30 disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.button>
            </form>
          )}

          {/* ============================================================= */}
          {/* FORGOT PASSWORD: STEP 1 (PHONE)                               */}
          {/* ============================================================= */}
          {step === 'forgot-phone' && (
            <form onSubmit={handleForgotPhoneSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Registered Mobile Number
                </label>
                <div
                  className={`flex items-center rounded-xl border overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all ${
                    isDark
                      ? 'bg-slate-950/90 border-slate-700'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div
                    className={`px-3.5 py-3 flex items-center gap-1.5 shrink-0 select-none border-r font-bold text-sm ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-orange-400'
                        : 'bg-slate-100 border-slate-200 text-orange-600'
                    }`}
                  >
                    <span className="text-base leading-none">🇮🇳</span>
                    <span className="font-extrabold">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    autoFocus
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3.5 py-3 bg-transparent text-sm font-semibold tracking-wider focus:outline-none ${
                      isDark
                        ? 'text-white placeholder-slate-500'
                        : 'text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || cleanCurrentPhone.length !== 10}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending OTP...' : 'Send Reset OTP'}
              </motion.button>
            </form>
          )}

          {/* ============================================================= */}
          {/* FORGOT PASSWORD: STEP 2 (OTP)                                 */}
          {/* ============================================================= */}
          {step === 'forgot-otp' && (
            <form onSubmit={handleForgotOtpVerify} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('forgot-phone')}
                  className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Change Number</span>
                </button>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-base tracking-widest text-center font-bold focus:outline-none focus:border-orange-500 ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Sent to +91 {phone}</span>
                {otpTimer > 0 ? (
                  <span className="text-orange-500 font-semibold">Resend in {otpTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartForgotPassword}
                    disabled={loading}
                    className="text-orange-500 hover:text-orange-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading || otp.length !== 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Verifying Code...' : 'Verify Code'}
              </motion.button>
            </form>
          )}

          {/* ============================================================= */}
          {/* FORGOT PASSWORD: STEP 3 (NEW PASSWORD)                        */}
          {/* ============================================================= */}
          {step === 'forgot-new' && (
            <form onSubmit={handleForgotResetPasswordSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:border-orange-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 pl-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:border-orange-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Save Password & Log In'}
              </motion.button>
            </form>
          )}

          {/* Footer Branding (No public staff links) */}
          <div
            className={`mt-6 pt-4 border-t flex flex-col items-center gap-1 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Pathardewa, Deoria • 100% Real Mozzarella Pizzas
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
