'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { keccak256, toBytes, toHex, encodePacked } from 'viem';
import {
  CONTRACT_ADDRESSES,
  MERKLE_REGISTRY_ABI,
  EXPLORER_BASE,
} from '@/lib/blockchain/contracts';

// ── Helpers matching the Solidity buildLeaf() ──────────────────────────────
function toBytes32(s: string): `0x${string}` {
  const src = toBytes(s.slice(0, 32));
  const padded = new Uint8Array(32);
  padded.set(src);
  return toHex(padded);
}

function buildLeafHash(ddoId: string, vendorId: string, amountPaise: bigint, timestamp: bigint, category: string): `0x${string}` {
  return keccak256(
    encodePacked(
      ['bytes32', 'bytes32', 'uint256', 'uint256', 'bytes32'],
      [toBytes32(ddoId), toBytes32(vendorId), amountPaise, timestamp, toBytes32(category)]
    )
  );
}

export default function MerkleVerifier() {
  const [ministry, setMinistry] = useState('EDUCATION');
  const [ddoId, setDdoId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [txDate, setTxDate] = useState('');
  const [category, setCategory] = useState('SALARY');
  const [proofInput, setProofInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<null | boolean>(null);
  const [computedLeaf, setComputedLeaf] = useState('');

  const ministryId = keccak256(toBytes(ministry.toUpperCase()));

  const { data: latestRoot, isLoading: rootLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MerkleRegistry as `0x${string}`,
    abi: MERKLE_REGISTRY_ABI,
    functionName: 'latestRoot',
    args: [ministryId],
  });

  const { data: rootCount } = useReadContract({
    address: CONTRACT_ADDRESSES.MerkleRegistry as `0x${string}`,
    abi: MERKLE_REGISTRY_ABI,
    functionName: 'getRootCount',
    args: [ministryId],
  });

  function handleComputeLeaf() {
    if (!ddoId || !vendorId || !amount || !txDate) return;
    const timestamp = BigInt(Math.floor(new Date(txDate).getTime() / 1000));
    const amountPaise = BigInt(Math.round(parseFloat(amount) * 100));
    const leaf = buildLeafHash(ddoId, vendorId, amountPaise, timestamp, category);
    setComputedLeaf(leaf);
  }

  function handleVerify() {
    if (!computedLeaf || !proofInput || !latestRoot) return;
    try {
      const proofArr = JSON.parse(proofInput) as `0x${string}`[];
      // Client-side Merkle verification using the same algorithm
      let computed: `0x${string}` = computedLeaf as `0x${string}`;
      for (const p of proofArr) {
        const [a, b] = computed < p ? [computed, p] : [p, computed];
        computed = keccak256(encodePacked(['bytes32', 'bytes32'], [a, b]));
      }
      setVerifyResult(computed === latestRoot);
    } catch {
      setVerifyResult(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">🌳 Merkle Transaction Verifier</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter a transaction's details to compute its leaf hash, then verify it against the ministry's on-chain Merkle root.
          A valid proof means the transaction is cryptographically committed and cannot be backdated.
        </p>

        {/* Ministry selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 mb-1">Ministry / Department</label>
          <input
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            value={ministry}
            onChange={(e) => setMinistry(e.target.value.toUpperCase())}
            placeholder="e.g. EDUCATION"
          />
        </div>

        {/* On-chain root display */}
        <div className="bg-black/30 rounded-xl p-4 mb-5 border border-white/5">
          <div className="text-xs text-gray-400 mb-1">Latest on-chain Merkle root for <span className="text-amber-400">{ministry}</span></div>
          {rootLoading ? (
            <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
          ) : (
            <>
              <code className="text-green-400 text-xs break-all">{latestRoot && latestRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? latestRoot : 'No root submitted yet'}</code>
              <div className="text-xs text-gray-500 mt-1">{rootCount !== undefined ? `${rootCount} batch(es) submitted` : ''}</div>
            </>
          )}
          <a
            href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.MerkleRegistry}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-2 inline-block"
          >
            View contract on Etherscan ↗
          </a>
        </div>

        {/* Transaction details */}
        <h3 className="text-sm font-bold text-gray-300 mb-3">Step 1 — Compute leaf hash</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'DDO ID', state: ddoId, set: setDdoId, placeholder: 'e.g. DDO-MH-001' },
            { label: 'Vendor ID', state: vendorId, set: setVendorId, placeholder: 'e.g. VND-0042' },
            { label: 'Amount (₹)', state: amount, set: setAmount, placeholder: 'e.g. 150000' },
            { label: 'Category', state: category, set: setCategory, placeholder: 'SALARY' },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-400 mb-1">{f.label}</label>
              <input
                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={f.state}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 mb-1">Transaction Date</label>
          <input
            type="date"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
          />
        </div>
        <button
          onClick={handleComputeLeaf}
          className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 rounded-xl font-semibold text-sm transition-colors"
        >
          Compute Leaf Hash
        </button>
        {computedLeaf && (
          <div className="mt-3 bg-black/30 rounded-xl p-3 border border-white/5">
            <div className="text-xs text-gray-400 mb-1">Computed leaf</div>
            <code className="text-amber-300 text-xs break-all">{computedLeaf}</code>
          </div>
        )}

        {/* Proof input */}
        {computedLeaf && (
          <>
            <h3 className="text-sm font-bold text-gray-300 mt-5 mb-3">Step 2 — Paste Merkle proof</h3>
            <p className="text-xs text-gray-500 mb-2">
              Paste the proof array from <code className="text-amber-400">backend/blockchain/merkle-proofs/{ministry}.json</code>
            </p>
            <textarea
              className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-mono h-24 focus:outline-none focus:border-amber-500 resize-none"
              value={proofInput}
              onChange={(e) => setProofInput(e.target.value)}
              placeholder='["0xabc...", "0xdef..."]'
            />
            <button
              onClick={handleVerify}
              className="mt-3 w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
            >
              Verify On-Chain
            </button>
            {verifyResult !== null && (
              <div className={`mt-4 p-4 rounded-xl border font-bold text-center ${verifyResult ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                {verifyResult
                  ? '✅ Verified — Transaction exists in the on-chain Merkle tree. Cannot be backdated.'
                  : '❌ Invalid — Proof does not match the on-chain root. Transaction may be tampered.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
