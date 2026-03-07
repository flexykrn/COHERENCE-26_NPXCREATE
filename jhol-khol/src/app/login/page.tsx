'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const demoAccounts = [
  {
    email: 'state@jhol-khol.gov.in',
    password: 'demo123',
    role: 'State Administrator',
    state: 'Maharashtra',
    description: 'Full state-level access'
  },
  {
    email: 'district@jhol-khol.gov.in',
    password: 'demo123',
    role: 'District Administrator',
    state: 'Maharashtra',
    district: 'Mumbai',
    description: 'District-level access with contractor selection'
  },
  {
    email: 'finance@jhol-khol.gov.in',
    password: 'demo123',
    role: 'Finance Officer',
    state: 'Maharashtra',
    district: 'Pune',
    description: 'View-only access to financial data'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const account = demoAccounts.find(
      acc => acc.email === email && acc.password === password
    );

    if (account) {
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(account));
      
      // Redirect based on role
      if (account.role === 'State Administrator') {
        router.push('/select-department');
      } else if (account.role === 'District Administrator') {
        router.push('/select-department');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError('Invalid credentials. Please use one of the demo accounts below.');
      setLoading(false);
    }
  };

  const quickLogin = (account: typeof demoAccounts[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8">
        {/* Left Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 lg:p-12"
        >
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white mb-2">
              Jhol-Khol
            </h1>
            <p className="text-amber-400 text-lg font-semibold">
              Budget Intelligence Platform
            </p>
            <p className="text-gray-400 mt-2">
              Sign in to access the demo system
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Right Side - Demo Accounts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-black text-white mb-6">
            Demo Accounts
          </h2>
          
          {demoAccounts.map((account, index) => (
            <motion.div
              key={account.email}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-amber-400/50 transition-all duration-300 cursor-pointer"
              onClick={() => quickLogin(account)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {account.role}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {account.description}
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
                  Click to use
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Email:</span>
                  <span className="text-amber-400 font-mono">{account.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Password:</span>
                  <span className="text-amber-400 font-mono">{account.password}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Location:</span>
                  <span className="text-gray-300">
                    {account.state}{account.district ? ` → ${account.district}` : ''}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mt-6">
            <p className="text-blue-300 text-sm">
              <strong>💡 Quick Tip:</strong> Click any demo account card above to auto-fill credentials
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
