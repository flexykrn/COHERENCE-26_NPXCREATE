'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { parseEther, keccak256, toBytes } from 'viem';
import { apiClient } from '@/lib/api';
import type { ReallocationSuggestion } from '@/lib/api/types';
import {
  CONTRACT_ADDRESSES,
  MULTISIG_ABI,
  ROLE_REGISTRY_ABI,
  ROLES,
  EXPLORER_BASE,
} from '@/lib/blockchain/contracts';

const THRESHOLD = 3;

/** Derive a deterministic address from a dept_id — on-chain identifier for departments */
function deptIdToAddress(deptId: number): `0x${string}` {
  return `0x${deptId.toString(16).padStart(40, '0')}` as `0x${string}`;
}

/** Encode a reallocation suggestion as a bytes32 reference fingerprint */
function suggestionRef(s: ReallocationSuggestion): `0x${string}` {
  return keccak256(
    toBytes(`${s.from_dept_id}:${s.to_dept_id}:${Math.round(s.transfer_amount_cr * 100)}`)
  );
}

export default function MultiSigPanel() {
  const { address, isConnected } = useAccount();
  const [suggestions, setSuggestions] = useState<ReallocationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    apiClient.getReallocation()
      .then(res => setSuggestions(res.suggestions ?? []))
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, []);

  // Caller role
  const { data: roleRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.RoleRegistry as `0x${string}`,
    abi: ROLE_REGISTRY_ABI,
    functionName: 'getRole',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });
  const role = roleRaw !== undefined ? Number(roleRaw) : 0;
  const isAuditor = role >= 2;
  const isAdmin = role === 3;

  // Proposal count
  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESSES.MultiSigReallocation as `0x${string}`,
    abi: MULTISIG_ABI,
    functionName: 'proposalCount',
  });
  const count = proposalCount ? Number(proposalCount) : 0;

  // Create proposal form
  const [fromDept, setFromDept] = useState('');
  const [toDept, setToDept] = useState('');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');

  // Sign form
  const [signId, setSignId] = useState('');

  // Execute form
  const [execId, setExecId] = useState('');

  // Proposal lookup
  const [lookupId, setLookupId] = useState('');
  const [searchId, setSearchId] = useState<bigint | undefined>(undefined);

  const { data: proposalBasics } = useReadContract({
    address: CONTRACT_ADDRESSES.MultiSigReallocation as `0x${string}`,
    abi: MULTISIG_ABI,
    functionName: 'getProposalBasics',
    args: [searchId as bigint],
    query: { enabled: searchId !== undefined },
  });

  // EIP-712 signing
  const { signTypedData, isPending: signing } = useSignTypedData();

  const { writeContract, data: writeTxHash, isPending: writing, reset: resetWrite } = useWriteContract();
  const [pendingAction, setPendingAction] = useState<'propose' | 'sign' | 'execute' | null>(null);
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: writeTxHash,
    onConfirmed: () => refetchCount(),
  } as Parameters<typeof useWaitForTransactionReceipt>[0]);

  function proposeReallocation() {
    if (!fromDept || !toDept || !amount || !ref) return;
    setPendingAction('propose');
    writeContract({
      address: CONTRACT_ADDRESSES.MultiSigReallocation as `0x${string}`,
      abi: MULTISIG_ABI,
      functionName: 'proposeReallocation',
      args: [
        fromDept as `0x${string}`,
        toDept as `0x${string}`,
        parseEther(amount),
        ref as `0x${string}`,
      ],
    });
  }

  async function signProposal() {
    if (!signId || !address) return;
    const id = BigInt(signId);

    // Read the digest from the contract (EIP-712 pre-hash)
    // For demo: use signTypedData directly with the correct domain + type
    // In production the frontend would fetch domain from contract and build the typed data
    signTypedData(
      {
        domain: {
          name: 'MultiSigReallocation',
          version: '1',
          chainId: 560048,
          verifyingContract: CONTRACT_ADDRESSES.MultiSigReallocation as `0x${string}`,
        },
        types: {
          Reallocation: [
            { name: 'proposalId', type: 'uint256' },
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'ref', type: 'bytes32' },
          ],
        },
        primaryType: 'Reallocation',
        message: {
          proposalId: id,
          from: (proposalBasics as readonly unknown[] | undefined)?.[0] as `0x${string}` ?? '0x0000000000000000000000000000000000000000' as `0x${string}`,
          to: (proposalBasics as readonly unknown[] | undefined)?.[1] as `0x${string}` ?? '0x0000000000000000000000000000000000000000' as `0x${string}`,
          amount: (proposalBasics as readonly unknown[] | undefined)?.[2] as bigint ?? 0n,
          ref: (proposalBasics as readonly unknown[] | undefined)?.[3] as `0x${string}` ?? '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        },
      },
      {
        onSuccess: (sig) => {
          setPendingAction('sign');
          writeContract({
            address: CONTRACT_ADDRESSES.MultiSigReallocation as `0x${string}`,
            abi: MULTISIG_ABI,
            functionName: 'signProposal',
            args: [id, sig],
          });
        },
      },
    );
  }

  function executeProposal() {
    if (!execId) return;
    setPendingAction('execute');
    writeContract({
      address: CONTRACT_ADDRESSES.MultiSigReallocation as `0x${string}`,
      abi: MULTISIG_ABI,
      functionName: 'executeReallocation',
      args: [BigInt(execId)],
    });
  }

  const isBusy = writing || confirming || signing;

  // Parse proposal basics
  let proposal: { from: string; to: string; amount: bigint; ref: string; sigCount: bigint; executed: boolean } | null = null;
  if (Array.isArray(proposalBasics) && proposalBasics.length >= 6) {
    proposal = {
      from: proposalBasics[0] as string,
      to: proposalBasics[1] as string,
      amount: proposalBasics[2] as bigint,
      ref: proposalBasics[3] as string,
      sigCount: proposalBasics[4] as bigint,
      executed: proposalBasics[5] as boolean,
    };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">✍️ Multi-Sig Budget Reallocation</h2>
        <p className="text-gray-300 text-sm">
          Budget reallocations require {THRESHOLD} EIP-712 signatures from different auditors before execution. This prevents any single actor from unilaterally moving funds.
        </p>
        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span>Total proposals: <span className="text-white font-bold">{count}</span></span>
          <span>Required signatures: <span className="text-cyan-400 font-bold">{THRESHOLD}</span></span>
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.MultiSigReallocation}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View contract ↗</a>
        </div>
      </div>

      {/* Flow steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: '1', label: 'Propose', desc: 'Admin creates a reallocation proposal with from/to/amount' },
          { step: '2', label: 'Sign (×3)', desc: `${THRESHOLD}x auditors sign the EIP-712 typed data off-chain` },
          { step: '3', label: 'Execute', desc: 'Anyone submits the execution once threshold is met' },
        ].map((s) => (
          <div key={s.step} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">{s.step}</span>
              <span className="text-sm font-bold text-white">{s.label}</span>
            </div>
            <p className="text-xs text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Reallocation suggestions from backend */}
      {isAdmin && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-2">📊 Reallocation Suggestions — Propose On-Chain</h3>
          <p className="text-xs text-gray-400 mb-4">
            These suggestions come from the ML reallocation optimizer. Click any to create a multi-sig proposal — requiring
            {' '}{THRESHOLD} auditor signatures before it can be executed.
          </p>
          {loadingSuggestions ? (
            <p className="text-gray-500 text-sm">Loading reallocation data…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-gray-500 text-sm">No reallocation suggestions available.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {suggestions.slice(0, 8).map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm mb-1">
                        <span className="font-bold text-red-400 truncate max-w-[140px]">{s.from_dept}</span>
                        <span className="text-gray-500">→</span>
                        <span className="font-bold text-green-400 truncate max-w-[140px]">{s.to_dept}</span>
                      </div>
                      <p className="text-xs text-gray-400">{s.from_ministry} · {s.scheme_type}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-amber-400">₹{s.transfer_amount_cr.toFixed(1)}Cr</p>
                      <p className="text-xs text-green-400">↓{s.estimated_risk_reduction_pts.toFixed(1)}% risk</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFromDept(deptIdToAddress(s.from_dept_id));
                      setToDept(deptIdToAddress(s.to_dept_id));
                      setAmount((s.transfer_amount_cr * 0.0001).toFixed(6));
                      setRef(suggestionRef(s));
                    }}
                    className="mt-3 w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold transition-all"
                  >
                    ✍️ Load into Proposal Form
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Proposal */}
        {isAdmin && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">📋 New Proposal</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">From Dept (on-chain address)</label>
                <input
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="auto-filled from suggestion above"
                  value={fromDept}
                  onChange={(e) => setFromDept(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">To Dept (on-chain address)</label>
                <input
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="auto-filled from suggestion above"
                  value={toDept}
                  onChange={(e) => setToDept(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount (ETH-scaled — auto-filled)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reference hash (keccak of suggestion)</label>
                <input
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="auto-filled from suggestion above"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                />
              </div>
              <button
                onClick={proposeReallocation}
                disabled={isBusy || !fromDept || !toDept || !amount || !ref}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
              >
                {isBusy && pendingAction === 'propose' ? 'Submitting…' : '📋 Create Proposal'}
              </button>
              {confirmed && pendingAction === 'propose' && (
                <p className="text-xs text-green-400">✅ Proposal created! <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View tx ↗</a></p>
              )}
            </div>
          </div>
        )}

        {/* Lookup + Sign + Execute */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white">🔍 Manage Proposal</h3>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              placeholder="Proposal ID"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            <button
              onClick={() => { setSearchId(BigInt(lookupId)); setSignId(lookupId); setExecId(lookupId); }}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-sm font-bold"
            >
              Load
            </button>
          </div>

          {proposal && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">From</p>
                  <p className="text-white font-mono truncate">{proposal.from}</p>
                </div>
                <div>
                  <p className="text-gray-500">To</p>
                  <p className="text-white font-mono truncate">{proposal.to}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="text-white font-bold">{proposal.amount ? (Number(proposal.amount) / 1e18).toFixed(4) : '0'} ETH</p>
                </div>
                <div>
                  <p className="text-gray-500">Signatures</p>
                  <p className={`font-bold ${Number(proposal.sigCount) >= THRESHOLD ? 'text-green-400' : 'text-amber-400'}`}>
                    {proposal.sigCount.toString()} / {THRESHOLD}
                  </p>
                </div>
              </div>

              <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${proposal.executed ? 'bg-green-500/20 text-green-400' : Number(proposal.sigCount) >= THRESHOLD ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {proposal.executed ? '✅ Executed' : Number(proposal.sigCount) >= THRESHOLD ? '🟡 Ready to Execute' : '⏳ Collecting Signatures'}
              </span>

              <div className="flex gap-2 pt-1">
                {isAuditor && !proposal.executed && (
                  <button
                    onClick={signProposal}
                    disabled={isBusy}
                    className="flex-1 py-2 bg-blue-600/40 hover:bg-blue-600/60 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    {signing || (isBusy && pendingAction === 'sign') ? 'Signing…' : '✍️ Sign (EIP-712)'}
                  </button>
                )}
                {!proposal.executed && Number(proposal.sigCount) >= THRESHOLD && (
                  <button
                    onClick={executeProposal}
                    disabled={isBusy}
                    className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    {isBusy && pendingAction === 'execute' ? 'Executing…' : '⚙️ Execute'}
                  </button>
                )}
              </div>

              {confirmed && pendingAction === 'sign' && (
                <p className="text-xs text-green-400">✅ Signature submitted! <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View tx ↗</a></p>
              )}
              {confirmed && pendingAction === 'execute' && (
                <p className="text-xs text-green-400">✅ Reallocation executed on-chain! <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View tx ↗</a></p>
              )}
            </div>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400 text-center">
          Connect your wallet to create or sign reallocation proposals.
        </div>
      )}

      {isConnected && !isAuditor && (
        <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-xl text-sm text-gray-400">
          Your role (<span className="font-bold text-white">{ROLES[role as keyof typeof ROLES]}</span>) can view proposals but signing requires Auditor or Admin role.
        </div>
      )}
    </div>
  );
}
