'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  CubeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

const API = 'http://localhost:8000';
const HOODI_EXPLORER = 'https://hoodi.etherscan.io';
const ROLLUP_CONTRACT = '0x44880567cA570a3F3F1D3deBCD76eE04279F68b4';

interface BatchTx {
  tx_id: string;
  leaf: string;
  ddo_code: string;
  vendor_id: string;
  amount: number;
  purpose_category: string;
  release_date: string;
  status: string;
}

interface Batch {
  batch_id: number;
  root: string;
  tx_count: number;
  created_at: string;
  label: string;
  submitted_to_hoodi: boolean;
  tx_hash?: string | null;
  transactions?: BatchTx[];
  proofs?: Record<string, string[]>;
}

export default function RollupPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [unbatched, setUnbatched] = useState<{ total: number; batched: number; unbatched: number } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<Batch | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'submitting' | 'done' | 'error'>('idle');
  const [latestTxHash, setLatestTxHash] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(50);
  const [verifyResults, setVerifyResults] = useState<Record<string, { verified: boolean; message: string }>>({});
  const [verifyLoading, setVerifyLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [br, ur] = await Promise.all([
      fetch(`${API}/api/merkle/batches`).then((r) => r.json()),
      fetch(`${API}/api/merkle/unbatched-count`).then((r) => r.json()),
    ]);
    setBatches(br.batches ?? []);
    setUnbatched(ur);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createBatch = async () => {
    setCreating(true);
    setCreateStatus('creating');
    setLatestTxHash(null);
    try {
      // Step 1: create batch locally
      const createRes = await fetch(`${API}/api/merkle/batches/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: batchSize }),
      });
      const created = await createRes.json();
      const newBatchId: number = created.batch_id;

      // Step 2: immediately submit Merkle root to Hoodi on-chain
      setCreateStatus('submitting');
      const submitRes = await fetch(`${API}/api/merkle/batches/${newBatchId}/submit`, {
        method: 'POST',
      });
      const submitted = await submitRes.json();

      setLatestTxHash(submitted.tx_hash ?? null);
      setCreateStatus('done');
      await refresh();

      // Open Etherscan — TX page if we got a hash, else contract page
      const etherscanUrl = submitted.tx_hash
        ? `${HOODI_EXPLORER}/tx/${submitted.tx_hash}`
        : `${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`;
      window.open(etherscanUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setCreateStatus('error');
    } finally {
      setCreating(false);
    }
  };

  const expandBatch = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      setVerifyResults({});
      return;
    }
    setExpandedId(id);
    setExpandedData(null);
    setVerifyResults({});
    const r = await fetch(`${API}/api/merkle/batches/${id}`);
    const d: Batch = await r.json();
    setExpandedData(d);
  };

  const verifyTx = async (batchId: number, tx: BatchTx) => {
    const proof = expandedData?.proofs?.[tx.tx_id] ?? [];
    setVerifyLoading(tx.tx_id);
    try {
      const r = await fetch(`${API}/api/merkle/batches/${batchId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaf: tx.leaf, proof }),
      });
      const d = await r.json();
      setVerifyResults((p) => ({ ...p, [tx.tx_id]: { verified: d.verified, message: d.message } }));
    } finally {
      setVerifyLoading(null);
    }
  };

  const submitBatch = async (batchId: number) => {
    setSubmitting(batchId);
    try {
      await fetch(`${API}/api/merkle/batches/${batchId}/submit`, { method: 'POST' });
      await refresh();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8 pt-28">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            href="/blockchain"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Block Explorer
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                <CubeIcon className="w-10 h-10 text-purple-400" />
                Rollup Batches
              </h1>
              <p className="text-gray-400">
                Seal transactions in Merkle batches and submit roots to Hoodi MerkleRegistry
              </p>
            </div>
            <a
              href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm bg-purple-500/10 border border-purple-400/30 hover:border-purple-400/60 rounded-xl px-4 py-2.5 text-purple-400 hover:text-purple-300 transition-all"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              MerkleRegistry on Hoodi
            </a>
          </div>
        </motion.div>

        {/* How it works */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {[
            { step: '1', title: 'Create Batch', desc: 'Transactions are hashed into a Merkle tree. Each leaf = keccak256 of tx fields.', color: 'blue' },
            { step: '2', title: 'Verify Transaction', desc: 'Prove any transaction belongs to the batch using its Merkle proof path.', color: 'green' },
            { step: '3', title: 'Submit to Hoodi', desc: 'Batch root is submitted to MerkleRegistry on Hoodi — immutable on-chain.', color: 'purple' },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className={`bg-${color}-500/10 border border-${color}-400/20 rounded-2xl p-5`}>
              <div className={`text-${color}-400 text-3xl font-black mb-2`}>{step}</div>
              <p className="text-white font-semibold mb-1">{title}</p>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>

        {/* Create controls */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="text-white font-bold mb-1">Available Transactions</p>
              {unbatched ? (
                <p className="text-sm text-gray-400">
                  <span className="text-white font-semibold">{unbatched.unbatched.toLocaleString()}</span> unbatched ·{' '}
                  <span className="text-green-400 font-semibold">{unbatched.batched.toLocaleString()}</span> sealed ·{' '}
                  <span className="text-gray-500">{unbatched.total.toLocaleString()} total</span>
                </p>
              ) : (
                <div className="h-4 bg-white/5 rounded w-48 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm whitespace-nowrap">Batch size</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-24 bg-white/5 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400"
                />
              </div>
              <button
                onClick={createBatch}
                disabled={creating || (unbatched?.unbatched ?? 0) === 0}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
              >
                {createStatus === 'creating' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Building Merkle tree…
                  </span>
                ) : createStatus === 'submitting' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting to Hoodi…
                  </span>
                ) : (
                  '⛓ Create & Submit to Hoodi'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TX success / error banner */}
        {createStatus === 'done' && (
          <div className="mb-5 p-4 bg-green-500/10 border border-green-400/30 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-green-400 font-semibold">Batch created &amp; Merkle root submitted to Hoodi!</p>
              {latestTxHash ? (
                <p className="font-mono text-xs text-gray-400 truncate mt-0.5">
                  TX: {latestTxHash}
                </p>
              ) : (
                <p className="text-xs text-amber-400 mt-0.5">On-chain TX pending — check PRIVATE_KEY in .env</p>
              )}
            </div>
            {latestTxHash && (
              <a
                href={`${HOODI_EXPLORER}/tx/${latestTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 shrink-0 bg-green-600/20 hover:bg-green-600/40 border border-green-500/40 text-green-400 hover:text-green-300 text-sm px-4 py-2 rounded-xl font-semibold transition-all"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                View TX on Etherscan
              </a>
            )}
          </div>
        )}
        {createStatus === 'error' && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-400/30 rounded-2xl flex items-center gap-3">
            <XCircleIcon className="w-6 h-6 text-red-400 shrink-0" />
            <p className="text-red-400">Failed to create batch. Check the backend logs.</p>
          </div>
        )}

        {/* Batch list */}
        {batches.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-lg">No batches yet</p>
            <p className="text-sm mt-1">Create your first rollup batch above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...batches].reverse().map((b) => (
              <motion.div
                key={b.batch_id}
                layout
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden"
              >
                {/* Batch header */}
                <div
                  className="flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => expandBatch(b.batch_id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="text-white font-bold">{b.label}</span>
                      {b.submitted_to_hoodi ? (
                        <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          On-chain (Hoodi)
                        </span>
                      ) : (
                        <span className="bg-white/10 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                          Local only
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-gray-500 text-xs truncate">Root: {b.root}</p>
                    {b.tx_hash && (
                      <a
                        href={`${HOODI_EXPLORER}/tx/${b.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-blue-400 hover:text-blue-300 text-xs truncate block"
                      >
                        TX: {b.tx_hash.slice(0, 18)}…{b.tx_hash.slice(-8)} ↗
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white text-sm font-semibold">{b.tx_count} txns</p>
                    <p className="text-gray-500 text-xs">{b.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className="text-gray-500 text-lg select-none">
                    {expandedId === b.batch_id ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {expandedId === b.batch_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/10 px-6 py-5 space-y-4">
                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3">
                          {b.tx_hash ? (
                            <a
                              href={`${HOODI_EXPLORER}/tx/${b.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/40 hover:border-green-400 text-green-400 hover:text-green-300 text-sm px-5 py-2.5 rounded-xl font-semibold transition-all"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              View TX on Hoodi Etherscan
                            </a>
                          ) : b.submitted_to_hoodi ? (
                            <a
                              href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:text-blue-300 text-sm px-5 py-2.5 rounded-xl font-semibold transition-all"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              View on Hoodi Etherscan
                            </a>
                          ) : (
                            <button
                              onClick={() => submitBatch(b.batch_id)}
                              disabled={submitting === b.batch_id}
                              className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 text-sm px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50"
                            >
                              {submitting === b.batch_id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  Submitting to Hoodi…
                                </>
                              ) : (
                                <>
                                  <ShieldCheckIcon className="w-4 h-4" />
                                  Submit to Hoodi
                                </>
                              )}
                            </button>
                          )}
                          <a
                            href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 border border-white/20 hover:border-white/40 text-gray-400 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-all"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            MerkleRegistry Contract
                          </a>
                        </div>

                        {/* Merkle root */}
                        <div className="bg-black/30 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1.5">Merkle Root (submitted on-chain)</p>
                          <p className="font-mono text-blue-300 text-sm break-all">{b.root}</p>
                        </div>

                        {/* Transaction table */}
                        {expandedData ? (
                          <div className="rounded-xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-white/5 text-gray-400 text-xs">
                                    <th className="px-4 py-3 text-left font-medium">TX ID</th>
                                    <th className="px-4 py-3 text-left font-medium">DDO</th>
                                    <th className="px-4 py-3 text-left font-medium">Vendor</th>
                                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                                    <th className="px-4 py-3 text-left font-medium">Category</th>
                                    <th className="px-4 py-3 text-left font-medium">Leaf</th>
                                    <th className="px-4 py-3 text-center font-medium">Verify</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {(expandedData.transactions ?? []).map((tx) => {
                                    const vr = verifyResults[tx.tx_id];
                                    return (
                                      <tr
                                        key={tx.tx_id}
                                        className={`transition-colors ${
                                          vr?.verified
                                            ? 'bg-green-500/5'
                                            : vr
                                            ? 'bg-red-500/5'
                                            : 'hover:bg-white/3'
                                        }`}
                                      >
                                        <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap text-xs">
                                          {tx.tx_id}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap text-xs">
                                          {tx.ddo_code}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap text-xs">
                                          {tx.vendor_id}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-400 font-mono whitespace-nowrap text-xs font-semibold">
                                          ₹{(tx.amount / 10_000_000).toFixed(2)} Cr
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                                          {tx.purpose_category}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-blue-400 whitespace-nowrap text-xs">
                                          {tx.leaf.slice(0, 10)}…{tx.leaf.slice(-6)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          {vr ? (
                                            <div className="flex flex-col items-center gap-1">
                                              {vr.verified ? (
                                                <>
                                                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                                  <a
                                                    href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 text-[10px] underline"
                                                    title={vr.message}
                                                  >
                                                    Hoodi ↗
                                                  </a>
                                                </>
                                              ) : (
                                                <XCircleIcon className="w-5 h-5 text-red-400" title={vr.message} />
                                              )}
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => verifyTx(b.batch_id, tx)}
                                              disabled={verifyLoading === tx.tx_id}
                                              className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                            >
                                              {verifyLoading === tx.tx_id ? (
                                                <div className="w-3.5 h-3.5 border border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                                              ) : (
                                                'Verify'
                                              )}
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Verify all banner */}
                            {Object.keys(verifyResults).length > 0 && (
                              <div className="bg-white/3 border-t border-white/10 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3 text-sm">
                                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                                  <span className="text-white">
                                    {Object.values(verifyResults).filter((v) => v.verified).length} verified
                                  </span>
                                  {Object.values(verifyResults).some((v) => !v.verified) && (
                                    <>
                                      <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                                      <span className="text-red-400">
                                        {Object.values(verifyResults).filter((v) => !v.verified).length} failed
                                      </span>
                                    </>
                                  )}
                                </div>
                                {Object.values(verifyResults).every((v) => v.verified) && (
                                  <a
                                    href={`${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold"
                                  >
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                    All verified — View on Hoodi Explorer
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
