"""
Merkle Batch Generator - Create batches of transactions for rollup submission
Generates Merkle trees and prepares data for smart contract submission
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import hashlib
import pandas as pd
import json
import os
from datetime import datetime

router = APIRouter(prefix="/api/batches", tags=["batches"])

# In-memory storage for batches (use database in production)
BATCHES_STORE = []
BATCH_FILE = "backend/data/batches.json"

def ensure_batch_file():
    """Ensure batch storage file exists"""
    if not os.path.exists(BATCH_FILE):
        os.makedirs(os.path.dirname(BATCH_FILE), exist_ok=True)
        with open(BATCH_FILE, 'w') as f:
            json.dump([], f)

def load_batches():
    """Load batches from file"""
    ensure_batch_file()
    try:
        with open(BATCH_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_batches(batches):
    """Save batches to file"""
    ensure_batch_file()
    with open(BATCH_FILE, 'w') as f:
        json.dump(batches, f, indent=2)

def keccak256_hash(*args) -> str:
    """Simplified keccak256 using sha256 for demo"""
    data = ''.join(str(arg) for arg in args).encode('utf-8')
    return '0x' + hashlib.sha256(data).hexdigest()

def build_tx_leaf(row) -> str:
    """Build transaction leaf hash (same as merkle.py)"""
    ddo_id = row['ddo_code']
    vendor_id = str(row['vendor_id'])
    amount_paise = int(float(row['amount']) * 100)
    timestamp = int(datetime.strptime(row['release_date'], '%Y-%m-%d').timestamp())
    category = row['purpose_category']
    
    return keccak256_hash(ddo_id, vendor_id, amount_paise, timestamp, category)

def hash_pair(a: str, b: str) -> str:
    """Hash two nodes using sorted-pair algorithm"""
    if a < b:
        return keccak256_hash(a, b)
    else:
        return keccak256_hash(b, a)

def build_merkle_tree(leaves: List[str]) -> tuple:
    """Build Merkle tree and return (root, tree_levels, proofs)"""
    if not leaves:
        return (keccak256_hash(''), [[]], {})
    
    leaves = sorted(leaves)
    levels = [leaves]
    
    current_level = leaves
    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            if i + 1 < len(current_level):
                parent = hash_pair(current_level[i], current_level[i + 1])
            else:
                parent = current_level[i]
            next_level.append(parent)
        levels.append(next_level)
        current_level = next_level
    
    root = levels[-1][0]
    
    # Generate proofs for all leaves
    proofs = {}
    for idx, leaf in enumerate(leaves):
        proof = []
        leaf_idx = idx
        
        for level in levels[:-1]:
            if leaf_idx % 2 == 0:
                if leaf_idx + 1 < len(level):
                    proof.append(level[leaf_idx + 1])
            else:
                proof.append(level[leaf_idx - 1])
            leaf_idx //= 2
        
        proofs[leaf] = proof
    
    return (root, levels, proofs)

class BatchRequest(BaseModel):
    start_block: int
    end_block: int
    batch_size: Optional[int] = 50

class BatchSubmitRequest(BaseModel):
    batch_id: str
    tx_hash: Optional[str] = None

@router.get("/stats")
async def get_batch_stats():
    """Get batching statistics"""
    batches = load_batches()
    
    pending = len([b for b in batches if b['status'] == 'pending'])
    submitted = len([b for b in batches if b['status'] == 'submitted'])
    verified = len([b for b in batches if b['status'] == 'verified'])
    
    return {
        "total_batches": len(batches),
        "pending_batches": pending,
        "submitted_batches": submitted,
        "verified_batches": verified,
        "total_transactions_batched": sum(b['transaction_count'] for b in batches)
    }

@router.post("/create")
async def create_batch(request: BatchRequest):
    """Create a new batch from unbatched transactions"""
    try:
        # Load transactions
        df = pd.read_csv('backend/data/transactions.csv')
        
        # Filter by block range if specified
        if request.start_block and request.end_block:
            block_col = 'block_number' if 'block_number' in df.columns else 'id'
            df = df[(df[block_col] >= request.start_block) & 
                    (df[block_col] <= request.end_block)]
        
        # Limit batch size
        batch_size = min(request.batch_size or 50, len(df))
        df_batch = df.head(batch_size)
        
        if len(df_batch) == 0:
            raise HTTPException(status_code=400, detail="No transactions found in range")
        
        # Generate leaves
        leaves = []
        transactions = []
        
        for idx, row in df_batch.iterrows():
            leaf = build_tx_leaf(row)
            leaves.append(leaf)
            transactions.append({
                "tx_id": str(row['id']),
                "ddo_code": row['ddo_code'],
                "vendor_id": str(row['vendor_id']),
                "amount": float(row['amount']),
                "category": row['purpose_category'],
                "date": row['release_date'],
                "leaf_hash": leaf
            })
        
        # Build Merkle tree
        root, levels, proofs = build_merkle_tree(leaves)
        
        # Create batch object
        batch_id = f"batch_{len(load_batches()) + 1}_{int(datetime.now().timestamp())}"
        
        batch = {
            "batch_id": batch_id,
            "merkle_root": root,
            "transaction_count": len(transactions),
            "transactions": transactions,
            "proofs": {tx['leaf_hash']: proofs[tx['leaf_hash']] for tx in transactions},
            "created_at": datetime.now().isoformat(),
            "status": "pending",
            "start_block": int(request.start_block) if request.start_block else None,
            "end_block": int(request.end_block) if request.end_block else None,
            "contract_batch_index": None,
            "tx_hash": None
        }
        
        # Save batch
        batches = load_batches()
        batches.append(batch)
        save_batches(batches)
        
        return {
            "success": True,
            "batch_id": batch_id,
            "merkle_root": root,
            "transaction_count": len(transactions),
            "batch": batch
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_batches(status: Optional[str] = None):
    """List all batches"""
    batches = load_batches()
    
    if status:
        batches = [b for b in batches if b['status'] == status]
    
    # Return summary without full transaction list
    return {
        "batches": [{
            "batch_id": b['batch_id'],
            "merkle_root": b['merkle_root'],
            "transaction_count": b['transaction_count'],
            "created_at": b['created_at'],
            "status": b['status'],
            "contract_batch_index": b.get('contract_batch_index'),
            "tx_hash": b.get('tx_hash')
        } for b in batches]
    }

@router.get("/{batch_id}")
async def get_batch_detail(batch_id: str):
    """Get full batch details including all transactions and proofs"""
    batches = load_batches()
    batch = next((b for b in batches if b['batch_id'] == batch_id), None)
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return batch

@router.post("/{batch_id}/submit")
async def mark_batch_submitted(batch_id: str, request: BatchSubmitRequest):
    """Mark a batch as submitted to blockchain"""
    batches = load_batches()
    batch_idx = next((i for i, b in enumerate(batches) if b['batch_id'] == batch_id), None)
    
    if batch_idx is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    batches[batch_idx]['status'] = 'submitted'
    batches[batch_idx]['tx_hash'] = request.tx_hash
    batches[batch_idx]['submitted_at'] = datetime.now().isoformat()
    
    save_batches(batches)
    
    return {
        "success": True,
        "batch_id": batch_id,
        "status": "submitted"
    }

@router.post("/{batch_id}/verify")
async def verify_transaction_in_batch(
    batch_id: str, 
    tx_id: str
):
    """Verify a specific transaction in a batch"""
    batches = load_batches()
    batch = next((b for b in batches if b['batch_id'] == batch_id), None)
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Find transaction
    tx = next((t for t in batch['transactions'] if t['tx_id'] == tx_id), None)
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found in batch")
    
    leaf = tx['leaf_hash']
    proof = batch['proofs'].get(leaf, [])
    
    # Verify proof
    computed_hash = leaf
    for proof_element in proof:
        if computed_hash < proof_element:
            computed_hash = keccak256_hash(computed_hash, proof_element)
        else:
            computed_hash = keccak256_hash(proof_element, computed_hash)
    
    is_valid = computed_hash == batch['merkle_root']
    
    return {
        "valid": is_valid,
        "transaction": tx,
        "leaf": leaf,
        "proof": proof,
        "root": batch['merkle_root'],
        "computed_root": computed_hash
    }

@router.delete("/{batch_id}")
async def delete_batch(batch_id: str):
    """Delete a pending batch"""
    batches = load_batches()
    batch = next((b for b in batches if b['batch_id'] == batch_id), None)
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Can only delete pending batches")
    
    batches = [b for b in batches if b['batch_id'] != batch_id]
    save_batches(batches)
    
    return {"success": True, "message": "Batch deleted"}
