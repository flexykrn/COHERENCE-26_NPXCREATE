'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { apiClient } from '@/lib/api';
import type { LapseRisk } from '@/lib/api/types';
import {
  CONTRACT_ADDRESSES,
  AUDIT_SCHEDULER_ABI,
  ROLE_REGISTRY_ABI,
  ROLES,
  EXPLORER_BASE,
} from '@/lib/blockchain/contracts';

export default function AuditVRF() {
  const { address, isConnected } = useAccount();
  const [highRiskDepts, setHighRiskDepts] = useState<LapseRisk[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  useEffect(() => {
    apiClient.getLapseRisk({})
      .then(res => {
        const sorted = [...(res.data ?? [])].sort((a, b) => b.risk_score - a.risk_score);
        setHighRiskDepts(sorted.filter(d => d.risk_level === 'HIGH'));
      })
      .catch(() => {})
      .finally(() => setLoadingDepts(false));
  }, []);

  // Read caller role
  const { data: roleRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.RoleRegistry as `0x${string}`,
    abi: ROLE_REGISTRY_ABI,
    functionName: 'getRole',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });
  const role = roleRaw !== undefined ? Number(roleRaw) : 0;
  const isAdmin = role === 3;

  // Read audit stats
  const { data: auditCount, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESSES.AuditScheduler as `0x${string}`,
    abi: AUDIT_SCHEDULER_ABI,
    functionName: 'auditCount',
  });

  const { data: latestAudit, refetch: refetchLatest } = useReadContract({
    address: CONTRACT_ADDRESSES.AuditScheduler as `0x${string}`,
    abi: AUDIT_SCHEDULER_ABI,
    functionName: 'getLatestAudit',
    query: { enabled: (auditCount ?? 0n) > 0n },
  });

  const { writeContract, data: writeTxHash, isPending: writing } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: writeTxHash,
    onConfirmed: () => {
      refetchCount();
      refetchLatest();
    },
  } as Parameters<typeof useWaitForTransactionReceipt>[0]);

  function requestAudit() {
    const poolSize = highRiskDepts.length || 1;
    writeContract({
      address: CONTRACT_ADDRESSES.AuditScheduler as `0x${string}`,
      abi: AUDIT_SCHEDULER_ABI,
      functionName: 'requestAudit',
      args: [BigInt(poolSize)],
    });
  }

  // Parsed latest audit
  let audit: {
    requestId: bigint;
    totalDDOs: bigint;
    selectedDDO: bigint;
    fulfilled: boolean;
    requestedBy: string;
  } | null = null;

  if (Array.isArray(latestAudit) && latestAudit.length >= 5) {
    audit = {
      requestId: latestAudit[0] as bigint,
      totalDDOs: latestAudit[1] as bigint,
      selectedDDO: latestAudit[2] as bigint,
      fulfilled: latestAudit[3] as boolean,
      requestedBy: latestAudit[4] as string,
    };
  }

  // Map VRF-selected index back to a real department
  const selectedDept: LapseRisk | null =
    audit?.fulfilled && highRiskDepts.length > 0
      ? highRiskDepts[Number(audit.selectedDDO) % highRiskDepts.length]
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">🎲 VRF-Based Audit Selection</h2>
        <p className="text-gray-300 text-sm">
          The ML model identifies HIGH lapse-risk departments. VRF then picks one for mandatory audit in a provably fair,
          manipulation-resistant way — no admin can influence which department gets selected.
        </p>
        <div className="mt-3 flex items-center gap-5 text-xs text-gray-400">
          <span>Total audits on-chain: <span className="text-white font-bold">{auditCount?.toString() ?? '…'}</span></span>
          <span>High-risk pool: <span className="text-red-400 font-bold">{highRiskDepts.length} departments</span></span>
          <a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.AuditScheduler}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View contract ↗</a>
        </div>
      </div>

      {/* High-risk department pool from backend */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-3">📋 Audit Pool — HIGH Lapse-Risk Departments</h3>
        <p className="text-xs text-gray-400 mb-4">
          These departments were flagged HIGH risk by the ML model. The VRF audit randomly selects one — ensuring no dept
          can be protected from scrutiny.
        </p>
        {loadingDepts ? (
          <div className="text-gray-500 text-sm">Loading lapse-risk data…</div>
        ) : highRiskDepts.length === 0 ? (
          <div className="text-gray-500 text-sm">No HIGH risk departments found. All departments are utilising funds on track.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {highRiskDepts.map((dept) => (
              <div key={dept.dept_id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{dept.name}</p>
                    <p className="text-xs text-gray-400 truncate">{dept.ministry}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold shrink-0">HIGH</span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-400">
                  <span>Risk: <span className="text-red-400 font-bold">{dept.risk_score.toFixed(1)}%</span></span>
                  <span>Lapse: <span className="text-amber-400 font-bold">₹{dept.lapse_amount_cr.toFixed(1)}Cr</span></span>
                  <span>Utilised: <span className="font-bold text-gray-300">{dept.projected_utilization_pct.toFixed(0)}%</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Audit Result */}
      {audit ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Latest Audit Result</h3>
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${audit.fulfilled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {audit.fulfilled ? '✅ VRF Fulfilled' : '⏳ Awaiting VRF'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">VRF Request ID</p>
              <p className="text-sm text-white font-mono">{audit.requestId.toString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Departments in Pool</p>
              <p className="text-sm text-white font-mono">{audit.totalDDOs.toString()}</p>
            </div>
            {audit.fulfilled && (
              <>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Selected Index</p>
                  <p className="text-3xl font-bold text-indigo-400">#{audit.selectedDDO.toString()}</p>
                </div>
                {selectedDept && (
                  <div className="col-span-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-xs text-indigo-400 font-bold mb-1">🎯 SELECTED FOR AUDIT</p>
                    <p className="text-lg font-black text-white">{selectedDept.name}</p>
                    <p className="text-sm text-gray-400">{selectedDept.ministry}</p>
                    <div className="mt-2 flex gap-4 text-xs">
                      <span className="text-red-400">Risk: {selectedDept.risk_score.toFixed(1)}%</span>
                      <span className="text-amber-400">Projected lapse: ₹{selectedDept.lapse_amount_cr.toFixed(1)}Cr</span>
                      <span className="text-gray-400">Utilisation: {selectedDept.projected_utilization_pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Requested By</p>
              <a href={`${EXPLORER_BASE}/address/${audit.requestedBy}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs font-mono">
                {audit.requestedBy}
              </a>
            </div>
          </div>
          {audit.fulfilled && (
            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
              🔒 Cryptographically verifiable — VRF randomness was committed before the result was computed. No one could have predicted or manipulated this selection.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-sm">
          No audits have been scheduled yet.
        </div>
      )}

      {/* Request New Audit */}
      {isConnected && isAdmin && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-2">Request VRF Audit</h3>
          <p className="text-xs text-gray-400 mb-4">
            This will submit <span className="text-white font-bold">{highRiskDepts.length} HIGH-risk departments</span> to the
            on-chain VRF for random audit selection.
          </p>
          <button
            onClick={requestAudit}
            disabled={writing || confirming || highRiskDepts.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
          >
            {writing ? 'Awaiting wallet…' : confirming ? 'Confirming…' : `🎲 Audit ${highRiskDepts.length} High-Risk Departments`}
          </button>
          {confirmed && writeTxHash && (
            <p className="mt-3 text-xs text-green-400">
              ✅ Audit request sent!{' '}
              <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View tx ↗</a>
              {' '}— VRF result appears after Chainlink fulfillment (~1-3 blocks).
            </p>
          )}
        </div>
      )}

      {isConnected && !isAdmin && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          🔐 Admin role required to schedule audits. Your role: <span className="font-bold">{ROLES[role as keyof typeof ROLES]}</span>
        </div>
      )}
      {!isConnected && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400 text-center">
          Connect your wallet to request audits (Admin role required).
        </div>
      )}
    </div>
  );
}
