"""
Local Transaction Ledger - Blockchain-style transaction storage
Built from transactions.csv at startup, queryable by hash/block
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Optional
import pandas as pd
import hashlib
from datetime import datetime
import os

router = APIRouter(prefix="/api/ledger", tags=["ledger"])

# In-memory ledger storage
BLOCKS: List[Dict] = []
TX_HASH_MAP: Dict[str, Dict] = {}
BLOCK_SIZE = 50  # Transactions per block

def keccak256_hash(*args) -> str:
    """
    Compute keccak256 hash (simplified using sha256 for demo)
    In production, use eth_abi.encode and Web3.keccak
    """
    data = ''.join(str(arg) for arg in args).encode('utf-8')
    return '0x' + hashlib.sha256(data).hexdigest()

def build_tx_hash(row) -> str:
    """
    Build transaction hash from row data
    Formula: keccak256(ddo_code, vendor_id, amount_paise, timestamp, category)
    """
    ddo_id = row['ddo_code']
    vendor_id = str(row['vendor_id'])
    amount_paise = int(float(row['amount']) * 100)  # Convert to paise
    timestamp = int(datetime.strptime(row['release_date'], '%Y-%m-%d').timestamp())
    category = row['purpose_category']
    
    return keccak256_hash(ddo_id, vendor_id, amount_paise, timestamp, category)

def build_ledger():
    """
    Build blockchain ledger from transactions.csv at startup
    """
    global BLOCKS, TX_HASH_MAP
    
    csv_path = os.path.join(os.path.dirname(__file__), '../data/transactions.csv')
    
    if not os.path.exists(csv_path):
        print("⚠️ transactions.csv not found, ledger not initialized")
        return
    
    print("🔗 Building blockchain ledger...")
    
    df = pd.read_csv(csv_path)
    
    # Load anomaly flags
    alerts_path = os.path.join(os.path.dirname(__file__), '../data/intelligence_alerts.csv')
    alert_tx_ids = set()
    if os.path.exists(alerts_path):
        alerts_df = pd.read_csv(alerts_path)
        if 'txn_id' in alerts_df.columns:
            alert_tx_ids = set(alerts_df['txn_id'].dropna())
    
    # Sort by release_date for chronological blocks
    df = df.sort_values('release_date').reset_index(drop=True)
    
    # Build blocks
    block_number = 0
    for i in range(0, len(df), BLOCK_SIZE):
        block_txs = df.iloc[i:i+BLOCK_SIZE]
        
        # Build transaction list with hashes
        transactions = []
        tx_hashes = []
        
        for _, row in block_txs.iterrows():
            tx_hash = build_tx_hash(row)
            tx_hashes.append(tx_hash)
            
            tx = {
                'tx_hash': tx_hash,
                'tx_id': str(row['id']),
                'ddo_code': row['ddo_code'],
                'vendor_id': str(row['vendor_id']),
                'amount': float(row['amount']),
                'purpose_category': row['purpose_category'],
                'release_date': row['release_date'],
                'status': row['status'],
                'is_anomaly': str(row['id']) in alert_tx_ids,
                'block_number': block_number
            }
            
            transactions.append(tx)
            TX_HASH_MAP[tx_hash] = tx
        
        # Build block hash from all tx hashes
        block_hash = keccak256_hash(*tx_hashes)
        
        # Get block timestamp (earliest release_date in block)
        block_timestamp = int(datetime.strptime(
            block_txs.iloc[0]['release_date'], '%Y-%m-%d'
        ).timestamp())
        
        # Build block
        block = {
            'block_number': block_number,
            'block_hash': block_hash,
            'tx_count': len(transactions),
            'timestamp': block_timestamp,
            'date': block_txs.iloc[0]['release_date'],
            'transactions': transactions
        }
        
        BLOCKS.append(block)
        block_number += 1
    
    print(f"✅ Ledger built: {len(BLOCKS)} blocks, {len(TX_HASH_MAP)} transactions")

@router.get("/stats")
async def get_ledger_stats():
    """Get overall ledger statistics"""
    total_txs = len(TX_HASH_MAP)
    total_blocks = len(BLOCKS)
    
    anomaly_count = sum(1 for tx in TX_HASH_MAP.values() if tx['is_anomaly'])
    
    last_block = BLOCKS[-1] if BLOCKS else None
    
    return {
        'total_blocks': total_blocks,
        'total_transactions': total_txs,
        'anomaly_count': anomaly_count,
        'block_size': BLOCK_SIZE,
        'last_block_number': last_block['block_number'] if last_block else 0,
        'last_block_time': last_block['date'] if last_block else None
    }

@router.get("/blocks")
async def get_blocks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    anomaly_only: bool = Query(False)
):
    """Get paginated list of blocks"""
    
    # Filter blocks with anomalies if requested
    blocks_to_show = BLOCKS
    if anomaly_only:
        blocks_to_show = [
            b for b in BLOCKS 
            if any(tx['is_anomaly'] for tx in b['transactions'])
        ]
    
    total = len(blocks_to_show)
    start = (page - 1) * limit
    end = start + limit
    
    blocks_page = blocks_to_show[start:end]
    
    # Return block summary (without full transactions)
    blocks_summary = []
    for block in blocks_page:
        blocks_summary.append({
            'block_number': block['block_number'],
            'block_hash': block['block_hash'],
            'tx_count': block['tx_count'],
            'date': block['date'],
            'timestamp': block['timestamp'],
            'has_anomalies': any(tx['is_anomaly'] for tx in block['transactions'])
        })
    
    return {
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': (total + limit - 1) // limit,
        'blocks': blocks_summary
    }

@router.get("/blocks/{block_number}")
async def get_block_detail(block_number: int):
    """Get detailed block with all transactions"""
    
    if block_number < 0 or block_number >= len(BLOCKS):
        raise HTTPException(status_code=404, detail="Block not found")
    
    return BLOCKS[block_number]

@router.get("/tx/{tx_hash}")
async def get_transaction(tx_hash: str):
    """Get transaction by hash"""
    
    if tx_hash not in TX_HASH_MAP:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return TX_HASH_MAP[tx_hash]

@router.get("/search")
async def search_transactions(
    q: Optional[str] = None,
    ddo: Optional[str] = None,
    vendor: Optional[str] = None,
    anomaly: Optional[bool] = None,
    limit: int = Query(50, le=500)
):
    """Search transactions by various criteria"""
    
    results = []
    
    for tx in TX_HASH_MAP.values():
        # Apply filters
        if ddo and ddo.upper() not in tx['ddo_code'].upper():
            continue
        if vendor and vendor not in str(tx['vendor_id']):
            continue
        if anomaly is not None and tx['is_anomaly'] != anomaly:
            continue
        if q and q.upper() not in f"{tx['ddo_code']} {tx['purpose_category']} {tx['tx_id']}".upper():
            continue
        
        results.append(tx)
        
        if len(results) >= limit:
            break
    
    return {
        'total': len(results),
        'results': results
    }

# Initialize ledger on module load
build_ledger()
