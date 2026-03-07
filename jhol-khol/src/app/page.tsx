'use client';

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChartBarIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  UserGroupIcon,
  ArrowRightIcon,
  LockClosedIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

export default function LandingPage() {
  const features = [
    {
      icon: ChartBarIcon,
      title: "Budget Tracking",
      description: "Real-time monitoring of government fund allocation and utilization",
    },
    {
      icon: CubeIcon,
      title: "Blockchain Verified",
      description: "Cryptographically sealed transactions ensure complete transparency",
    },
    {
      icon: ShieldCheckIcon,
      title: "Fraud Detection",
      description: "AI-powered anomaly detection identifies suspicious patterns instantly",
    },
    {
      icon: DocumentMagnifyingGlassIcon,
      title: "Detailed Reports",
      description: "Comprehensive analytics and audit trails for every rupee spent",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/parliament-building.jpg"
            alt="Parliament Building"
            fill
            priority
            className="object-cover object-center"
            quality={95}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/80 via-gray-900/85 to-gray-900/90"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.15),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-32">
          <div className="text-center space-y-12">
            {/* Logo/Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-lg">JK</span>
              </div>
              <span className="text-white font-bold text-lg">Jhol Khol</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </motion.div>
            
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <h1 className="text-6xl md:text-8xl font-black leading-tight">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-100 to-amber-300 drop-shadow-2xl">
                  Government Budget
                </span>
                <span className="block text-white drop-shadow-2xl mt-2">
                  Intelligence Platform
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Blockchain-secured transparency system for tracking public funds, 
                detecting fraud, and ensuring accountability in government spending
              </p>
            </motion.div>
            
            {/* CTA Button - Login */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Link 
                href="/login"
                className="group relative inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg rounded-2xl font-black overflow-hidden shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <LockClosedIcon className="relative w-6 h-6 mr-3" />
                <span className="relative">Access Platform</span>
                <ArrowRightIcon className="relative h-6 w-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto pt-12"
            >
              {[
                { value: "860", label: "Blockchain Blocks" },
                { value: "43K+", label: "Transactions Sealed" },
                { value: "₹21K Cr", label: "Budget Tracked" },
                { value: "100%", label: "Transparency" },
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-105 transition-all duration-300"
                >
                  <div className="text-4xl font-black text-amber-400 mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-400 font-semibold">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-gray-400 text-sm font-semibold">Scroll to explore</span>
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-3 bg-white/50 rounded-full animate-bounce"></div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-black text-white mb-4">
              Powered by Advanced Technology
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Combining AI, blockchain, and data analytics for unprecedented transparency
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-amber-400/50 transition-all duration-300 hover:scale-105"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-red-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent_70%)]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-black text-white mb-6">
                Cryptographically Secured Transactions
              </h2>
              <p className="text-xl text-amber-100 mb-8">
                Every transaction is sealed on the blockchain using Merkle tree verification, 
                making fraud and tampering mathematically impossible.
              </p>
              <ul className="space-y-4">
                {[
                  "OpenZeppelin-compatible Merkle proofs",
                  "Immutable transaction history",
                  "Real-time anomaly detection using AI",
                  "Complete audit trail for every rupee"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-white">
                    <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/20">
                    <span className="text-white font-bold">System Status</span>
                    <span className="px-4 py-1 bg-green-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Operational
                    </span>
                  </div>
                  {[
                    { label: "Blockchain Blocks", value: "860", status: "✓" },
                    { label: "Verified Transactions", value: "43,004", status: "✓" },
                    { label: "Security Score", value: "99.9%", status: "✓" },
                    { label: "Uptime", value: "99.99%", status: "✓" },
                  ].map((stat, index) => (
                    <div key={index} className="flex items-center justify-between py-4 border-b border-white/10">
                      <span className="text-gray-300">{stat.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold text-lg">{stat.value}</span>
                        <span className="text-green-400 text-xl">{stat.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.1),transparent_70%)]"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Ready to Access the Platform?
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Login with your government credentials to access the full budget intelligence dashboard
            </p>
            <Link 
              href="/login"
              className="group inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg rounded-2xl font-black hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:scale-105"
            >
              <LockClosedIcon className="w-6 h-6 mr-3" />
              Login to Dashboard
              <ArrowRightIcon className="h-6 w-6 ml-3 group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black">JK</span>
              </div>
              <span className="text-white font-bold text-lg">Jhol Khol</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2026 Jhol Khol. Government Budget Intelligence Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
