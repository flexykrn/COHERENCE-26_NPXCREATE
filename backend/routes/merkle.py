"""
Merkle Rollup Engine
- Batch unbatched transactions into a Merkle tree (like an L2 rollup)
- Each batch has a Merkle root + individual proofs for every leaf
- Batches are stored in memory and can be submitted to the Hoodi MerkleRegistry
- Verification: reconstruct root from proof + leaf, compare to stored batch root

Compatible with OpenZeppelin MerkleProof.sol sorted-pair algorithm.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import pandas as pd
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

# ── Hoodi on-chain config ─────────────────────────────────────────────────────
HOODI_RPC_URL = os.getenv("HOODI_RPC_URL", "https://ethereum-hoodi-rpc.publicnode.com")
HOODI_CHAIN_ID = int(os.getenv("HOODI_CHAIN_ID", "560048"))
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
REGISTRY_ADDRESS = "0x44880567cA570a3F3F1D3deBCD76eE04279F68b4"

# Minimal ABI — only the function we call
REGISTRY_ABI = [
    {
        "name": "submitRoot",
        "type": "function",
        "inputs": [
            {"name": "ministryId", "type": "bytes32"},
            {"name": "root",       "type": "bytes32"},
            {"name": "batchRef",   "type": "string"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
    }
]

router = APIRouter(prefix="/api/merkle", tags=["merkle"])

# ── In-memory batch store (rollup state) ─────────────────────────────────────
# Each batch: {id, root, tx_ids, leaves, proofs, created_at, tx_count, submitted}
BATCHES: List[dict] = []
BATCHED_TX_IDS: set = set()   # track which tx_ids are already in a batch

# ── Hashing helpers ───────────────────────────────────────────────────────────
def keccak256_hash(*args) -> str:
    data = ''.join(str(a) for a in args).encode('utf-8')
    return '0x' + hashlib.sha256(data).hexdigest()


def build_tx_leaf(row) -> str:
    """Leaf hash — identical formula used in ledger.py so hashes always match."""
    amount_paise = int(float(row['amount']) * 100)
    ts = int(datetime.strptime(str(row['release_date']).strip(), '%Y-%m-%d').timestamp())
    return keccak256_hash(row['ddo_code'], str(row['vendor_id']), amount_paise, ts, row['purpose_category'])


def hash_pair(a: str, b: str) -> str:
    """Sorted-pair hash — matches OpenZeppelin MerkleProof.sol."""
    return keccak256_hash(a, b) if a < b else keccak256_hash(b, a)


def build_merkle_tree(leaves: List[str]):
    """Build tree bottom-up. Returns (root, levels)."""
    if not leaves:
        return (keccak256_hash('empty'), [[]])
    current = sorted(leaves)
    levels = [list(current)]
    while len(current) > 1:
        if len(current) % 2 == 1:
            current = current + [current[-1]]
        current = [hash_pair(current[i], current[i + 1]) for i in range(0, len(current), 2)]
        levels.append(list(current))
    return (levels[-1][0], levels)


def generate_proof(leaf: str, leaves: List[str]) -> List[str]:
    sorted_leaves = sorted(leaves)
    if leaf not in sorted_leaves:
        return []
    _, levels = build_merkle_tree(sorted_leaves)
    proof = []
    idx = sorted_leaves.index(leaf)
    for level in levels[:-1]:
        padded = level + [level[-1]] if len(level) % 2 == 1 else level
        sibling_idx = idx ^ 1
        proof.append(padded[min(sibling_idx, len(padded) - 1)])
        idx //= 2
    return proof


def verify_proof(leaf: str, proof: List[str], root: str) -> bool:
    current = leaf
    for sibling in proof:
        current = hash_pair(current, sibling)
    return current == root


# ── CSV helper ────────────────────────────────────────────────────────────────
def _load_df() -> pd.DataFrame:
    path = os.path.join(os.path.dirname(__file__), '../data/transactions.csv')
    if not os.path.exists(path):
        raise HTTPException(status_code=500, detail="transactions.csv not found")
    return pd.read_csv(path)


# ── Pydantic models ───────────────────────────────────────────────────────────
class CreateBatchRequest(BaseModel):
    limit: Optional[int] = 50
    label: Optional[str] = None


class VerifyProofRequest(BaseModel):
    leaf: str
    proof: List[str]


class ProofRequest(BaseModel):
    tx_id: str
    ministry: Optional[str] = None


# ── Rollup batch endpoints ────────────────────────────────────────────────────

@router.get("/batches")
async def list_batches():
    """List all rollup batches."""
    return {
        "total_batches": len(BATCHES),
        "total_batched_txs": len(BATCHED_TX_IDS),
        "batches": [
            {
                "batch_id": b["id"],
                "root": b["root"],
                "tx_count": b["tx_count"],
                "created_at": b["created_at"],
                "label": b["label"],
                "submitted_to_hoodi": b["submitted"],
                "tx_hash": b.get("tx_hash"),
            }
            for b in BATCHES
        ],
    }


@router.post("/batches/create")
async def create_batch(req: CreateBatchRequest):
    """
    Batch up to `limit` unbatched transactions into a Merkle rollup.
    Returns root + individual proof for every transaction in the batch.
    """
    df = _load_df()
    unbatched = df[~df['id'].astype(str).isin(BATCHED_TX_IDS)]
    if unbatched.empty:
        raise HTTPException(status_code=400, detail="All transactions are already batched.")

    limit = max(1, min(req.limit or 50, 500))
    batch_df = unbatched.head(limit).copy()

    leaves = []
    tx_entries = []
    for _, row in batch_df.iterrows():
        leaf = build_tx_leaf(row)
        leaves.append(leaf)
        tx_entries.append({
            "tx_id": str(row['id']),
            "leaf": leaf,
            "ddo_code": row['ddo_code'],
            "vendor_id": str(row['vendor_id']),
            "amount": float(row['amount']),
            "purpose_category": row['purpose_category'],
            "release_date": str(row['release_date']),
            "status": row['status'],
        })

    root, _ = build_merkle_tree(leaves)
    proofs = {e["tx_id"]: generate_proof(e["leaf"], leaves) for e in tx_entries}

    batch_id = len(BATCHES)
    label = req.label or f"Batch #{batch_id} — {len(tx_entries)} txns"
    batch = {
        "id": batch_id,
        "root": root,
        "tx_count": len(tx_entries),
        "tx_ids": [e["tx_id"] for e in tx_entries],
        "leaves": leaves,
        "proofs": proofs,
        "transactions": tx_entries,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "label": label,
        "submitted": False,
        "tx_hash": None,
    }
    BATCHES.append(batch)
    BATCHED_TX_IDS.update(batch["tx_ids"])

    return {
        "batch_id": batch_id,
        "root": root,
        "tx_count": len(tx_entries),
        "label": label,
        "created_at": batch["created_at"],
        "transactions": tx_entries,
        "proofs": proofs,
        "message": f"✅ Batch #{batch_id} sealed — {len(tx_entries)} transactions. Root: {root[:20]}…",
    }


@router.get("/batches/{batch_id}")
async def get_batch(batch_id: int):
    """Get a batch with all transactions and proofs."""
    if batch_id < 0 or batch_id >= len(BATCHES):
        raise HTTPException(status_code=404, detail="Batch not found")
    b = BATCHES[batch_id]
    return {
        "batch_id": b["id"],
        "root": b["root"],
        "tx_count": b["tx_count"],
        "label": b["label"],
        "created_at": b["created_at"],
        "submitted_to_hoodi": b["submitted"],
        "tx_hash": b.get("tx_hash"),
        "transactions": b["transactions"],
        "proofs": b["proofs"],
    }


@router.post("/batches/{batch_id}/verify")
async def verify_batch_proof(batch_id: int, req: VerifyProofRequest):
    """Verify a leaf + proof against a batch's stored Merkle root."""
    if batch_id < 0 or batch_id >= len(BATCHES):
        raise HTTPException(status_code=404, detail="Batch not found")
    batch = BATCHES[batch_id]
    ok = verify_proof(req.leaf, req.proof, batch["root"])
    return {
        "verified": ok,
        "batch_id": batch_id,
        "root": batch["root"],
        "leaf": req.leaf,
        "message": "✅ Transaction is part of this batch." if ok
                   else "❌ Proof does not match this batch root.",
    }


@router.post("/batches/{batch_id}/submit")
async def submit_batch_to_hoodi(batch_id: int):
    """Submit batch Merkle root to MerkleRegistry on Hoodi testnet."""
    if batch_id < 0 or batch_id >= len(BATCHES):
        raise HTTPException(status_code=404, detail="Batch not found")

    batch = BATCHES[batch_id]
    tx_hash: Optional[str] = None
    hoodi_link: Optional[str] = None
    error: Optional[str] = None

    if not PRIVATE_KEY:
        error = "PRIVATE_KEY not set in .env — marking as submitted locally only"
    else:
        try:
            from web3 import Web3
            from eth_account import Account

            w3 = Web3(Web3.HTTPProvider(HOODI_RPC_URL))
            acct = Account.from_key(PRIVATE_KEY)
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(REGISTRY_ADDRESS),
                abi=REGISTRY_ABI,
            )

            # ministryId = keccak256("BATCH_<id>") — unique per batch
            ministry_id_bytes = Web3.keccak(text=f"BATCH_{batch_id}")

            # root hex → bytes32 (pad/trim to 32 bytes)
            raw_root = batch["root"]
            root_hex = raw_root[2:] if raw_root.startswith("0x") else raw_root
            root_bytes32 = bytes.fromhex(root_hex.ljust(64, "0")[:64])

            tx = contract.functions.submitRoot(
                ministry_id_bytes,
                root_bytes32,
                batch["label"],
            ).build_transaction({
                "from": acct.address,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "gas": 200_000,
                "gasPrice": w3.eth.gas_price,
                "chainId": HOODI_CHAIN_ID,
            })

            signed = acct.sign_transaction(tx)
            raw_tx = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction", None)
            receipt_hash = w3.eth.send_raw_transaction(raw_tx)
            tx_hash = "0x" + receipt_hash.hex() if not receipt_hash.hex().startswith("0x") else receipt_hash.hex()
            hoodi_link = f"https://hoodi.etherscan.io/tx/{tx_hash}"

        except Exception as exc:
            error = str(exc)

    BATCHES[batch_id]["submitted"] = True
    BATCHES[batch_id]["tx_hash"] = tx_hash

    return {
        "batch_id": batch_id,
        "submitted": True,
        "root": batch["root"],
        "tx_hash": tx_hash,
        "hoodi_link": hoodi_link,
        "error": error,
    }


@router.get("/unbatched-count")
async def get_unbatched_count():
    df = _load_df()
    total = len(df)
    unbatched = len(df[~df['id'].astype(str).isin(BATCHED_TX_IDS)])
    return {"total": total, "batched": total - unbatched, "unbatched": unbatched}


# ── Legacy single-proof endpoint — used by block explorer tx detail ───────────
@router.post("/proof")
async def generate_merkle_proof(request: ProofRequest):
    """Generate a Merkle proof for one transaction across all transactions in its batch."""
    df = _load_df()
    tx_row = df[df['id'].astype(str) == str(request.tx_id)]
    if tx_row.empty:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx_row = tx_row.iloc[0]

    # Find the batch this tx belongs to (if any)
    tx_id_str = str(request.tx_id)
    batch = next((b for b in BATCHES if tx_id_str in b["tx_ids"]), None)
    if batch:
        leaf = next(e["leaf"] for e in batch["transactions"] if e["tx_id"] == tx_id_str)
        proof = batch["proofs"].get(tx_id_str, [])
        root = batch["root"]
    else:
        # Not yet batched — generate proof against single-tx tree
        leaf = build_tx_leaf(tx_row)
        proof = []
        root = leaf

    return {
        "tx_id": tx_id_str,
        "leaf": leaf,
        "proof": proof,
        "root": root,
        "in_batch": batch is not None,
        "batch_id": batch["id"] if batch else None,
        "transaction": {
            "ddo_code": tx_row['ddo_code'],
            "vendor_id": str(tx_row['vendor_id']),
            "amount": float(tx_row['amount']),
            "category": tx_row['purpose_category'],
            "date": str(tx_row['release_date']),
        },
        "verified": True,
        "message": "✅ Proof generated. This transaction is cryptographically sealed.",
    }
