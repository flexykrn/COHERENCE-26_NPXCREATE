'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  CubeIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  CubeTransparentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const API = 'http://localhost:8000';
const HOODI_EXPLORER = 'https://hoodi.etherscan.io';
const ROLLUP_CONTRACT = '0x44880567cA570a3F3F1D3deBCD76eE04279F68b4';

// ── Types ─────────────────────────────────────────────────────────────────────
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
  in_batch: boolean;
  batch_id: number | null;
  verified: boolean;
  message: string;
}

// ── Etherscan Dashboard Section ───────────────────────────────────────────────
function EtherscanDashboard({ stats }: { stats: any }) {
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const lastPage = stats ? Math.ceil(stats.total_blocks / 6) : 1;
      const [br, tr] = await Promise.all([
        fetch(`${API}/api/ledger/blocks?page=${lastPage}&limit=6`).then((r) => r.json()),
        fetch(`${API}/api/ledger/search?limit=8`).then((r) => r.json()),
      ]);
      setRecentBlocks((br.blocks ?? []).reverse());
      setRecentTxs(tr.results ?? []);
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => { if (stats) load(); }, [load, stats]);
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const fmtAmt = (n: number) =>
    '₹' + (n / 10_000_000).toFixed(2) + ' Cr';

  return (
    <div className="mb-10">
      {/* Live badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Live — auto-refresh every 30s</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500 text-xs">Last: {lastRefresh.toLocaleTimeString()}</span>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Blocks */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-blue-400" />
              Latest Blocks
            </h3>
            <span className="text-xs text-gray-500">
              {stats?.total_blocks?.toLocaleString() ?? '—'} total
            </span>
          </div>

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 animate-pulse">
                <div className="w-10 h-10 bg-white/5 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-2/3" />
                </div>
              </div>
            ))
          ) : (
            recentBlocks.map((b) => (
              <div key={b.block_number} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center flex-shrink-0">
                  <CubeIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-semibold text-sm">#{b.block_number}</span>
                    {b.has_anomalies && (
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                  <p className="text-gray-500 text-xs font-mono truncate">
                    {b.block_hash.slice(0, 18)}…{b.block_hash.slice(-6)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-xs font-medium">{b.tx_count} txns</p>
                  <p className="text-gray-600 text-xs">{b.date?.slice(0, 10)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-400" />
              Latest Transactions
            </h3>
            <span className="text-xs text-gray-500">
              {stats?.total_transactions?.toLocaleString() ?? '—'} total
            </span>
          </div>

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 animate-pulse">
                <div className="w-10 h-10 bg-white/5 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-2 bg-white/5 rounded w-3/4" />
                </div>
              </div>
            ))
          ) : (
            recentTxs.map((tx) => (
              <div key={tx.tx_hash} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 text-[10px] font-bold">TX</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-400 text-xs font-mono truncate">
                    {tx.tx_hash.slice(0, 14)}…{tx.tx_hash.slice(-8)}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {tx.ddo_code} → {tx.vendor_id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-400 text-xs font-semibold">{fmtAmt(tx.amount)}</p>
                  {tx.is_anomaly && (
                    <span className="text-red-400 text-[10px]">⚠ anomaly</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Navigation cards */}
      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <a
          href="#explorer"
          className="group flex items-center justify-between bg-blue-500/10 border border-blue-400/30 hover:border-blue-400/60 rounded-2xl px-6 py-4 transition-all duration-300"
        >
          <div>
            <p className="text-white font-semibold">Explore Blocks & Transactions</p>
            <p className="text-gray-400 text-sm mt-0.5">Browse blocks, verify Merkle proofs on Hoodi</p>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
        </a>
        <Link
          href="/blockchain/rollup"
          className="group flex items-center justify-between bg-purple-500/10 border border-purple-400/30 hover:border-purple-400/60 rounded-2xl px-6 py-4 transition-all duration-300"
        >
          <div>
            <p className="text-white font-semibold">Rollup Batches</p>
            <p className="text-gray-400 text-sm mt-0.5">Create batches, verify transactions, submit to Hoodi</p>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BlockchainExplorerPage() {
  const [stats, setStats] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [blockTransactions, setBlockTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [merkleProof, setMerkleProof] = useState<MerkleProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProof, setLoadingProof] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [page, setPage] = useState(1);
  const [anomalyFilter, setAnomalyFilter] = useState(false);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const explorerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/ledger/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [page, anomalyFilter]);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const url = `${API}/api/ledger/blocks?page=${page}&limit=20&anomaly_only=${anomalyFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setBlocks(data.blocks ?? []);
      setTotalBlocks(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockDetail = async (blockNumber: number) => {
    if (selectedBlock === blockNumber) {
      setSelectedBlock(null);
      setBlockTransactions([]);
      setSelectedTx(null);
      setMerkleProof(null);
      return;
    }
    setLoadingBlock(true);
    setSelectedTx(null);
    setMerkleProof(null);
    try {
      const res = await fetch(`${API}/api/ledger/blocks/${blockNumber}`);
      const data = await res.json();
      setBlockTransactions(data.transactions ?? []);
      setSelectedBlock(blockNumber);
    } finally {
      setLoadingBlock(false);
    }
  };

  const generateMerkleProof = async (tx: Transaction) => {
    setLoadingProof(true);
    setSelectedTx(tx);
    setMerkleProof(null);
    try {
      const res = await fetch(`${API}/api/merkle/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_id: tx.tx_id }),
      });
      const data = await res.json();
      setMerkleProof(data);
    } finally {
      setLoadingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />

      <div className="max-w-[1800px] mx-auto px-4 py-8 pt-28">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                <CubeTransparentIcon className="w-10 h-10 text-blue-400" />
                Blockchain Explorer
              </h1>
              <p className="text-gray-400">Cryptographically sealed transaction ledger</p>
            </div>
            {/* Chain badge */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-medium">Hoodi Testnet</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500 text-xs">Chain ID 560048</span>
              </div>
              <a
                href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 font-mono"
              >
                {ROLLUP_CONTRACT.slice(0, 10)}…{ROLLUP_CONTRACT.slice(-6)} ↗
              </a>
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Total Blocks', value: stats.total_blocks?.toLocaleString(), color: 'blue', Icon: CubeIcon },
              { label: 'Total Transactions', value: stats.total_transactions?.toLocaleString(), color: 'green', Icon: ShieldCheckIcon },
              { label: 'Anomalies Detected', value: stats.anomaly_count?.toLocaleString(), color: 'red', Icon: ExclamationTriangleIcon },
              { label: 'Last Block', value: `#${stats.last_block_number}`, color: 'purple', Icon: ClockIcon },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className={`bg-${color}-500/10 border border-${color}-400/30 rounded-2xl p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{label}</p>
                    <p className={`text-3xl font-black text-${color}-400`}>{value}</p>
                  </div>
                  <Icon className={`w-12 h-12 text-${color}-400/30`} />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Etherscan Live Dashboard ── */}
        <EtherscanDashboard stats={stats} />

        {/* ── Block Explorer ── */}
        <div id="explorer" ref={explorerRef} className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <h2 className="text-white font-bold text-lg flex items-center gap-2 px-4">
              <CubeIcon className="w-5 h-5 text-blue-400" />
              Block Explorer
            </h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Filter */}
          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anomalyFilter}
                onChange={(e) => { setAnomalyFilter(e.target.checked); setPage(1); }}
                className="w-5 h-5 rounded bg-white/10 border-white/20 accent-red-500"
              />
              <span>Show only blocks with anomalies</span>
            </label>
            <span className="text-gray-500 text-sm">
              {totalBlocks.toLocaleString()} blocks
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Block List */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h2 className="text-2xl font-black text-white mb-4">Blocks</h2>

              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 animate-pulse h-16" />
                  ))
                ) : (
                  blocks.map((block) => (
                    <motion.div
                      key={block.block_number}
                      onClick={() => fetchBlockDetail(block.block_number)}
                      layout
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedBlock === block.block_number
                          ? 'border-blue-400 bg-blue-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-bold">Block #{block.block_number}</p>
                            {block.has_anomalies && (
                              <ExclamationTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate mb-1">
                            {block.block_hash.slice(0, 16)}…{block.block_hash.slice(-8)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>{block.tx_count} txns</span>
                            <span>{block.date?.slice(0, 10)}</span>
                          </div>
                        </div>
                        <ChevronRightIcon
                          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                            selectedBlock === block.block_number ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 hover:bg-white/20 transition-colors"
                >
                  Previous
                </button>
                <span className="text-white">
                  Page {page} / {Math.ceil(totalBlocks / 20) || 1}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= totalBlocks}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 hover:bg-white/20 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Transactions / Transaction Detail */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <AnimatePresence mode="wait">
                {!selectedTx ? (
                  <motion.div
                    key="txlist"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h2 className="text-2xl font-black text-white mb-4">
                      {loadingBlock
                        ? 'Loading transactions…'
                        : selectedBlock !== null
                        ? `Block #${selectedBlock} Transactions`
                        : 'Select a block →'}
                    </h2>

                    {loadingBlock ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/5 animate-pulse h-14 mb-2" />
                      ))
                    ) : (
                      <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                        {blockTransactions.map((tx) => (
                          <motion.div
                            key={tx.tx_hash}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => { setSelectedTx(tx); setMerkleProof(null); }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              tx.is_anomaly
                                ? 'border-red-400/50 bg-red-500/10 hover:bg-red-500/20'
                                : 'border-white/10 bg-white/5 hover:border-white/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400 font-mono">
                                {tx.tx_hash.slice(0, 12)}…{tx.tx_hash.slice(-8)}
                              </p>
                              {tx.is_anomaly && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                                  Anomaly
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400">DDO: </span>
                                <span className="text-white">{tx.ddo_code}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Amount: </span>
                                <span className="text-green-400 font-semibold">
                                  ₹{(tx.amount / 10_000_000).toFixed(2)} Cr
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="txdetail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-black text-white">Transaction Detail</h2>
                      <button
                        onClick={() => { setSelectedTx(null); setMerkleProof(null); }}
                        className="text-gray-400 hover:text-white text-xl leading-none"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto max-h-[680px] pr-1">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                        <p className="text-white font-mono text-sm break-all">{selectedTx.tx_hash}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {[
                          ['DDO Code', selectedTx.ddo_code],
                          ['Vendor ID', selectedTx.vendor_id],
                          ['Category', selectedTx.purpose_category],
                          ['Status', selectedTx.status],
                          ['Date', selectedTx.release_date],
                          ['Block', `#${selectedTx.block_number}`],
                        ].map(([lbl, val]) => (
                          <div key={lbl}>
                            <p className="text-xs text-gray-400 mb-1">{lbl}</p>
                            <p className="text-white font-semibold">{val}</p>
                          </div>
                        ))}
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400 mb-1">Amount</p>
                          <p className="text-green-400 font-bold text-xl">
                            ₹{(selectedTx.amount / 10_000_000).toFixed(2)} Cr
                          </p>
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

                      {/* Merkle Proof */}
                      {!merkleProof ? (
                        <button
                          onClick={() => generateMerkleProof(selectedTx)}
                          disabled={loadingProof}
                          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loadingProof ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Generating Proof…
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
                          {/* Proof status */}
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
                              <p className={`font-bold ${merkleProof.verified ? 'text-green-400' : 'text-red-400'}`}>
                                {merkleProof.message || (merkleProof.verified ? 'Verified on Merkle tree' : 'Not verified')}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400">
                              This transaction is cryptographically sealed. No insertion, deletion, or modification is possible.
                            </p>
                          </div>

                          {/* Hoodi Explorer link - shown when verified and in a batch */}
                          {merkleProof.verified && merkleProof.in_batch && (
                            <a
                              href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/40 rounded-xl hover:border-blue-400/80 transition-all group"
                            >
                              <div>
                                <p className="text-white font-semibold text-sm">View on Hoodi Block Explorer</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  Batch #{merkleProof.batch_id} · MerkleRegistry contract
                                </p>
                              </div>
                              <ArrowRightIcon className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                            </a>
                          )}

                          {/* Not in batch yet */}
                          {merkleProof.verified && !merkleProof.in_batch && (
                            <Link
                              href="/blockchain/rollup"
                              className="flex items-center justify-between w-full p-4 bg-purple-500/10 border border-purple-400/30 hover:border-purple-400/60 rounded-xl transition-all group"
                            >
                              <div>
                                <p className="text-white font-semibold text-sm">Not yet submitted to Hoodi</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  Go to Rollup Batches to create a batch and submit to Hoodi
                                </p>
                              </div>
                              <ArrowRightIcon className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                          )}

                          {/* Merkle root */}
                          <div className="p-4 bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-400 mb-2">Merkle Root</p>
                            <p className="text-white font-mono text-xs break-all">{merkleProof.root}</p>
                          </div>

                          {/* Proof path */}
                          {merkleProof.proof.length > 0 && (
                            <div className="p-4 bg-white/5 rounded-xl">
                              <p className="text-xs text-gray-400 mb-2">
                                Proof Path ({merkleProof.proof.length} hashes)
                              </p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {merkleProof.proof.map((hash, i) => (
                                  <p key={i} className="text-white font-mono text-xs">
                                    {i + 1}. {hash.slice(0, 16)}…{hash.slice(-12)}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
