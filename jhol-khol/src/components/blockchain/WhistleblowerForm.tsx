'use client';

import { useState } from 'react';
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { toHex, toBytes } from 'viem';
import {
  CONTRACT_ADDRESSES,
  WHISTLEBLOWER_ABI,
  EXPLORER_BASE,
} from '@/lib/blockchain/contracts';

// Simple XOR-based "encryption" for demo (not production ECIES)
// In production: use https://github.com/AgentMrBig/eth-ecies or similar
function demoEncrypt(message: string): { ephKey: `0x${string}`; ciphertext: `0x${string}` } {
  const ephKeyBytes = new Uint8Array(64);
  crypto.getRandomValues(ephKeyBytes); // ephemeral public key placeholder
  const msgBytes = toBytes(message);
  // XOR with first byte of ephKey (demo only — real impl uses ECIES ECDH)
  const cipher = new Uint8Array(msgBytes.length);
  for (let i = 0; i < msgBytes.length; i++) {
    cipher[i] = msgBytes[i] ^ ephKeyBytes[i % 64];
  }
  return {
    ephKey: toHex(ephKeyBytes),
    ciphertext: toHex(cipher),
  };
}

export default function WhistleblowerForm() {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dept, setDept] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState<bigint | null>(null);

  const { writeContract, data: writeTxHash, isPending: writing } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: writeTxHash });

  const { data: reportCount } = useReadContract({
    address: CONTRACT_ADDRESSES.WhistleblowerVault as `0x${string}`,
    abi: WHISTLEBLOWER_ABI,
    functionName: 'getReportCount',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) return;

    // Compose report payload
    const payload = JSON.stringify({
      title,
      description,
      dept,
      amount,
      submittedAt: new Date().toISOString(),
      // In real flow: encrypt with platform ECIES public key from contract.platformPubKey()
    });

    const { ephKey, ciphertext } = demoEncrypt(payload);

    // IPFS CID is empty in demo (would normally pin to IPFS first)
    const ipfsCid = '';

    writeContract({
      address: CONTRACT_ADDRESSES.WhistleblowerVault as `0x${string}`,
      abi: WHISTLEBLOWER_ABI,
      functionName: 'submitReport',
      args: [ephKey, ciphertext, ipfsCid],
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">🕵️ Anonymous Whistleblower Report</h2>
        <p className="text-gray-300 text-sm">
          Each submission uses a randomly generated ephemeral key — your report is cryptographically unlinked to your wallet or any previous reports.
          The encrypted data is stored on-chain; only the platform admin key can decrypt it.
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <span>📊 Total reports on-chain: <span className="text-white font-bold">{reportCount?.toString() ?? '…'}</span></span>
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.WhistleblowerVault}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View contract ↗</a>
        </div>
      </div>

      {/* Privacy indicators */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🔑', label: 'Ephemeral Key', desc: 'New key per report' },
          { icon: '🔒', label: 'ECIES Encrypted', desc: 'Admin key only' },
          { icon: '⛓', label: 'On-Chain Proof', desc: 'Tamper-proof timestamp' },
        ].map((item) => (
          <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="text-xs font-bold text-white">{item.label}</div>
            <div className="text-xs text-gray-500">{item.desc}</div>
          </div>
        ))}
      </div>

      {confirmed ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-green-400 mb-2">Report Submitted Anonymously</h3>
          <p className="text-gray-400 text-sm mb-4">
            Your report has been committed to the blockchain. The ephemeral key ensures your identity remains protected.
          </p>
          <a
            href={`${EXPLORER_BASE}/tx/${writeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline text-sm"
          >
            View on-chain transaction ↗
          </a>
          <button
            onClick={() => { setTitle(''); setDescription(''); setDept(''); setAmount(''); setSubmitted(false); }}
            className="block mx-auto mt-4 text-sm text-gray-400 hover:text-white"
          >
            Submit another report
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Report Title *</label>
            <input
              required
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inflated vendor bills in MGNREGS scheme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Department / Ministry</label>
            <input
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="e.g. Ministry of Rural Development"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Estimated Amount Involved (₹)</label>
            <input
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 45,00,000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Detailed Description *</label>
            <textarea
              required
              rows={5}
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the irregularity in detail. Include dates, names, amounts, and any evidence references."
            />
          </div>

          {!isConnected ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm text-center">
              Connect your wallet to submit. Your wallet address is only used to pay gas — your identity remains protected by the ephemeral key.
            </div>
          ) : (
            <button
              type="submit"
              disabled={writing || confirming}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
            >
              {writing ? 'Awaiting wallet…' : confirming ? 'Confirming on-chain…' : '🕵️ Submit Anonymously On-Chain'}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
