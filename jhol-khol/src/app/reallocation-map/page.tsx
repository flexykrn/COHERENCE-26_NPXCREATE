'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import IndiaMap from '@/components/IndiaMap';
import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api/client';
import type { StateData } from '@/data/budgetData';

interface ReallocationSuggestion {
  state: string;
  district: string;
  department: string;
  favorabilityScore: number;
  reasons: string[];
  availableCapacity: number;
  utilization: number;
  suggestedSchemes: {
    name: string;
    category: string;
    needAmount: number;
    utilization: number;
  }[];
  totalTransferAmount: number;
}

export default function ReallocationMapPage() {
  const router = useRouter();
  const [states, setStates] = useState<StateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const [sourceState, setSourceState] = useState<StateData | null>(null);
  const [sourceDistrict, setSourceDistrict] = useState<any>(null);
  const [reallocationAmount, setReallocationAmount] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<ReallocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<ReallocationSuggestion | null>(null);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [showSchemePreview, setShowSchemePreview] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statesRes, schemesRes] = await Promise.all([
          apiClient.getBudgetStates(),
          apiClient.getSchemes()
        ]);
        
        const convertedStates: StateData[] = statesRes.states.map(state => ({
          id: state.id,
          name: state.name,
          allocated: state.allocated,
          spent: state.spent,
          districts: []
        }));
        setStates(convertedStates);
        setSchemes(schemesRes.schemes || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const handleStateSelect = async (state: StateData) => {
    try {
      const stateDetail = await apiClient.getBudgetStateDetail(state.id);
      
      const fullState: StateData = {
        id: stateDetail.id,
        name: stateDetail.name,
        allocated: stateDetail.allocated,
        spent: stateDetail.spent,
        districts: stateDetail.districts.map(d => ({
          id: d.id,
          name: d.name,
          allocated: d.allocated,
          spent: d.spent
        }))
      };
      
      setSelectedState(fullState);
      
      // If we already have a source, show suggestions
      if (sourceState && sourceDistrict) {
        generateSuggestions(fullState);
      }
    } catch (error) {
      console.error('Failed to fetch state details:', error);
    }
  };

  const handleSetSource = (state: StateData, district: any) => {
    setSourceState(state);
    setSourceDistrict(district);
    setReallocationAmount(0);
    setShowSuggestions(false);
    setSelectedDestination(null);
  };

  const generateSuggestions = (targetState: StateData) => {
    // Generate favorability scores for each district based on multiple factors
    const districtSuggestions: ReallocationSuggestion[] = targetState.districts.map(district => {
      const utilization = district.allocated > 0 ? (district.spent / district.allocated) * 100 : 0;
      const availableCapacity = district.allocated - district.spent;
      
      // Favorability scoring (0-100)
      let score = 0;
      const reasons: string[] = [];
      
      // Factor 1: Low utilization means capacity to handle more projects (40 points)
      if (utilization < 70) {
        score += 40;
        reasons.push(`Low utilization (${utilization.toFixed(1)}%) - capacity available`);
      } else if (utilization < 85) {
        score += 25;
        reasons.push(`Moderate utilization (${utilization.toFixed(1)}%)`);
      }
      
      // Factor 2: High available capacity (30 points)
      if (availableCapacity > 50) {
        score += 30;
        reasons.push(`High available capacity (₹${availableCapacity.toFixed(1)} Cr)`);
      } else if (availableCapacity > 20) {
        score += 15;
        reasons.push(`Moderate capacity (₹${availableCapacity.toFixed(1)} Cr)`);
      }
      
      // Factor 3: Historical spending efficiency (30 points)
      // Districts with 60-80% utilization are most efficient
      if (utilization >= 60 && utilization <= 80) {
        score += 30;
        reasons.push('Optimal spending efficiency (60-80% utilization)');
      } else if (utilization >= 50 && utilization < 90) {
        score += 15;
        reasons.push('Good spending track record');
      }
      
      // Bonus: If district is in different state than source (geographical diversification)
      if (targetState.id !== sourceState?.id) {
        score += 10;
        reasons.push('Geographical diversification benefit');
      }
      
      // Find schemes that can utilize the funds (prioritize underfunded schemes)
      const applicableSchemes = schemes
        .filter(scheme => 
          scheme.utilization_pct < 80 && // Schemes with less than 80% utilization
          scheme.status === 'Active' &&
          scheme.unspent_amount_cr > 0
        )
        .slice(0, 3)
        .map(scheme => ({
          name: scheme.scheme_name,
          category: scheme.department,
          needAmount: scheme.unspent_amount_cr,
          utilization: scheme.utilization_pct
        }));
      
      const totalNeed = applicableSchemes.reduce((sum, s) => sum + s.needAmount, 0);
      
      return {
        state: targetState.name,
        district: district.name,
        department: applicableSchemes[0]?.category || 'General',
        favorabilityScore: Math.min(100, score),
        reasons,
        availableCapacity,
        utilization,
        suggestedSchemes: applicableSchemes,
        totalTransferAmount: Math.min(availableCapacity, totalNeed),
      };
    });
    
    // Sort by favorability score
    const sorted = districtSuggestions.sort((a, b) => b.favorabilityScore - a.favorabilityScore);
    setSuggestions(sorted);
    setShowSuggestions(true);
  };

  const handleReallocation = () => {
    if (!sourceState || !sourceDistrict || !selectedDestination) {
      alert('Please select source and destination');
      return;
    }

    const transferAmount = reallocationAmount || selectedDestination.totalTransferAmount;
    
    if (transferAmount <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }

    // Build scheme allocation details
    const schemeDetails = selectedDestination.suggestedSchemes.length > 0
      ? '\n\nFunds will be allocated to:\n' + 
        selectedDestination.suggestedSchemes.map((s, i) => 
          `${i + 1}. ${s.name}\n   Department: ${s.category}\n   Funding Needed: ₹${s.needAmount.toFixed(2)} Cr\n   Current Utilization: ${s.utilization.toFixed(1)}%`
        ).join('\n\n')
      : '';

    // In a real system, this would call an API
    alert(
      `✅ Reallocation Request Submitted\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `FROM:\n` +
      `  State: ${sourceState.name}\n` +
      `  District: ${sourceDistrict.name}\n\n` +
      `TO:\n` +
      `  State: ${selectedDestination.state}\n` +
      `  District: ${selectedDestination.district}\n` +
      `  Department: ${selectedDestination.department}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `TRANSFER DETAILS:\n` +
      `  Amount: ₹${transferAmount.toFixed(2)} Cr\n` +
      `  Favorability Score: ${selectedDestination.favorabilityScore}/100\n` +
      `  Available Capacity: ₹${selectedDestination.availableCapacity.toFixed(2)} Cr\n` +
      `${schemeDetails}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Status: Pending approval from Finance Ministry\n` +
      `Expected Processing: 2-3 business days`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      <div className="max-w-[1800px] mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <ArrowsRightLeftIcon className="w-10 h-10 text-amber-400" />
            Budget Reallocation Map
          </h1>
          <p className="text-gray-400">
            AI-powered reallocation suggestions based on capacity, utilization, and efficiency
          </p>
        </motion.div>

        {/* Reallocation Flow Steps */}
        <div className="mb-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border-2 ${sourceState ? 'border-green-500 bg-green-500/20' : 'border-gray-500 bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${sourceState ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  1
                </div>
                <h3 className="text-white font-bold">Select Source</h3>
              </div>
              <p className="text-gray-400 text-sm">
                {sourceState && sourceDistrict 
                  ? `${sourceState.name} - ${sourceDistrict.name}` 
                  : 'Click on a state and district to set as source'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border-2 ${showSuggestions ? 'border-blue-500 bg-blue-500/20' : 'border-gray-500 bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${showSuggestions ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}>
                  2
                </div>
                <h3 className="text-white font-bold">View Suggestions</h3>
              </div>
              <p className="text-gray-400 text-sm">
                {showSuggestions 
                  ? `${suggestions.length} favorable destinations found` 
                  : 'AI will analyze and suggest optimal destinations'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border-2 ${selectedDestination ? 'border-amber-500 bg-amber-500/20' : 'border-gray-500 bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${selectedDestination ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'}`}>
                  3
                </div>
                <h3 className="text-white font-bold">Confirm Reallocation</h3>
              </div>
              <p className="text-gray-400 text-sm">
                {selectedDestination 
                  ? `To: ${selectedDestination.district}` 
                  : 'Select destination and confirm transfer'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h2 className="text-2xl font-black text-white mb-4">Select State</h2>
              <IndiaMap 
                states={states} 
                onStateSelect={handleStateSelect}
                selectedStateId={selectedState?.id}
              />
            </div>

            {/* District Selection */}
            {selectedState && selectedState.districts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
              >
                <h2 className="text-2xl font-black text-white mb-4">
                  Districts in {selectedState.name}
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedState.districts.map((district) => {
                    const utilization = district.allocated > 0 ? (district.spent / district.allocated) * 100 : 0;
                    const isSource = sourceDistrict?.id === district.id;
                    
                    return (
                      <div
                        key={district.id}
                        onClick={() => {
                          if (!sourceState || !sourceDistrict) {
                            handleSetSource(selectedState, district);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSource
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-white/20 bg-white/5 hover:border-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-bold">{district.name}</h3>
                          {isSource && (
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Utilization:</span>
                          <span className={`font-bold ${
                            utilization > 90 ? 'text-red-400' :
                            utilization > 70 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Available:</span>
                          <span className="text-white font-bold">
                            ₹{(district.allocated - district.spent).toFixed(1)} Cr
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Suggestions Panel */}
          <div className="lg:col-span-1">
            {!showSuggestions ? (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-black text-white">AI Suggestions</h2>
                </div>
                <div className="text-center py-12">
                  <MapPinIcon className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-20" />
                  <p className="text-gray-400">Select a source district to see AI-powered reallocation suggestions</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-2xl p-6 sticky top-4">
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-black text-white">
                    Top {suggestions.length} Destinations
                  </h2>
                </div>

                {sourceState && sourceDistrict && (
                  <div className="mb-4 p-3 bg-white/10 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Reallocating from:</p>
                    <p className="text-white font-bold">{sourceState.name} - {sourceDistrict.name}</p>
                  </div>
                )}

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setSelectedDestination(suggestion);
                        setShowSchemePreview(true);
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedDestination?.district === suggestion.district
                          ? 'border-amber-400 bg-amber-500/20'
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-sm mb-1">
                            {suggestion.district}
                          </h3>
                          <p className="text-xs text-gray-400">{suggestion.state}</p>
                          <p className="text-xs text-blue-400 font-semibold mt-1">
                            📋 {suggestion.department}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          suggestion.favorabilityScore >= 80 ? 'bg-green-500 text-white' :
                          suggestion.favorabilityScore >= 60 ? 'bg-yellow-500 text-white' :
                          'bg-orange-500 text-white'
                        }`}>
                          {suggestion.favorabilityScore}/100
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {suggestion.reasons.slice(0, 2).map((reason, i) => (
                          <p key={i} className="text-xs text-gray-300">
                            ✓ {reason}
                          </p>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-gray-400">Available:</span>
                          <span className="block font-bold text-green-400">
                            ₹{suggestion.availableCapacity.toFixed(1)} Cr
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Can Transfer:</span>
                          <span className="block font-bold text-amber-400">
                            ₹{suggestion.totalTransferAmount.toFixed(1)} Cr
                          </span>
                        </div>
                      </div>

                      {suggestion.suggestedSchemes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <p className="text-xs text-gray-400 mb-1">Schemes needing funds:</p>
                          <div className="space-y-1">
                            {suggestion.suggestedSchemes.slice(0, 2).map((scheme, i) => (
                              <div key={i} className="text-xs">
                                <span className="text-white">• {scheme.name.slice(0, 30)}...</span>
                                <span className="text-amber-400 ml-1">(₹{scheme.needAmount.toFixed(1)} Cr needed)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {selectedDestination && showSchemePreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl"
                  >
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-blue-400" />
                      Transfer Preview
                    </h3>
                    
                    <div className="space-y-2 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">From:</span>
                        <span className="text-white font-semibold">{sourceState?.name} - {sourceDistrict?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">To:</span>
                        <span className="text-white font-semibold">{selectedDestination.state} - {selectedDestination.district}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Department:</span>
                        <span className="text-blue-400 font-semibold">{selectedDestination.department}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2">
                        <span className="text-gray-400">Amount to Transfer:</span>
                        <span className="text-amber-400 font-bold">₹{reallocationAmount || selectedDestination.totalTransferAmount.toFixed(1)} Cr</span>
                      </div>
                    </div>

                    {selectedDestination.suggestedSchemes.length > 0 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs mb-2">Funds will be utilized by:</p>
                        <div className="space-y-1">
                          {selectedDestination.suggestedSchemes.map((scheme, i) => (
                            <div key={i} className="bg-white/5 p-2 rounded text-xs">
                              <div className="flex justify-between items-start">
                                <span className="text-white font-semibold">{scheme.name}</span>
                                <span className="text-xs text-gray-400">{scheme.utilization.toFixed(0)}% utilized</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-gray-400">{scheme.category}</span>
                                <span className="text-green-400 font-semibold">₹{scheme.needAmount.toFixed(1)} Cr</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <input
                      type="number"
                      value={reallocationAmount}
                      onChange={(e) => setReallocationAmount(parseFloat(e.target.value) || 0)}
                      placeholder={`Suggested: ₹${selectedDestination.totalTransferAmount.toFixed(1)} Cr`}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none text-sm mb-3"
                    />

                    <button
                      onClick={handleReallocation}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <ArrowRightIcon className="w-5 h-5" />
                      Confirm Transfer of ₹{reallocationAmount || selectedDestination.totalTransferAmount.toFixed(1)} Cr
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
