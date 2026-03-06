// ─────────────────────────────────────────────────────────────────────────────
//  Contract Addresses — all deployed on Hoodi Testnet (Chain ID 560048)
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRACT_ADDRESSES = {
  RoleRegistry:          '0x4e72728f773eb6AF601561dAaa2C7C6Ca4461999',
  MerkleRegistry:        '0x44880567cA570a3F3F1D3deBCD76eE04279F68b4',
  CommitmentRegistry:    '0x331b24AEABC3Bdb21E6104766062e0758FF3D839',
  SlashingVault:         '0xe37B94F807C1fF6B3f0c760d9De4237F6bE48D14',
  MultiSigReallocation:  '0x35B5a738a3692DFaF60d184620a9d780774C7903',
  WhistleblowerVault:    '0xA81F9C8a9a0A28c83088D0Ec4DFb9FdF3d5e77b9',
  AuditScheduler:        '0x79095eE2438dD8a8D23C61A6f652488219B93c45',
  ZKBudgetVerifier:      '0xc01aC442139cA12b002217f4821b0dba4AF10f1c',
  MockVRFCoordinator:    '0x96B7769A9234729698C47200E2f56892a0Af7d35',
} as const;

export const EXPLORER_BASE = 'https://hoodi.etherscan.io';
export const ETHERSCAN_API = 'https://api.hoodi.etherscan.io/api';
export const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'KBKRMKT1A2WVZVBR87MKBG4ER7GAJ68JDH';

// ─────────────────────────────────────────────────────────────────────────────
//  Minimal ABIs — only functions and events the UI uses
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_REGISTRY_ABI = [
  { name: 'getRole', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'isAuditor', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'isAdmin', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'grantRole', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'account', type: 'address' }, { name: 'role', type: 'uint8' }], outputs: [] },
  { name: 'RoleGranted', type: 'event', inputs: [{ name: 'account', type: 'address', indexed: true }, { name: 'role', type: 'uint8', indexed: false }] },
] as const;

export const MERKLE_REGISTRY_ABI = [
  { name: 'submitRoot', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'ministryId', type: 'bytes32' }, { name: 'root', type: 'bytes32' }, { name: 'batchRef', type: 'string' }], outputs: [] },
  { name: 'verifyTransaction', type: 'function', stateMutability: 'pure', inputs: [{ name: 'proof', type: 'bytes32[]' }, { name: 'leaf', type: 'bytes32' }, { name: 'root', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'verifyAgainstLatest', type: 'function', stateMutability: 'view', inputs: [{ name: 'proof', type: 'bytes32[]' }, { name: 'leaf', type: 'bytes32' }, { name: 'ministryId', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'latestRoot', type: 'function', stateMutability: 'view', inputs: [{ name: 'ministryId', type: 'bytes32' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'getRootCount', type: 'function', stateMutability: 'view', inputs: [{ name: 'ministryId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'buildLeaf', type: 'function', stateMutability: 'pure', inputs: [{ name: 'ddoId', type: 'bytes32' }, { name: 'vendorId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'category', type: 'bytes32' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'RootSubmitted', type: 'event', inputs: [{ name: 'ministryId', type: 'bytes32', indexed: true }, { name: 'root', type: 'bytes32', indexed: false }, { name: 'blockTimestamp', type: 'uint256', indexed: false }, { name: 'batchRef', type: 'string', indexed: false }] },
] as const;

export const COMMITMENT_REGISTRY_ABI = [
  { name: 'commit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'hash', type: 'bytes32' }], outputs: [] },
  { name: 'open', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'ddo', type: 'address' }, { name: 'nonce', type: 'uint256' }], outputs: [{ name: 'valid', type: 'bool' }, { name: 'blockAge', type: 'uint256' }] },
  { name: 'buildCommitHash', type: 'function', stateMutability: 'pure', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'ddo', type: 'address' }, { name: 'nonce', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'getCommitment', type: 'function', stateMutability: 'view', inputs: [{ name: 'ddo', type: 'address' }, { name: 'hash', type: 'bytes32' }], outputs: [{ components: [{ name: 'hash', type: 'bytes32' }, { name: 'blockTimestamp', type: 'uint256' }, { name: 'opened', type: 'bool' }], name: '', type: 'tuple' }] },
  { name: 'Committed', type: 'event', inputs: [{ name: 'ddo', type: 'address', indexed: true }, { name: 'hash', type: 'bytes32', indexed: true }, { name: 'blockTimestamp', type: 'uint256', indexed: false }] },
] as const;

export const SLASHING_VAULT_ABI = [
  { name: 'stake', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] },
  { name: 'slash', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'ddo', type: 'address' }, { name: 'merkleEvidence', type: 'bytes32' }], outputs: [] },
  { name: 'withdrawStake', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'getStake', type: 'function', stateMutability: 'view', inputs: [{ name: 'ddo', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'isSlashed', type: 'function', stateMutability: 'view', inputs: [{ name: 'ddo', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'MIN_STAKE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'Staked', type: 'event', inputs: [{ name: 'ddo', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'Slashed', type: 'event', inputs: [{ name: 'ddo', type: 'address', indexed: true }, { name: 'auditor', type: 'address', indexed: true }, { name: 'auditorReward', type: 'uint256', indexed: false }, { name: 'burned', type: 'uint256', indexed: false }, { name: 'merkleEvidence', type: 'bytes32', indexed: false }] },
] as const;

export const MULTISIG_ABI = [
  { name: 'proposeReallocation', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'ref', type: 'string' }], outputs: [{ name: 'proposalId', type: 'uint256' }] },
  { name: 'signProposal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { name: 'executeReallocation', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { name: 'getProposalBasics', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'ref', type: 'string' }, { name: 'createdAt', type: 'uint256' }, { name: 'executed', type: 'bool' }, { name: 'sigCount', type: 'uint256' }] },
  { name: 'getDigest', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'proposalCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'THRESHOLD', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'ProposalCreated', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'from', type: 'address', indexed: false }, { name: 'to', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'ref', type: 'string', indexed: false }] },
  { name: 'ProposalSigned', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'signer', type: 'address', indexed: false }, { name: 'sigCount', type: 'uint256', indexed: false }] },
  { name: 'ProposalExecuted', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'executor', type: 'address', indexed: false }] },
] as const;

export const WHISTLEBLOWER_ABI = [
  { name: 'submitReport', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'ephemeralPubKey', type: 'bytes' }, { name: 'encryptedData', type: 'bytes' }, { name: 'ipfsCid', type: 'string' }], outputs: [{ name: 'reportId', type: 'uint256' }] },
  { name: 'getReportCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'platformPubKey', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bytes' }] },
  { name: 'ReportSubmitted', type: 'event', inputs: [{ name: 'reportId', type: 'uint256', indexed: true }, { name: 'blockTimestamp', type: 'uint256', indexed: false }] },
] as const;

export const AUDIT_SCHEDULER_ABI = [
  { name: 'requestAudit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'totalDDOs', type: 'uint256' }], outputs: [{ name: 'vrfRequestId', type: 'uint256' }] },
  { name: 'getLatestAudit', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ components: [{ name: 'requestId', type: 'uint256' }, { name: 'totalDDOs', type: 'uint256' }, { name: 'selectedDDO', type: 'uint256' }, { name: 'requestedAt', type: 'uint256' }, { name: 'fulfilledAt', type: 'uint256' }, { name: 'fulfilled', type: 'bool' }, { name: 'requestedBy', type: 'address' }], name: '', type: 'tuple' }] },
  { name: 'auditCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'AuditRequested', type: 'event', inputs: [{ name: 'auditNumber', type: 'uint256', indexed: true }, { name: 'vrfRequestId', type: 'uint256', indexed: true }, { name: 'totalDDOs', type: 'uint256', indexed: false }, { name: 'requestedBy', type: 'address', indexed: false }] },
  { name: 'AuditFulfilled', type: 'event', inputs: [{ name: 'auditNumber', type: 'uint256', indexed: true }, { name: 'vrfRequestId', type: 'uint256', indexed: true }, { name: 'selectedDDO', type: 'uint256', indexed: false }, { name: 'randomWord', type: 'uint256', indexed: false }] },
] as const;

// Role enum mapping (matches Solidity enum Role)
export const ROLES = { 0: 'None', 1: 'Citizen', 2: 'Auditor', 3: 'Admin' } as const;
export type RoleValue = keyof typeof ROLES;
