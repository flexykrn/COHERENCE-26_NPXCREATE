'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { apiClient } from '@/lib/api';
import {
  CONTRACT_ADDRESSES,
  COMMITMENT_REGISTRY_ABI,
  EXPLORER_BASE,
} from '@/lib/blockchain/contracts';

type ReportKind = 'anomalies' | 'lapse' | 'collusion';

interface Report {
  kind: ReportKind;
  label: string;
  summary: string;
  hash: `0x${string}`;
}

export default function CommitmentChecker() {
  const { isConnected } = useAccount();

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Lookup form
  const [lookupDdo, setLookupDdo] = useState('');
  const [lookupHash, setLookupHash] = useState('');

  const { writeContract, data: writeTxHash, isPending: writing } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: writeTxHash });

  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: CONTRACT_ADDRESSES.CommitmentRegistry as `0x${string}`,
    abi: COMMITMENT_REGISTRY_ABI,
    functionName: 'getCommitment',
    args: lookupDdo && lookupHash ? [lookupDdo as `0x${string}`, lookupHash as `0x${string}`] : undefined,
    query: { enabled: false },
  });

  useEffect(() => {
    const now = new Date().toISOString();
    Promise.allSettled([
      apiClient.getAnomaliesSummary().then(res => {
        const json = JSON.stringify({ report: 'anomaly_summary', generated_at: now, total_anomalies: res.total_anomalies, by_type: res.by_type, total_amount_at_risk_cr: res.total_amount_at_risk_cr });
        return {
          kind: 'anomalies' as ReportKind,
          label: 'Anomaly Detection Report',
          summary: `${res.total_anomalies} anomalies across ${Object.keys(res.by_type ?? {}).length} categories — ₹${res.total_amount_at_risk_cr?.toFixed(1)} Cr at risk`,
          hash: keccak256(toBytes(json)),
        };
      }),
      apiClient.getLapseRisk({}).then(res => {
        const high = (res.data ?? []).filter((d: { risk_level: string }) => d.risk_level === 'HIGH').length;
        const json = JSON.stringify({ report: 'lapse_risk', generated_at: now, total: res.total, high_risk_count: high });
        return {
          kind: 'lapse' as ReportKind,
          label: 'Lapse Risk Assessment',
          summary: `${res.total} departments assessed — ${high} flagged HIGH risk`,
          hash: keccak256(toBytes(json)),
        };
      }),
      apiClient.getCollusion({}).then(res => {
        const json = JSON.stringify({ report: 'collusion_network', generated_at: now, summary: res.summary });
        return {
          kind: 'collusion' as ReportKind,
          label: 'Collusion Network Report',
          summary: `${res.summary?.shell_vendors ?? 0} shell vendors, ${res.summary?.colluding_ddos ?? 0} colluding DDOs — ₹${res.summary?.total_at_risk_cr ?? 0} Cr at risk`,
          hash: keccak256(toBytes(json)),
        };
      }),
    ]).then(results => {
      setReports(results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<Report>).value));
    }).finally(() => setLoadingReports(false));
  }, []);

  function handleAnchor() {
    if (!selectedReport) return;
    writeContract({
      address: CONTRACT_ADDRESSES.CommitmentRegistry as `0x${string}`,
      abi: COMMITMENT_REGISTRY_ABI,
      functionName: 'commit',
      args: [selectedReport.hash],
    });
  }

  const blockAge = commitment && (commitment as { blockTimestamp: bigint }).blockTimestamp > 0n
    ? Number(BigInt(Math.floor(Date.now() / 1000)) - (commitment as { blockTimestamp: bigint }).blockTimestamp)
    : null;
  const blockAgeText = blockAge !== null
    ? blockAge > 86400 ? `${Math.floor(blockAge / 86400)} days ago`
      : blockAge > 3600 ? `${Math.floor(blockAge / 3600)} hours ago`
      : `${Math.floor(blockAge / 60)} minutes ago`
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Explainer */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">🔐 Anchor Backend Reports On-Chain</h2>
        <p className="text-gray-300 text-sm">
          Commit a cryptographic fingerprint (keccak256 hash) of any live backend report to the blockchain.
          The block timestamp permanently proves this exact data existed at that block — preventing backdating of findings.
          If anomalies are later disputed, the on-chain hash is irrefutable proof of when they were detected.
        </p>
      </div>

      {/* Live backend reports */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-1">📋 Live Backend Reports — Select to Anchor</h3>
        <p className="text-xs text-gray-400 mb-4">
          Fetched fresh from the ML backend right now. Anchoring one commits its keccak256 hash to the chain, creating a
          tamper-proof timestamp. Inspectors cannot later claim data was altered after detection.
        </p>
        {loadingReports ? (
          <p className="text-gray-500 text-sm animate-pulse">Fetching reports from backend…</p>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div
                key={r.kind}
                onClick={() => setSelectedReport(r)}
                className={`cursor-pointer rounded-xl p-4 border transition-all ${
                  selectedReport?.kind === r.kind
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.summary}</p>
                    <p className="text-xs text-gray-600 font-mono mt-1 truncate">
                      hash: {r.hash}
                    </p>
                  </div>
                  {selectedReport?.kind === r.kind && (
                    <span className="text-amber-400 text-xs font-bold shrink-0">✓ Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anchor action */}
      {selectedReport && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-3">📌 Anchor: {selectedReport.label}</h3>
          <div className="bg-black/30 rounded-xl p-3 mb-4 border border-white/5">
            <p className="text-xs text-gray-400 mb-1">Commitment hash (keccak256 of report JSON snapshot)</p>
            <code className="text-amber-300 text-xs break-all">{selectedReport.hash}</code>
          </div>
          {!isConnected ? (
            <p className="text-amber-400 text-sm">Connect your wallet to anchor this report.</p>
          ) : (
            <>
              <button
                onClick={handleAnchor}
                disabled={writing}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:shadow-lg hover:shadow-amber-500/30 transition-all"
              >
                {writing ? 'Sending to chain…' : '🔐 Anchor This Report On-Chain'}
              </button>
              {txConfirmed && writeTxHash && (
                <div className="mt-3 text-green-400 text-sm font-semibold text-center">
                  ✅ Report anchored! Block timestamp permanently recorded.{' '}
                  <a href={`${EXPLORER_BASE}/tx/${writeTxHash}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-400">
                    View tx ↗
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Lookup section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-1">🔍 Verify Existing Commitment</h3>
        <p className="text-xs text-gray-400 mb-4">
          Paste any previously anchored hash to see when it was committed and check for backdating signs.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Committer Address</label>
            <input
              className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
              value={lookupDdo}
              onChange={(e) => setLookupDdo(e.target.value)}
              placeholder="0x… (wallet that anchored the report)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Commitment Hash</label>
            <input
              className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
              value={lookupHash}
              onChange={(e) => setLookupHash(e.target.value)}
              placeholder="0x… (hash shown above after anchoring)"
            />
          </div>
        </div>
        <button
          onClick={() => refetchCommitment()}
          disabled={!lookupDdo || !lookupHash}
          className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          Verify On-Chain
        </button>
        {commitment && (commitment as { blockTimestamp: bigint }).blockTimestamp > 0n && (
          <div className="mt-4 bg-black/30 rounded-xl p-4 border border-white/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Anchored at block timestamp</span>
              <span className="text-white font-mono">{(commitment as { blockTimestamp: bigint }).blockTimestamp.toString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Age</span>
              <span className={`font-bold ${blockAge && blockAge < 3600 ? 'text-red-400' : 'text-green-400'}`}>{blockAgeText}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Status</span>
              <span className={(commitment as { opened: boolean }).opened ? 'text-gray-400' : 'text-amber-400'}>
                {(commitment as { opened: boolean }).opened ? '✅ Opened / Audited' : '🔒 Sealed'}
              </span>
            </div>
            {blockAge !== null && blockAge < 3600 && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                ⚠️ Committed less than 1 hour ago — if linked to a past report date, this indicates backdating of evidence.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
