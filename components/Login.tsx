import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Loader2, Mail, Eye, EyeOff, User, Fingerprint, ArrowLeft, Send, CheckCircle2, KeyRound } from 'lucide-react';
import { LOGO_DARK_BG, COMPANY_NAME } from '../constants';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { UserRole } from '../types';
import emailjs from '@emailjs/browser';

interface LoginProps {
  onLogin: (user: any) => void;
}

type LoginView = 'login' | 'forgot' | 'otp' | 'reset' | 'success';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // Navigation State
  const [view, setView] = useState<LoginView>('login');
  
  // Input States
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Reset Flow States
  const [resetEmail, setResetEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetAccount, setResetAccount] = useState<{ id: string, type: 'staff' | 'client' } | null>(null);

  // EmailJS Config (reusing from InvoiceList)
  const EMAIL_SERVICE_ID = 'service_ibfej4o';
  const EMAIL_TEMPLATE_ID = 'template_scjyi8o';
  const EMAIL_PUBLIC_KEY = 'DQ9tmUQaTNMAqpyJa';

  // Auto-detect input type for UI feedback
  const isEmailInput = identifier.includes('@');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
        if (!isEmailInput) {
            const clientsRef = collection(db, 'clients');
            const q = query(clientsRef, where('id', '==', identifier), where('portalPassword', '==', password));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const clientData = querySnapshot.docs[0].data();
                if (clientData.portalAccess) {
                    onLogin({
                        uid: clientData.id,
                        email: clientData.email,
                        displayName: clientData.name,
                        role: UserRole.CLIENT,
                        clientId: clientData.id,
                        isClient: true
                    });
                    return;
                } else {
                    throw new Error('Portal access is currently disabled for this client.');
                }
            }
        }

        const usersRef = collection(db, 'users');
        const userQ = query(usersRef, where('email', '==', identifier), where('password', '==', password));
        const userSnapshot = await getDocs(userQ);

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            onLogin({
                uid: userSnapshot.docs[0].id,
                email: userData.email,
                displayName: userData.displayName,
                role: userData.role,
                allowedBranchIds: userData.allowedBranchIds || [],
                isStaff: true
            });
            return;
        }

        if (isEmailInput) {
            const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
            onLogin(userCredential.user);
        } else {
            throw new Error('Identifier not recognized. Use a valid Client ID or Email.');
        }

    } catch (err: any) {
      let msg = 'Authentication failed.';
      if (err.code === 'auth/invalid-credential') msg = 'Invalid credentials.';
      else if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- PASSWORD RESET LOGIC ---

  const initiateReset = async () => {
    setError('');
    setLoading(true);
    try {
        // 1. Search for user in Staff or Clients
        let foundAccount: { id: string, type: 'staff' | 'client' } | null = null;
        
        // Check Staff
        const staffQ = query(collection(db, 'users'), where('email', '==', resetEmail));
        const staffSnap = await getDocs(staffQ);
        if (!staffSnap.empty) {
            foundAccount = { id: staffSnap.docs[0].id, type: 'staff' };
        } else {
            // Check Clients
            const clientQ = query(collection(db, 'clients'), where('email', '==', resetEmail));
            const clientSnap = await getDocs(clientQ);
            if (!clientSnap.empty) {
                foundAccount = { id: clientSnap.docs[0].id, type: 'client' };
            }
        }

        if (!foundAccount) {
            throw new Error('No account found associated with this email address.');
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);
        setResetAccount(foundAccount);

        // 3. Send via EmailJS
        const templateParams = {
            to_email: resetEmail,
            company_name: COMPANY_NAME,
            subject: 'Security Verification Code',
            message: `Your one-time password (OTP) for resetting your Vedartha Identity is: ${otp}. This code is valid for 10 minutes.`,
            client_name: 'Authorized User'
        };

        await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY);
        
        setView('otp');
    } catch (err: any) {
        setError(err.message || 'Failed to initiate recovery.');
    } finally {
        setLoading(false);
    }
  };

  const verifyOtp = () => {
    if (enteredOtp === generatedOtp) {
        setView('reset');
        setError('');
    } else {
        setError('Invalid verification code. Please check your email.');
    }
  };

  const completeReset = async () => {
    if (!resetAccount || !newPassword) return;
    setLoading(true);
    try {
        const docRef = doc(db, resetAccount.type === 'staff' ? 'users' : 'clients', resetAccount.id);
        const updateData = resetAccount.type === 'staff' 
            ? { password: newPassword } 
            : { portalPassword: newPassword };
        
        await updateDoc(docRef, updateData);
        setView('success');
    } catch (err: any) {
        setError('Failed to update password. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {/* LEFT SIDE: Professional Video Loop & Brand Identity */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover grayscale-[0.2]"
        >
          <source src="https://res.cloudinary.com/dtgufvwb5/video/upload/v1/10915129-hd_3840_2160_30fps_xy4way.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1c2d3d]/80 via-transparent to-transparent"></div>
        <div className="absolute top-12 left-12 z-20">
          <img src={LOGO_DARK_BG} alt="Vedartha Logo" className="h-20 md:h-28 object-contain animate-in fade-in slide-in-from-left-10 duration-1000" />
        </div>
      </div>

      {/* RIGHT SIDE: Smart Gateway */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-white relative">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
          
          {/* LOGIN VIEW */}
          {view === 'login' && (
              <>
                <div className="mb-12 text-center lg:text-left">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Vedartha International Limited</h1>
                    <div className="flex items-center space-x-2 text-indigo-600 font-black uppercase tracking-[0.25em] text-[11px] justify-center lg:justify-start">
                    <Fingerprint size={14} />
                    <span>Access Portal</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-7">
                    {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center animate-shake">
                        <ShieldCheck size={18} className="mr-3 shrink-0" />
                        {error}
                    </div>
                    )}

                    <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identify Yourself</label>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isEmailInput ? 'text-indigo-500 bg-indigo-50' : 'text-emerald-500 bg-emerald-50'}`}>
                            {isEmailInput ? 'Staff / Admin' : 'Client ID'}
                        </span>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#6366f1] transition-colors duration-300">
                        {isEmailInput ? <Mail size={18} /> : <User size={18} />}
                        </div>
                        <input 
                        type="text" 
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full h-16 bg-gray-50/50 border-2 border-gray-100 focus:border-[#6366f1] focus:bg-white focus:ring-4 focus:ring-indigo-50/50 rounded-2xl pl-14 pr-6 text-sm font-bold transition-all outline-none"
                        placeholder="Email or Client ID"
                        required
                        />
                    </div>
                    </div>

                    <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Password</label>
                        <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-[10px] font-black text-[#6366f1] uppercase hover:underline">Trouble?</button>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#6366f1] transition-colors duration-300">
                        <Lock size={18} />
                        </div>
                        <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-16 bg-gray-50/50 border-2 border-gray-100 focus:border-[#6366f1] focus:bg-white focus:ring-4 focus:ring-indigo-50/50 rounded-2xl pl-14 pr-14 text-sm font-bold transition-all outline-none"
                        placeholder="••••••••"
                        required
                        />
                        <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                        >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                    <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                checked={rememberMe} 
                                onChange={() => setRememberMe(!rememberMe)} 
                                className="sr-only" 
                            />
                            <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${rememberMe ? 'bg-[#6366f1]' : 'bg-gray-200'}`}></div>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${rememberMe ? 'translate-x-5' : ''}`}></div>
                        </div>
                        <span className="ml-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Keep me logged in</span>
                    </label>
                    </div>

                    <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-16 bg-[#1c2d3d] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-gray-200 hover:bg-black transition-all transform active:scale-[0.98] flex items-center justify-center group disabled:opacity-70 disabled:pointer-events-none"
                    >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : 'Log into Identity'}
                    </button>
                </form>

                <div className="my-10 flex items-center space-x-6">
                    <div className="flex-1 h-[1px] bg-gray-100"></div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Alternate Providers</span>
                    <div className="flex-1 h-[1px] bg-gray-100"></div>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-16 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center space-x-4 mb-8 shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                    <span>Continue with Corporate Google</span>
                </button>
              </>
          )}

          {/* FORGOT PASSWORD: EMAIL ENTRY */}
          {view === 'forgot' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => setView('login')} className="flex items-center text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-8 hover:translate-x-[-4px] transition-transform">
                   <ArrowLeft size={16} className="mr-2" /> Back to Login
                </button>
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">Account Recovery</h2>
                    <p className="text-xs font-bold text-gray-400 leading-relaxed">Enter your registered email address to receive a one-time verification code.</p>
                </div>
                
                <div className="space-y-6">
                    {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-[11px] font-bold uppercase flex items-center">
                        <ShieldCheck size={16} className="mr-3" /> {error}
                    </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Corporate Email</label>
                        <input 
                            type="email" 
                            className="w-full h-16 bg-gray-50/50 border-2 border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl px-6 text-sm font-bold outline-none transition-all"
                            placeholder="yourname@vedartha.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={initiateReset}
                        disabled={loading || !resetEmail}
                        className="w-full h-16 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : <><Send size={18} className="mr-3" /> Send Verification Code</>}
                    </button>
                </div>
              </div>
          )}

          {/* FORGOT PASSWORD: OTP ENTRY */}
          {view === 'otp' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => setView('forgot')} className="flex items-center text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-8 hover:translate-x-[-4px] transition-transform">
                   <ArrowLeft size={16} className="mr-2" /> Change Email
                </button>
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">Verify Identity</h2>
                    <p className="text-xs font-bold text-gray-400 leading-relaxed">We sent a 6-digit verification code to <span className="text-gray-900">{resetEmail}</span>. Enter it below.</p>
                </div>

                <div className="space-y-8">
                    {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-[11px] font-bold uppercase flex items-center">
                        <ShieldCheck size={16} className="mr-3" /> {error}
                    </div>
                    )}
                    <div className="flex justify-center">
                        <input 
                            type="text" 
                            maxLength={6}
                            className="w-full h-20 bg-gray-50 border-2 border-gray-100 rounded-3xl text-center text-4xl font-black tracking-[0.5em] focus:border-indigo-600 focus:bg-white outline-none transition-all text-indigo-600"
                            placeholder="000000"
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>
                    <button 
                        onClick={verifyOtp}
                        disabled={enteredOtp.length !== 6}
                        className="w-full h-16 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                        Verify & Continue
                    </button>
                    <p className="text-center text-[10px] font-black text-gray-400 uppercase">
                        Didn't receive code? <button onClick={initiateReset} className="text-indigo-600 hover:underline ml-1">Resend</button>
                    </p>
                </div>
              </div>
          )}

          {/* FORGOT PASSWORD: NEW PASSWORD ENTRY */}
          {view === 'reset' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">New Credentials</h2>
                    <p className="text-xs font-bold text-gray-400 leading-relaxed">Create a new secure password for your account.</p>
                </div>

                <div className="space-y-6">
                    {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-[11px] font-bold uppercase flex items-center">
                        <ShieldCheck size={16} className="mr-3" /> {error}
                    </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="w-full h-16 bg-gray-50/50 border-2 border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl px-6 pr-14 text-sm font-bold outline-none transition-all"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={completeReset}
                        disabled={loading || newPassword.length < 6}
                        className="w-full h-16 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : 'Update Password & Access'}
                    </button>
                </div>
              </div>
          )}

          {/* SUCCESS VIEW */}
          {view === 'success' && (
              <div className="text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-inner">
                      <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-3 uppercase">Reset Complete</h2>
                  <p className="text-xs font-bold text-gray-400 leading-relaxed mb-10 px-6">Your access credentials have been successfully updated. You can now log in securely.</p>
                  <button 
                    onClick={() => setView('login')}
                    className="w-full h-16 bg-[#1c2d3d] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-gray-200 hover:bg-black transition-all"
                  >
                    Proceed to Gateway
                  </button>
              </div>
          )}
          
          <div className="mt-16 text-center">
             <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em] opacity-60">
                {COMPANY_NAME} &copy; {new Date().getFullYear()}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;