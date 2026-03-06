'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ChartBarIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setStatsLoading(true);
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data.data || null);
        setStatsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setStats(null);
        setStatsLoading(false);
      });
  }, []);

  const features = [
    {
      icon: ChartBarIcon,
      title: "Track Government Schemes",
      description: "Monitor progress and budget allocation of public welfare programs in real-time",
    },
    {
      icon: DocumentMagnifyingGlassIcon,
      title: "Report Irregularities",
      description: "Expose corruption and misuse of public funds with evidence-based reporting",
    },
    {
      icon: ShieldCheckIcon,
      title: "Verified Data",
      description: "Access authenticated government data and official scheme documentation",
    },
    {
      icon: UserGroupIcon,
      title: "Community Driven",
      description: "Join thousands of citizens working towards transparent governance",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      {/* Hero Section with Parliament Building Background */}
      <section className="relative pt-20 pb-20 overflow-hidden min-h-screen flex items-center">
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
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/70 via-amber-800/65 to-red-900/70"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.2),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Badge with Glass Morphism */}
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold text-sm tracking-wide">
                  🇮🇳 Transparency • Accountability • Progress
                </span>
              </div>
              
              {/* Main Heading with Modern Typography */}
              <div className="space-y-4">
                <h1 className="text-6xl md:text-8xl font-black leading-tight tracking-tight">
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-100 to-amber-300 drop-shadow-2xl">
                    Jhol Khol
                  </span>
                  <span className="block text-white drop-shadow-2xl mt-2">
                    Expose Truth
                  </span>
                </h1>
              </div>
              
              {/* Description with Glass Card */}
              <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-6 border border-white/20 shadow-2xl">
                <p className="text-lg text-gray-100 leading-relaxed">
                  Empowering citizens with transparency in government schemes. 
                  Track public funds, report irregularities, and ensure accountability 
                  in governance.
                </p>
              </div>
              
              {/* Modern CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/budget-dashboard"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 rounded-2xl font-bold overflow-hidden shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative flex items-center gap-2">
                    View Budget Map
                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link 
                  href="/schemes"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-xl border-2 border-white/30 text-white rounded-2xl font-bold hover:bg-white/20 hover:border-white/50 transition-all duration-300 shadow-xl"
                >
                  Explore Schemes
                </Link>
                <Link 
                  href="/reports"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-xl border-2 border-white/30 text-white rounded-2xl font-bold hover:bg-white/20 hover:border-white/50 transition-all duration-300 shadow-xl"
                >
                  Report Issue
                </Link>
              </div>

              {/* Stats with Glass Morphism */}
              {stats && (
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="group relative bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <div className="text-4xl font-black text-amber-300 drop-shadow-lg mb-1">
                        {stats.activeSchemes}
                      </div>
                      <div className="text-sm text-gray-200 font-semibold">Active Schemes</div>
                    </div>
                  </div>
                  <div className="group relative bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <div className="text-4xl font-black text-amber-300 drop-shadow-lg mb-1">
                        {stats.complaintsResolved}
                      </div>
                      <div className="text-sm text-gray-200 font-semibold">Issues Resolved</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Content - Floating Glass Card */}
            <div className="relative lg:block hidden">
              {/* Main Glass Card */}
              <div className="relative bg-white/10 backdrop-blur-3xl border border-white/30 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-700">
                {/* Decorative glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                
                <div className="relative space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4 pb-6 border-b border-white/20">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
                      <CheckCircleIcon className="h-9 w-9 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-2xl">Verified Platform</h3>
                      <p className="text-amber-200 text-sm font-medium">100% Transparent Data</p>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                      <p className="text-amber-300 text-3xl font-black mb-1">157</p>
                      <p className="text-gray-200 text-xs font-semibold">Total Schemes</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                      <p className="text-amber-300 text-3xl font-black mb-1">95.5Cr</p>
                      <p className="text-gray-200 text-xs font-semibold">Beneficiaries</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                      <p className="text-amber-300 text-3xl font-black mb-1">₹15.4L Cr</p>
                      <p className="text-gray-200 text-xs font-semibold">Budget Tracked</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                      <p className="text-amber-300 text-3xl font-black mb-1">82%</p>
                      <p className="text-gray-200 text-xs font-semibold">Transparency</p>
                    </div>
                  </div>
                  
                  {/* Quote */}
                  <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                    <p className="text-gray-100 text-sm italic leading-relaxed">
                      "Transparency is the foundation of democracy and good governance"
                    </p>
                    <p className="text-amber-300 text-xs font-semibold mt-2">— Indian Constitution</p>
                  </div>
                </div>
              </div>
              
              {/* Floating elements for depth */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-400/20 rounded-full filter blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-500/20 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Glass Morphism */}
      <section className="py-32 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-3xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.1),transparent_70%)]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-block px-6 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-xl rounded-full border border-amber-500/30 mb-6">
              <span className="text-amber-800 dark:text-amber-300 font-bold text-sm">HOW IT WORKS</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6">
              Four Powerful Tools
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              For transparent governance and accountability
            </p>
          </div>

          {/* Features Grid with Glass Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl rounded-3xl p-8 border border-gray-200/50 dark:border-gray-700/50 hover:border-amber-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/10 group-hover:to-orange-500/10 rounded-3xl transition-all duration-500"></div>
                
                <div className="relative">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section with Modern Glass Design */}
      <section className="relative py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-red-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.3),transparent_50%)]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-4">Our Impact</h2>
            <p className="text-xl text-amber-100">Making a difference in governance transparency</p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: stats.totalSchemes, label: "Total Schemes Tracked", icon: "📊" },
                { value: stats.budgetAllocated, label: "Budget Monitored", icon: "💰" },
                { value: stats.beneficiaries, label: "Lives Impacted", icon: "👥" },
                { value: `${stats.transparencyScore}%`, label: "Transparency Score", icon: "⚖️" }
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="group relative bg-white/10 backdrop-blur-2xl border border-white/30 rounded-3xl p-8 hover:bg-white/20 hover:scale-105 transition-all duration-500 shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative text-center">
                    <div className="text-4xl mb-4">{stat.icon}</div>
                    <div className="text-5xl font-black text-white mb-3">{stat.value}</div>
                    <div className="text-amber-100 font-semibold">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section with Glass Morphism */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl rounded-[3rem] p-16 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl text-center">
            {/* Decorative elements */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/30 rounded-full filter blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-500/30 rounded-full filter blur-3xl"></div>
            
            <div className="relative">
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6">
                Ready to Make a Difference?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                Join thousands of citizens working towards a transparent and accountable government.
              </p>
              <Link 
                href="/dashboard"
                className="group inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg rounded-2xl font-bold hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-3">Get Started Now</span>
                <ArrowRightIcon className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
