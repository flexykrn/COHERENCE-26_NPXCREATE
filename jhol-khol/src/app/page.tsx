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

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data.data))
      .catch(err => console.error(err));
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section with Parliament Building */}
      <section className="relative pt-20 pb-32 overflow-hidden min-h-screen flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/parliament-building.jpg"
            alt="Parliament Building"
            fill
            priority
            className="object-cover object-center"
            quality={90}
          />
          {/* Gradient Overlays for readability and theme */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 via-purple-900/90 to-blue-800/95 dark:from-blue-950/98 dark:via-purple-950/95 dark:to-blue-900/98"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-950/50"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                <span className="text-white font-semibold text-sm drop-shadow-lg">
                  🇮🇳 Transparency • Accountability • Progress
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl">
                  Jhol Khol
                </span>
                <br />
                <span className="text-white drop-shadow-2xl">
                  Expose the Truth
                </span>
              </h1>
              
              <p className="text-xl text-gray-100 leading-relaxed drop-shadow-lg">
                Empowering citizens with transparency in government schemes. 
                Track public funds, report irregularities, and ensure accountability 
                in governance.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/schemes"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-white text-blue-900 rounded-full font-semibold hover:bg-amber-400 hover:text-blue-950 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                >
                  Explore Schemes
                  <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/reports"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/50 backdrop-blur-sm bg-white/10 text-white rounded-full font-semibold hover:bg-white hover:text-blue-900 hover:border-white transition-all duration-300 transform hover:-translate-y-1"
                >
                  Report Issue
                </Link>
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-2 gap-4 pt-8">
                  <div className="bg-white/20 backdrop-blur-md border border-white/30 p-6 rounded-xl hover:bg-white/30 transition-all duration-300">
                    <div className="text-3xl font-bold text-amber-300 drop-shadow-lg">
                      {stats.activeSchemes}
                    </div>
                    <div className="text-sm text-gray-100 font-semibold">Active Schemes</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md border border-white/30 p-6 rounded-xl hover:bg-white/30 transition-all duration-300">
                    <div className="text-3xl font-bold text-amber-300 drop-shadow-lg">
                      {stats.complaintsResolved}
                    </div>
                    <div className="text-sm text-gray-100 font-semibold">Issues Resolved</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Content - Floating Card */}
            <div className="relative lg:block hidden">
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="h-7 w-7 text-blue-900" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Verified Platform</h3>
                      <p className="text-gray-300 text-sm">100% Transparent Data</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/20 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-amber-300 text-2xl font-bold">157</p>
                        <p className="text-gray-200 text-xs">Total Schemes</p>
                      </div>
                      <div>
                        <p className="text-amber-300 text-2xl font-bold">95.5Cr</p>
                        <p className="text-gray-200 text-xs">Beneficiaries</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/20 pt-4">
                    <p className="text-gray-100 text-sm italic">
                      "Transparency is the foundation of democracy"
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative glow effects */}
              <div className="absolute top-0 -right-4 w-40 h-40 bg-amber-400/30 rounded-full filter blur-3xl"></div>
              <div className="absolute bottom-0 -left-4 w-40 h-40 bg-blue-400/30 rounded-full filter blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How Jhol Khol Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Four powerful tools for transparent governance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Impact</h2>
            <p className="text-xl text-blue-100">Making a difference in governance transparency</p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.totalSchemes}</div>
                <div className="text-blue-100">Total Schemes Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.budgetAllocated}</div>
                <div className="text-blue-100">Budget Monitored</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.beneficiaries}</div>
                <div className="text-blue-100">Lives Impacted</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{stats.transparencyScore}%</div>
                <div className="text-blue-100">Transparency Score</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of citizens working towards a transparent and accountable government.
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg rounded-full font-semibold hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            Get Started Now
            <ArrowRightIcon className="ml-3 h-6 w-6" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
