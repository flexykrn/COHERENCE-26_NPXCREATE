'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Budget Map', href: '/budget-dashboard' },
    { name: 'Timeline', href: '/financial-timeline' },
    { name: 'Blockchain', href: '/blockchain' },
    { name: 'Reallocation', href: '/reallocation-map' },
    { name: 'Schemes', href: '/schemes' },
    { name: 'Reports', href: '/reports' },
    { name: 'About', href: '/about' },
  ];

  return (
    <>
      {/* Floating Glassmorphic Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50">
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30">
          <div className="px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <span className="text-white font-black text-xl">JK</span>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-lg"></div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-2xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                    Jhol Khol
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold -mt-1">
                    Expose Truth
                  </div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="relative px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-300 rounded-xl hover:bg-white/40 dark:hover:bg-gray-800/40 group"
                  >
                    {item.name}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 group-hover:w-3/4 transition-all duration-300"></span>
                  </Link>
                ))}
                <button className="ml-3 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105">
                  Report Issue
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2.5 rounded-xl bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Bars3Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/20 dark:border-gray-700/30">
              <div className="px-6 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-500/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <button className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-2xl shadow-lg">
                  Report Issue
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer to prevent content from going under navbar */}
      <div className="h-28"></div>
    </>
  );
}
