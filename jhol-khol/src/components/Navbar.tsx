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
    { name: 'Analytics', href: '/analytics/lapse-risk' },
    { name: 'Schemes', href: '/schemes' },
    { name: 'Reports', href: '/reports' },
    { name: 'About', href: '/about' },
  ];

  return (
    <nav className="fixed w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl shadow-lg border-b border-gray-200/50 dark:border-gray-800/50 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo with Modern Design */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <span className="text-white font-black text-xl">JK</span>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-lg"></div>
            </div>
            <div>
              <span className="text-2xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Jhol Khol
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold -mt-1">
                Expose Truth
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-semibold group"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </Link>
            ))}
            <button className="ml-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/50 transition-all duration-300 font-semibold hover:scale-105">
              Report Issue
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

      {/* Mobile menu with Glass Morphism */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-800/50">
          <div className="px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-5 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 hover:text-amber-600 dark:hover:text-amber-400 font-semibold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <button className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg">
              Report Issue
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
