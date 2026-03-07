'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, keccak256, toBytes } from 'viem';
import { apiClient } from '@/lib/api';
import type { CollusionNode } from '@/lib/api/types';
import {
  CONTRACT_ADDRESSES,
  SLASHING_VAULT_ABI,
  ROLE_REGISTRY_ABI,
  ROLES,
  EXPLORER_BASE,
} from '@/lib/blockchain/contracts';

/** Derive a deterministic address from an entity ID — represents a registered DDO/vendor */
function entityToAddress(id: string): `0x${string}` {
  const hash = keccak256(toBytes(id));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

/** Evidence hash: fingerprint of the anomaly node data */
function nodeEvidenceHash(node: CollusionNode): `0x${string}` {
  return keccak256(
    toBytes(`${node.id}:${node.type}:${Math.round(node.amount_cr * 100)}:${Math.round(node.risk * 100)}`)
  );
}

export default function SlashingPanel() {
  const { address, isConnected } = useAccount();
  const [flaggedNodes, setFlaggedNodes] = useState<CollusionNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);

  useEffect(() => {
    apiClient.getCollusion({})
      .then(res => {
        const highRisk = (res.nodes ?? [])
          .filter(n => n.type === 'shell_vendor' || n.type === 'colluding_ddo')
          .sort((a, b) => b.risk - a.risk);
        setFlaggedNodes(highRisk);
      })
      .catch(() => {})
      .finally(() => setLoadingNodes(false));
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

  // Min stake
  const { data: minStakeRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
    abi: SLASHING_VAULT_ABI,
    functionName: 'MIN_STAKE',
  });
  const minStake = minStakeRaw as bigint | undefined;

  // Caller own stake
  const { data: myStakeRaw, refetch: refetchMyStake } = useReadContract({
    address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
    abi: SLASHING_VAULT_ABI,
    functionName: 'getStake',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });
  const myStake = myStakeRaw as bigint | undefined;

  // Caller slash status
  const { data: mySlashed } = useReadContract({
    address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
    abi: SLASHING_VAULT_ABI,
    functionName: 'isSlashed',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  // Lookup arbitrary DDO
  const [lookupAddr, setLookupAddr] = useState('');
  const [searchAddr, setSearchAddr] = useState<`0x${string}` | undefined>(undefined);
  const { data: lookedStake } = useReadContract({
    address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
    abi: SLASHING_VAULT_ABI,
    functionName: 'getStake',
    args: [searchAddr as `0x${string}`],
    query: { enabled: !!searchAddr },
  });
  const { data: lookedSlashed } = useReadContract({
    address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
    abi: SLASHING_VAULT_ABI,
    functionName: 'isSlashed',
    args: [searchAddr as `0x${string}`],
    query: { enabled: !!searchAddr },
  });

  // Slash form
  const [slashTarget, setSlashTarget] = useState('');
  const [slashEvidence, setSlashEvidence] = useState('');

  const { writeContract, data: writeTxHash, isPending: writing, reset: resetWrite } = useWriteContract();
  const [pendingAction, setPendingAction] = useState<'stake' | 'withdraw' | 'slash' | null>(null);
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: writeTxHash,
    onConfirmed: () => refetchMyStake(),
  } as Parameters<typeof useWaitForTransactionReceipt>[0]);

  function doStake() {
    setPendingAction('stake');
    writeContract({
      address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
      abi: SLASHING_VAULT_ABI,
      functionName: 'stake',
      value: minStake ?? parseEther('0.001'),
    });
  }

  function doWithdraw() {
    setPendingAction('withdraw');
    writeContract({
      address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
      abi: SLASHING_VAULT_ABI,
      functionName: 'withdrawStake',
    });
  }

  function doSlash() {
    if (!slashTarget || !slashEvidence) return;
    setPendingAction('slash');
    writeContract({
      address: CONTRACT_ADDRESSES.SlashingVault as `0x${string}`,
      abi: SLASHING_VAULT_ABI,
      functionName: 'slash',
      args: [slashTarget as `0x${string}`, slashEvidence as `0x${string}`],
    });
  }

  const isBusy = writing || confirming;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">⚡ DDO Slashing Vault</h2>
        <p className="text-gray-300 text-sm">
          DDOs (District Development Officers) must stake ETH before disbursing funds. If an auditor detects misconduct backed by Merkle proof evidence, their stake is slashed — 50% to the auditor, 50% burned.
        </p>
        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span>Min stake: <span className="text-amber-400 font-bold">{minStake ? formatEther(minStake) : '…'} ETH</span></span>
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.SlashingVault}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View contract ↗</a>
        </div>
      </div>

      {/* My Stake Card */}
      {isConnected && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-4">Your Stake Status</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Staked Amount</p>
              <p className="text-2xl font-bold text-amber-400">{myStake ? formatEther(myStake) : '0'} ETH</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${mySlashed ? 'bg-red-500/20 text-red-400' : (myStake ?? 0n) > 0n ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {mySlashed ? '🚫 Slashed' : (myStake ?? 0n) > 0n ? '✅ Active' : 'No Stake'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Your Role</p>
              <span className="text-sm text-white font-semibold">{ROLES[role as keyof typeof ROLES]}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={doStake}
              disabled={isBusy || !!mySlashed || (myStake ?? 0n) > 0n}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
            >
              {isBusy && pendingAction === 'stake' ? 'Staking…' : `Stake ${minStake ? formatEther(minStake) : '0.001'} ETH`}
            </button>
            <button
              onClick={doWithdraw}
              disabled={isBusy || !!mySlashed || (myStake ?? 0n) === 0n}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
            >
              {isBusy && pendingAction === 'withdraw' ? 'Withdrawing…' : 'Withdraw Stake'}
            </button>
          </div>
          {confirmed && pendingAction === 'stake' && (
            <p className="mt-2 text-xs text-green-400">✅ Staked successfully! <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View tx ↗</a></p>
          )}
          {confirmed && pendingAction === 'withdraw' && (
            <p className="mt-2 text-xs text-green-400">✅ Stake withdrawn!</p>
          )}
        </div>
      )}

      {/* Flagged entities from collusion detector */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-2">🕵️ Collusion-Detected Entities</h3>
        <p className="text-xs text-gray-400 mb-4">
          Shell vendors and colluding DDOs identified by the network anomaly detector. Auditors can slash any entity
          that has staked ETH as a performance bond.
        </p>
        {loadingNodes ? (
          <p className="text-gray-500 text-sm">Loading collusion data…</p>
        ) : flaggedNodes.length === 0 ? (
          <p className="text-gray-500 text-sm">No shell vendors or colluding DDOs detected in the current dataset.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {flaggedNodes.map((node) => (
              <div key={node.id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${node.type === 'shell_vendor' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                      {node.type === 'shell_vendor' ? 'Shell Vendor' : 'Colluding DDO'}
                    </span>
                    <span className="text-xs text-gray-400">Risk: <span className="text-red-400 font-bold">{(node.risk * 100).toFixed(0)}%</span></span>
                    <span className="text-xs text-gray-400">At risk: <span className="text-amber-400 font-bold">₹{node.amount_cr.toFixed(1)}Cr</span></span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-1 truncate">{node.label}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{entityToAddress(node.id)}</p>
                </div>
                {isConnected && isAuditor && (
                  <button
                    onClick={() => {
                      setSlashTarget(entityToAddress(node.id));
                      setSlashEvidence(nodeEvidenceHash(node));
                    }}
                    className="shrink-0 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-all"
                  >
                    ⚡ Slash
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lookup DDO */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4">🔍 Lookup Stake by Address</h3>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
            placeholder="0x... (auto-filled from flagged entity above)"
            value={lookupAddr}
            onChange={(e) => setLookupAddr(e.target.value)}
          />
          <button
            onClick={() => setSearchAddr(lookupAddr as `0x${string}`)}
            className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl font-bold text-sm transition-all"
          >
            Search
          </button>
        </div>
        {searchAddr && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Stake on File</p>
              <p className="text-xl font-bold text-white">{lookedStake ? formatEther(lookedStake as bigint) : '0'} ETH</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Slash Status</p>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${lookedSlashed ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {lookedSlashed ? '🚫 Slashed' : '✅ Clean'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Slash Action (Auditor/Admin only) */}
      {isConnected && isAuditor && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h3 className="font-bold text-red-400 mb-1">⚡ Execute Slash</h3>
          <p className="text-gray-400 text-xs mb-4">
            Fields auto-fill when you click ⚡ Slash on a flagged entity above. The evidence hash is a cryptographic
            fingerprint of the collusion detection data. Slashing is irreversible and permanently logged on-chain.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Address (derived from entity ID)</label>
              <input
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                placeholder="auto-filled from flagged entity above"
                value={slashTarget}
                onChange={(e) => setSlashTarget(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Evidence Hash (keccak256 of anomaly data)</label>
              <input
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                placeholder="auto-filled from collusion detection"
                value={slashEvidence}
                onChange={(e) => setSlashEvidence(e.target.value)}
              />
            </div>
            <button
              onClick={doSlash}
              disabled={isBusy || !slashTarget || !slashEvidence}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
            >
              {isBusy && pendingAction === 'slash' ? 'Processing…' : '⚡ Execute Slash'}
            </button>
            {confirmed && pendingAction === 'slash' && (
              <p className="text-xs text-green-400">✅ Slash executed! <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View tx ↗</a></p>
            )}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400 text-center">
          Connect your wallet to manage stakes.
        </div>
      )}
    </div>
  );
}
