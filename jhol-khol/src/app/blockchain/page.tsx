'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import {
  CubeIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Block {
  block_number: number;
  block_hash: string;
  tx_count: number;
  date: string;
  timestamp: number;
  has_anomalies: boolean;
}

interface Transaction {
  tx_hash: string;
  tx_id: string;
  ddo_code: string;
  vendor_id: string;
  amount: number;
  purpose_category: string;
  release_date: string;
  status: string;
  is_anomaly: boolean;
  block_number: number;
}

interface MerkleProof {
  tx_id: string;
  leaf: string;
  proof: string[];
  root: string;
  transaction: any;
  verified: boolean;
  message: string;
}

export default function BlockchainExplorerPage() {
  const [stats, setStats] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [blockTransactions, setBlockTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [merkleProof, setMerkleProof] = useState<MerkleProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProof, setLoadingProof] = useState(false);
  const [page, setPage] = useState(1);
  const [anomalyFilter, setAnomalyFilter] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchBlocks();
  }, [page, anomalyFilter]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/ledger/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const url = `http://localhost:8000/api/ledger/blocks?page=${page}&limit=20&anomaly_only=${anomalyFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setBlocks(data.blocks || []);
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockDetail = async (blockNumber: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/ledger/blocks/${blockNumber}`);
      const data = await res.json();
      setBlockTransactions(data.transactions || []);
      setSelectedBlock(blockNumber);
    } catch (error) {
      console.error('Failed to fetch block detail:', error);
    }
  };

  const generateMerkleProof = async (tx: Transaction) => {
    try {
      setLoadingProof(true);
      setSelectedTx(tx);
      
      const res = await fetch('http://localhost:8000/api/merkle/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_id: tx.tx_id })
      });
      
      const data = await res.json();
      setMerkleProof(data);
    } catch (error) {
      console.error('Failed to generate proof:', error);
    } finally {
      setLoadingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      <div className="max-w-[1800px] mx-auto px-4 py-8 pt-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <CubeIcon className="w-10 h-10 text-blue-400" />
            Blockchain Explorer
          </h1>
          <p className="text-gray-400">
            Cryptographically sealed transaction ledger - Every payment is permanently recorded
          </p>
        </motion.div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Blocks</p>
                  <p className="text-3xl font-black text-blue-400">{stats.total_blocks}</p>
                </div>
                <CubeIcon className="w-12 h-12 text-blue-400/30" />
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-400/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Transactions</p>
                  <p className="text-3xl font-black text-green-400">{stats.total_transactions.toLocaleString()}</p>
                </div>
                <ShieldCheckIcon className="w-12 h-12 text-green-400/30" />
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Anomalies Detected</p>
                  <p className="text-3xl font-black text-red-400">{stats.anomaly_count}</p>
                </div>
                <ExclamationTriangleIcon className="w-12 h-12 text-red-400/30" />
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-400/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Last Block</p>
                  <p className="text-3xl font-black text-purple-400">#{stats.last_block_number}</p>
                </div>
                <ClockIcon className="w-12 h-12 text-purple-400/30" />
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={anomalyFilter}
              onChange={(e) => setAnomalyFilter(e.target.checked)}
              className="w-5 h-5 rounded bg-white/10 border-white/20"
            />
            <span>Show only blocks with anomalies</span>
          </label>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Block List */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-black text-white mb-4">Blocks</h2>
            
            <div className="space-y-2 max-h-[700px] overflow-y-auto">
              {blocks.map((block) => (
                <motion.div
                  key={block.block_number}
                  onClick={() => fetchBlockDetail(block.block_number)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${ 
                    selectedBlock === block.block_number
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-bold">Block #{block.block_number}</p>
                        {block.has_anomalies && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mb-1">
                        {block.block_hash.slice(0, 16)}...{block.block_hash.slice(-8)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{block.tx_count} txns</span>
                        <span>{block.date}</span>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-white">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                Next
              </button>
            </div>
          </div>

          {/* Transactions / Transaction Detail */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            {!selectedTx ? (
              <>
                <h2 className="text-2xl font-black text-white mb-4">
                  {selectedBlock !== null ? `Block #${selectedBlock} Transactions` : 'Select a block'}
                </h2>
                
                <div className="space-y-2 max-h-[700px] overflow-y-auto">
                  {blockTransactions.map((tx) => (
                    <motion.div
                      key={tx.tx_hash}
                      onClick={() => setSelectedTx(tx)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        tx.is_anomaly
                          ? 'border-red-400/50 bg-red-500/10 hover:bg-red-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 font-mono">
                          {tx.tx_hash.slice(0, 12)}...{tx.tx_hash.slice(-8)}
                        </p>
                        {tx.is_anomaly && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                            Anomaly
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">DDO:</span>
                          <span className="text-white ml-1">{tx.ddo_code}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-green-400 ml-1 font-semibold">
                            ₹{(tx.amount / 10000000).toFixed(2)} Cr
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-white">Transaction Detail</h2>
                  <button
                    onClick={() => { setSelectedTx(null); setMerkleProof(null); }}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                    <p className="text-white font-mono text-sm break-all">{selectedTx.tx_hash}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">DDO Code</p>
                      <p className="text-white font-semibold">{selectedTx.ddo_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Vendor ID</p>
                      <p className="text-white font-semibold">{selectedTx.vendor_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Amount</p>
                      <p className="text-green-400 font-bold">
                        ₹{(selectedTx.amount / 10000000).toFixed(2)} Cr
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Category</p>
                      <p className="text-white font-semibold">{selectedTx.purpose_category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Date</p>
                      <p className="text-white font-semibold">{selectedTx.release_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <p className="text-white font-semibold">{selectedTx.status}</p>
                    </div>
                  </div>

                  {selectedTx.is_anomaly && (
                    <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-xl">
                      <p className="text-red-400 font-semibold flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        This transaction is flagged as anomalous
                      </p>
                    </div>
                  )}

                  {!merkleProof ? (
                    <button
                      onClick={() => generateMerkleProof(selectedTx)}
                      disabled={loadingProof}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {loadingProof ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating Proof...
                        </>
                      ) : (
                        <>
                          <ShieldCheckIcon className="w-5 h-5" />
                          Generate Merkle Proof & Verify
                        </>
                      )}
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className={`p-4 rounded-xl border-2 ${
                        merkleProof.verified 
                          ? 'bg-green-500/10 border-green-400' 
                          : 'bg-red-500/10 border-red-400'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {merkleProof.verified ? (
                            <CheckCircleIcon className="w-6 h-6 text-green-400" />
                          ) : (
                            <XCircleIcon className="w-6 h-6 text-red-400" />
                          )}
                          <p className={`font-bold ${
                            merkleProof.verified ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {merkleProof.message}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          This transaction is cryptographically sealed in the Merkle tree.
                          No insertion, deletion, or modification is possible.
                        </p>
                      </div>

                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-xs text-gray-400 mb-2">Merkle Root</p>
                        <p className="text-white font-mono text-xs break-all">{merkleProof.root}</p>
                      </div>

                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-xs text-gray-400 mb-2">Proof Path ({merkleProof.proof.length} hashes)</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {merkleProof.proof.map((hash, i) => (
                            <p key={i} className="text-white font-mono text-xs">
                              {i + 1}. {hash.slice(0, 16)}...{hash.slice(-12)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
