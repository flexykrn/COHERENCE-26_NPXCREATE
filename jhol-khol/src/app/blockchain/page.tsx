'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CONTRACT_ADDRESSES, EXPLORER_BASE } from '@/lib/blockchain/contracts';
import MerkleVerifier from '@/components/blockchain/MerkleVerifier';
import CommitmentChecker from '@/components/blockchain/CommitmentChecker';
import WhistleblowerForm from '@/components/blockchain/WhistleblowerForm';
import AuditVRF from '@/components/blockchain/AuditVRF';
import SlashingPanel from '@/components/blockchain/SlashingPanel';
import MultiSigPanel from '@/components/blockchain/MultiSigPanel';

const TABS = [
  { id: 'overview',     label: '🏠 Overview',        desc: 'All contracts at a glance' },
  { id: 'merkle',       label: '🌳 Merkle Verify',   desc: 'Verify transactions on-chain' },
  { id: 'commitment',   label: '🔐 Anti-Backdating',  desc: 'Proof-of-time commitments' },
  { id: 'whistleblow',  label: '🕵️ Whistleblower',   desc: 'Anonymous encrypted reports' },
  { id: 'audit',        label: '🎲 VRF Audit',        desc: 'Unbiased DDO selection' },
  { id: 'slash',        label: '⚡ Slashing',          desc: 'Economic penalties for fraud' },
  { id: 'multisig',     label: '✍️ Multi-Sig',        desc: 'Approved reallocations' },
] as const;
type TabId = typeof TABS[number]['id'];

const CONTRACT_LIST = [
  { name: 'RoleRegistry',        addr: CONTRACT_ADDRESSES.RoleRegistry,        desc: 'Wallet → Role mapping' },
  { name: 'MerkleRegistry',      addr: CONTRACT_ADDRESSES.MerkleRegistry,      desc: 'Ministry Merkle trees' },
  { name: 'CommitmentRegistry',  addr: CONTRACT_ADDRESSES.CommitmentRegistry,  desc: 'Anti-backdating proofs' },
  { name: 'SlashingVault',       addr: CONTRACT_ADDRESSES.SlashingVault,       desc: 'DDO stake + slash' },
  { name: 'MultiSigReallocation',addr: CONTRACT_ADDRESSES.MultiSigReallocation,desc: 'EIP-712 3-of-N approval' },
  { name: 'WhistleblowerVault',  addr: CONTRACT_ADDRESSES.WhistleblowerVault,  desc: 'Stealth address reports' },
  { name: 'AuditScheduler',      addr: CONTRACT_ADDRESSES.AuditScheduler,      desc: 'VRF audit selection' },
  { name: 'ZKBudgetVerifier',    addr: CONTRACT_ADDRESSES.ZKBudgetVerifier,    desc: 'Groth16 ZK compliance' },
];

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contracts Deployed', value: '8', color: 'from-amber-500 to-orange-500' },
          { label: 'Network', value: 'Hoodi', color: 'from-blue-500 to-cyan-500' },
          { label: 'Chain ID', value: '560048', color: 'from-purple-500 to-pink-500' },
          { label: 'Deployer', value: '0x8916…4375', color: 'from-green-500 to-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className={`text-2xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Contract list */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Live Contracts on Hoodi Testnet</h3>
        <div className="space-y-2">
          {CONTRACT_LIST.map((c) => (
            <div key={c.name} className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition-colors group">
              <div>
                <span className="font-bold text-white text-sm">{c.name}</span>
                <span className="text-gray-400 text-xs ml-2">{c.desc}</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="text-amber-400 text-xs font-mono hidden md:block">
                  {c.addr.slice(0, 10)}…{c.addr.slice(-6)}
                </code>
                <a
                  href={`${EXPLORER_BASE}/address/${c.addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-colors"
                >
                  Etherscan ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature map */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">How Blockchain Powers the Platform</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { icon: '🌳', title: 'Budget DNA + Merkle Forest', desc: 'Every transaction leaf is hashed & committed. National root = root of all ministry roots. Tamper any tx → root mismatch detected on-chain.', contract: 'MerkleRegistry' },
            { icon: '🔐', title: 'Ghost Transaction Proof', desc: 'DDOs commit hash on-chain at creation time. Block timestamp is immutable. Year-end inserted transactions have blockAge ≈ 0 — court-admissible evidence.', contract: 'CommitmentRegistry' },
            { icon: '🎲', title: 'VRF Audit Selection', desc: 'Audits assigned by verifiable on-chain randomness. Nobody — platform or government — can predict or rig DDO selection.', contract: 'AuditScheduler' },
            { icon: '⚡', title: 'Slashing for Confirmed Fraud', desc: 'ML score > 0.85 AND Merkle mismatch → DDO stake slashed. 50% to auditor, 50% burned. Dual evidence prevents false slashing.', contract: 'SlashingVault' },
            { icon: '✍️', title: 'EIP-712 Multi-Sig Reallocation', desc: '₹50Cr+ reallocations require 3-of-5 Finance Officer signatures. Human-readable in MetaMask. Single person cannot approve major moves.', contract: 'MultiSigReallocation' },
            { icon: '🕵️', title: 'Stealth Whistleblowing', desc: 'Each report uses a one-time ephemeral key. Two reports from same person are cryptographically unlinked. ECIES encryption, admin key only.', contract: 'WhistleblowerVault' },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <div className="font-bold text-white text-sm">{f.title}</div>
                  <div className="text-gray-400 text-xs mt-1">{f.desc}</div>
                  <code className="text-amber-400/70 text-xs mt-1 block">{f.contract}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockchainContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get('tab') as TabId | null;
    return tab && TABS.some(t => t.id === tab) ? tab : 'overview';
  });

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab);
  }, [searchParams]);

  return (
    <main className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">⛓</span>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Blockchain Integrity Layer
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                8 smart contracts live on Hoodi Testnet · Cryptographic proofs for every budget decision
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs text-green-400 font-semibold">All contracts live · Chain ID 560048</span>
            <a
              href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.RoleRegistry}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-blue-400 hover:underline"
            >
              View on Etherscan ↗
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'overview'    && <OverviewTab />}
          {activeTab === 'merkle'      && <MerkleVerifier />}
          {activeTab === 'commitment'  && <CommitmentChecker />}
          {activeTab === 'whistleblow' && <WhistleblowerForm />}
          {activeTab === 'audit'       && <AuditVRF />}
          {activeTab === 'slash'       && <SlashingPanel />}
          {activeTab === 'multisig'    && <MultiSigPanel />}
        </div>
    </main>
  );
}

export default function BlockchainPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <Suspense fallback={
        <main className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
          <div className="animate-pulse text-gray-500 text-center mt-20">Loading…</div>
        </main>
      }>
        <BlockchainContent />
      </Suspense>
      <Footer />
    </div>
  );
}
