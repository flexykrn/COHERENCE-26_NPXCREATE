'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import {
  CubeIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface Batch {
  batch_id: string;
  merkle_root: string;
  transaction_count: number;
  created_at: string;
  status: 'pending' | 'submitted' | 'verified';
  contract_batch_index: number | null;
  tx_hash: string | null;
}

interface BatchDetail extends Batch {
  transactions: Array<{
    tx_id: string;
    ddo_code: string;
    vendor_id: string;
    amount: number;
    category: string;
    date: string;
    leaf_hash: string;
  }>;
  proofs: Record<string, string[]>;
  start_block: number | null;
  end_block: number | null;
}

export default function BatchManagementPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Form states
  const [startBlock, setStartBlock] = useState('1');
  const [endBlock, setEndBlock] = useState('100');
  const [batchSize, setBatchSize] = useState('50');
  const [selectedTxId, setSelectedTxId] = useState('');

  useEffect(() => {
    fetchStats();
    fetchBatches();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/batches/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/batches/list');
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetail = async (batchId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/batches/${batchId}`);
      const data = await res.json();
      setSelectedBatch(data);
    } catch (error) {
      console.error('Failed to fetch batch detail:', error);
    }
  };

  const createBatch = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/batches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_block: parseInt(startBlock),
          end_block: parseInt(endBlock),
          batch_size: parseInt(batchSize),
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create batch');
      
      const data = await res.json();
      alert(`Batch created successfully!\nBatch ID: ${data.batch_id}\nMerkle Root: ${data.merkle_root}`);
      
      setCreateModalOpen(false);
      fetchBatches();
      fetchStats();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const verifyTransaction = async () => {
    if (!selectedBatch) return;
    
    try {
      const res = await fetch(
        `http://localhost:8000/api/batches/${selectedBatch.batch_id}/verify?tx_id=${selectedTxId}`
      );
      
      if (!res.ok) throw new Error('Verification failed');
      
      const data = await res.json();
      setVerificationResult(data);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'submitted': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'verified': return 'bg-green-500/20 text-green-400 border-green-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

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
            <CubeIcon className="w-10 h-10 text-blue-400" />
            Merkle Batch Management
          </h1>
          <p className="text-gray-400">
            Create, submit, and verify transaction batches for rollup submission
          </p>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <CubeIcon className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Total Batches</span>
              </div>
              <p className="text-3xl font-black text-white">{stats.total_batches}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-400 text-sm">Pending</span>
              </div>
              <p className="text-3xl font-black text-yellow-400">{stats.pending_batches}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpTrayIcon className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Submitted</span>
              </div>
              <p className="text-3xl font-black text-blue-400">{stats.submitted_batches}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Verified</span>
              </div>
              <p className="text-3xl font-black text-green-400">{stats.verified_batches}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create New Batch
          </button>
          
          {selectedBatch && (
            <button
              onClick={() => setVerifyModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center gap-2"
            >
              <DocumentCheckIcon className="w-5 h-5" />
              Verify Transaction
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Batches List */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-black text-white mb-4">Batches</h2>
            
            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : batches.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No batches created yet</p>
              ) : (
                batches.map((batch) => (
                  <motion.div
                    key={batch.batch_id}
                    onClick={() => fetchBatchDetail(batch.batch_id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedBatch?.batch_id === batch.batch_id
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-bold text-sm">{batch.batch_id}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(batch.status)}`}>
                        {batch.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-400 font-mono mb-2">
                      Root: {batch.merkle_root.slice(0, 16)}...{batch.merkle_root.slice(-8)}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div>
                        <span className="text-gray-500">Transactions:</span>
                        <span className="text-white ml-1 font-semibold">{batch.transaction_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="text-white ml-1">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {batch.tx_hash && (
                      <p className="text-xs text-green-400 mt-2 font-mono">
                        TX: {batch.tx_hash.slice(0, 12)}...
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Batch Detail */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            {!selectedBatch ? (
              <div className="text-center py-20">
                <CubeIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a batch to view details</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-white">Batch Details</h2>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Batch Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Batch ID</p>
                      <p className="text-white font-semibold text-sm">{selectedBatch.batch_id}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${getStatusColor(selectedBatch.status)}`}>
                        {selectedBatch.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">Merkle Root</p>
                    <p className="text-white font-mono text-xs break-all">{selectedBatch.merkle_root}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <p className="text-2xl font-black text-blue-400">
                        {selectedBatch.transaction_count}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Transactions</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                      <p className="text-2xl font-black text-purple-400">
                        {selectedBatch.start_block || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Start Block</p>
                    </div>
                    <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl">
                      <p className="text-2xl font-black text-pink-400">
                        {selectedBatch.end_block || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">End Block</p>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div>
                    <h3 className="text-lg font-black text-white mb-3">Transactions</h3>
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-900">
                          <tr className="text-left text-gray-400 text-xs border-b border-white/10">
                            <th className="pb-2">TX ID</th>
                            <th className="pb-2">DDO</th>
                            <th className="pb-2">Amount</th>
                            <th className="pb-2">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBatch.transactions.map((tx) => (
                            <tr
                              key={tx.tx_id}
                              className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                              onClick={() => {
                                setSelectedTxId(tx.tx_id);
                                setVerifyModalOpen(true);
                              }}
                            >
                              <td className="py-2 text-blue-400 font-mono">{tx.tx_id}</td>
                              <td className="py-2 text-white">{tx.ddo_code}</td>
                              <td className="py-2 text-green-400 font-semibold">
                                ₹{tx.amount.toFixed(2)}
                              </td>
                              <td className="py-2 text-gray-400 text-xs">{tx.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Create Batch Modal */}
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setCreateModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border-2 border-blue-400 rounded-2xl p-8 max-w-md w-full"
            >
              <h2 className="text-2xl font-black text-white mb-6">Create New Batch</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Start Block</label>
                  <input
                    type="number"
                    value={startBlock}
                    onChange={(e) => setStartBlock(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="1"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">End Block</label>
                  <input
                    type="number"
                    value={endBlock}
                    onChange={(e) => setEndBlock(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="100"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Batch Size (max transactions)</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={createBatch}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                >
                  Create Batch
                </button>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Verify Transaction Modal */}
        {verifyModalOpen && selectedBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => { setVerifyModalOpen(false); setVerificationResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border-2 border-green-400 rounded-2xl p-8 max-w-2xl w-full"
            >
              <h2 className="text-2xl font-black text-white mb-6">Verify Transaction</h2>
              
              {!verificationResult ? (
                <>
                  <div className="mb-6">
                    <label className="text-sm text-gray-400 mb-2 block">Transaction ID</label>
                    <select
                      value={selectedTxId}
                      onChange={(e) => setSelectedTxId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option value="">Select a transaction...</option>
                      {selectedBatch.transactions.map((tx) => (
                        <option key={tx.tx_id} value={tx.tx_id}>
                          TX #{tx.tx_id} - {tx.ddo_code} - ₹{tx.amount.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={verifyTransaction}
                      disabled={!selectedTxId}
                      className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify Transaction
                    </button>
                    <button
                      onClick={() => setVerifyModalOpen(false)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className={`p-4 rounded-xl border-2 ${
                    verificationResult.valid
                      ? 'bg-green-500/10 border-green-400'
                      : 'bg-red-500/10 border-red-400'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {verificationResult.valid ? (
                        <CheckCircleIcon className="w-8 h-8 text-green-400" />
                      ) : (
                        <XCircleIcon className="w-8 h-8 text-red-400" />
                      )}
                      <p className={`text-xl font-bold ${
                        verificationResult.valid ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {verificationResult.valid ? 'Verification Successful!' : 'Verification Failed'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {verificationResult.valid 
                        ? 'Transaction is cryptographically verified as part of this batch.'
                        : 'Transaction could not be verified against this batch root.'}
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">Transaction Leaf</p>
                    <p className="text-white font-mono text-xs break-all">{verificationResult.leaf}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">Merkle Root</p>
                    <p className="text-white font-mono text-xs break-all">{verificationResult.root}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">Proof Path ({verificationResult.proof.length} hashes)</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {verificationResult.proof.map((hash: string, i: number) => (
                        <p key={i} className="text-white font-mono text-xs">
                          {i + 1}. {hash}
                        </p>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setVerifyModalOpen(false);
                      setVerificationResult(null);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
