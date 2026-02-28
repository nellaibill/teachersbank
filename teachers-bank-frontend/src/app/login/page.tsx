'use client';
import { useState } from 'react';
import { GraduationCap, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-lg overflow-hidden">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-ink-900 to-brand-800 px-8 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              Teachers Bank
            </h1>
            <p className="text-white/60 text-sm mt-1">Management System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-ink-900 font-semibold text-lg mb-1">Welcome back</h2>
            <p className="text-ink-500 text-sm mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 animate-slide-up">
                <Lock size={14} className="text-rose-500 flex-shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    className="form-input pl-9"
                    placeholder="admin@teachersbank.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="form-input pl-9 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary btn w-full mt-2">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                  : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-ink-400 mt-6">
              Default: admin@teachersbank.com / Admin@123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
