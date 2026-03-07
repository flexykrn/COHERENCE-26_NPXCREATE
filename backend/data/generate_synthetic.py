# ── ZERO external dependencies — only Python built-in stdlib ──────────────────
# Run with: python generate_synthetic.py
# Generates: ddo_accounts.csv, vendors.csv, budget_allocations.csv,
#            transactions.csv, intelligence_alerts.csv
import csv, random, hashlib, os
from datetime import datetime, timedelta

random.seed(42)
OUT = os.path.dirname(os.path.abspath(__file__))

# ── REFERENCE DATA ──────────────────────────────────────────────────────────
DISTRICTS = [
    'Mumbai','Pune','Nashik','Nagpur','Aurangabad','Thane','Solapur','Kolhapur',
    'Amravati','Nanded','Ahmednagar','Dhule','Jalgaon','Akola','Latur','Osmanabad',
    'Beed','Parbhani','Hingoli','Washim','Buldhana','Yavatmal','Chandrapur',
    'Gadchiroli','Wardha','Bhandara','Gondia','Sindhudurg','Ratnagiri','Raigad',
    'Palghar','Satara'
]
JURISDICTION_LEVELS = ['State', 'District', 'Block', 'Village']
PURPOSE_CATEGORIES = [
    'Construction','Procurement','Services','Maintenance',
    'Training','Equipment','Infrastructure','Subsidies','Welfare','Operations'
]
COMPANY_PREFIXES = [
    'Bharat','Hindustan','National','India','Apex','Pioneer','United','Prime',
    'Global','Metro','Sunrise','Shree','Jai','Sai','New India','Modern',
    'Standard','General','Allied','Eastern','Western','Northern','Southern',
    'Central','Integrated','Advanced','Dynamic','Reliable','Supreme','Royal'
]
COMPANY_SUFFIXES = [
    'Enterprises','Solutions','Constructions','Services','Technologies',
    'Infrastructure Pvt Ltd','Contractors','Developers','Systems','Industries',
    'Projects','Agencies','Associates','Works','Suppliers','Traders',
    'Consultants','Engineers','Builders','Distributors'
]
VENDOR_CATEGORIES = [
    'Construction','Pharmaceuticals','IT Services','Transport',
    'Stationery','Civil Works','Electrical','Plumbing','Catering',
    'Security','Cleaning','Printing','Equipment Supply','Logistics','Consulting'
]

def fake_pan_hash(seed):
    return hashlib.sha256(f"PAN{seed}".encode()).hexdigest()[:20].upper()

def fake_company(i):
    return f"{random.choice(COMPANY_PREFIXES)} {random.choice(COMPANY_SUFFIXES)}"

def rand_date(year, month):
    if month == 2:
        day = random.randint(1, 28)
    elif month in [4,6,9,11]:
        day = random.randint(1, 30)
    else:
        day = random.randint(1, 31)
    return datetime(year, month, day)

def write_csv(filename, fieldnames, rows):
    path = os.path.join(OUT, filename)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  {filename}: {len(rows)} rows")

# ── READ DEPARTMENTS ─────────────────────────────────────────────────────────
departments = []
dept_path = os.path.join(OUT, 'department.csv')
with open(dept_path, newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        departments.append(row)
print(f"Loaded {len(departments)} departments")

# ── 1. DDO ACCOUNTS (~250 rows) ──────────────────────────────────────────────
print("Generating ddo_accounts.csv...")
ddo_rows = []
ddo_id = 1
dept_to_ddos = {}  # dept_id -> list of ddo_codes

for dept in departments:
    num_ddos = random.randint(4, 7)
    ddos_for_dept = []
    for _ in range(num_ddos):
        ddo_code = f"DDO{str(ddo_id).zfill(4)}"
        ddo_rows.append({
            'id': ddo_id,
            'ddo_code': ddo_code,
            'dept_id': dept['id'],
            'district': random.choice(DISTRICTS),
            'jurisdiction_level': random.choice(JURISDICTION_LEVELS),
        })
        ddos_for_dept.append(ddo_code)
        ddo_id += 1
    dept_to_ddos[dept['id']] = ddos_for_dept

write_csv('ddo_accounts.csv',
    ['id','ddo_code','dept_id','district','jurisdiction_level'],
    ddo_rows)

# ── 2. VENDORS (500 rows) ────────────────────────────────────────────────────
print("Generating vendors.csv...")
vendor_rows = []
# Normal vendors (490) + shell vendors (10)
for i in range(1, 491):
    reg_year = random.randint(2010, 2022)
    reg_date = datetime(reg_year, random.randint(1,12), random.randint(1,28)).strftime('%Y-%m-%d')
    vendor_rows.append({
        'id': i,
        'name': fake_company(i),
        'pan_hash': fake_pan_hash(i),
        'category': random.choice(VENDOR_CATEGORIES),
        'registration_date': reg_date,
        'risk_score': round(random.uniform(0.05, 0.55), 2),
    })
# Shell vendors — high risk, recently registered, similar names
shell_names = [
    'Vriddhi Enterprises Pvt Ltd','Pravah Infrastructure Pvt Ltd',
    'Siddhi Constructions Pvt Ltd','Nidhi Projects Pvt Ltd',
    'Riddhi Services Pvt Ltd','Aadesh Developers Pvt Ltd',
    'Pratham Builders Pvt Ltd','Sahyog Contractors Pvt Ltd',
    'Saksham Engineers Pvt Ltd','Pushpak Works Pvt Ltd'
]
for j, sname in enumerate(shell_names):
    reg_date = datetime(random.randint(2022,2023), random.randint(1,12), random.randint(1,28)).strftime('%Y-%m-%d')
    vendor_rows.append({
        'id': 490 + j + 1,
        'name': sname,
        'pan_hash': fake_pan_hash(f"SHELL{j}"),
        'category': 'Construction',
        'registration_date': reg_date,
        'risk_score': round(random.uniform(0.80, 0.98), 2),
    })

write_csv('vendors.csv',
    ['id','name','pan_hash','category','registration_date','risk_score'],
    vendor_rows)
SHELL_VENDOR_IDS = list(range(491, 501))
NORMAL_VENDOR_IDS = list(range(1, 491))

# ── 3. BUDGET ALLOCATIONS (50 depts × 3 years × 4 quarters = 600 rows) ──────
print("Generating budget_allocations.csv...")
alloc_rows = []
alloc_id = 1
# Per-dept base amounts — computed proportional to DDO count so utilization stays 65-90%
# Each DDO spends ~6.5Cr/year on average (45 txns × ₹14L avg). Allocation = spending / target_util.
ddos_per_dept = {}
for row in ddo_rows:
    ddos_per_dept[row['dept_id']] = ddos_per_dept.get(row['dept_id'], 0) + 1

AVG_SPEND_PER_DDO_CR = 6.5 * 1e7   # ₹6.5Cr per DDO per year
dept_bases = {}
for dept in departments:
    did = dept['id']
    nddo = ddos_per_dept.get(str(did), ddos_per_dept.get(did, 5))
    expected_spend = nddo * AVG_SPEND_PER_DDO_CR
    target_util = random.uniform(0.65, 0.90)   # 65-90% target utilization
    dept_bases[str(did)] = round(expected_spend / target_util / 1000) * 1000
# Also expose numeric keys for backward compat
for dept in departments:
    dept_bases[dept['id']] = dept_bases[str(dept['id'])]

for dept in departments:
    base = dept_bases[dept['id']]
    for year in [2022, 2023, 2024]:
        # Slight year-on-year growth
        year_base = int(base * (1 + 0.08 * (year - 2022)))
        for quarter, q_factor in enumerate([0.15, 0.20, 0.25, 0.40], 1):
            allocated = round(year_base * q_factor / 1000) * 1000
            revised   = round(allocated * random.uniform(0.88, 1.12) / 1000) * 1000
            # Revenue schemes have higher target utilization than capital
            if dept['scheme_type'] == 'revenue':
                target_util = round(random.uniform(82, 97), 1)
            else:
                target_util = round(random.uniform(58, 82), 1)
            alloc_rows.append({
                'id': alloc_id,
                'dept_id': dept['id'],
                'fiscal_year': year,
                'quarter': quarter,
                'allocated_amount': allocated,
                'revised_amount': revised,
                'target_utilization_pct': target_util,
            })
            alloc_id += 1

write_csv('budget_allocations.csv',
    ['id','dept_id','fiscal_year','quarter','allocated_amount','revised_amount','target_utilization_pct'],
    alloc_rows)

# ── 4. TRANSACTIONS (~22,000 rows) ──────────────────────────────────────────
print("Generating transactions.csv (this takes ~10 seconds)...")
txn_rows = []
txn_id = 1
FISCAL_YEARS = [2022, 2023, 2024]

# Mark ~8% of DDOs as collusion DDOs
all_ddo_codes = [r['ddo_code'] for r in ddo_rows]
colluding_ddos = set(random.sample(all_ddo_codes, max(1, len(all_ddo_codes) // 10)))

# Month weight — heavy Q4 bias (mimics year-end rush)
MONTH_WEIGHTS = [3,3,4,5,5,6,6,7,8,10,15,18]

for ddo_row in ddo_rows:
    ddo_code = ddo_row['ddo_code']
    is_colluding = ddo_code in colluding_ddos
    vendor_pool = (
        random.sample(SHELL_VENDOR_IDS, min(3, len(SHELL_VENDOR_IDS)))
        if is_colluding
        else random.sample(NORMAL_VENDOR_IDS, random.randint(6, 18))
    )
    dept_base = dept_bases.get(ddo_row['dept_id'], 200000)

    for year in FISCAL_YEARS:
        txn_count = random.randint(25, 70)
        for _ in range(txn_count):
            month = random.choices(range(1, 13), weights=MONTH_WEIGHTS)[0]
            release = rand_date(year, month)
            phantom = random.random() < 0.08     # 8% phantom
            vendor_id = random.choice(vendor_pool)
            amount = round(random.randint(1, 30) * 100000 * random.uniform(0.4, 1.5) / 1000) * 1000
            purpose = random.choice(PURPOSE_CATEGORIES)
            status = 'paid' if phantom else 'utilized'
            util_date = None if phantom else (release + timedelta(days=random.randint(4, 40))).strftime('%Y-%m-%d')
            txn_rows.append({
                'id': txn_id,
                'sanction_id': f'SAN{str(txn_id).zfill(6)}',
                'ddo_code': ddo_code,
                'vendor_id': vendor_id,
                'amount': amount,
                'purpose_category': purpose,
                'release_date': release.strftime('%Y-%m-%d'),
                'utilization_date': util_date,
                'status': status,
            })
            txn_id += 1

# Inject duplicate payments (~5% of utilized transactions)
base_txns = [t for t in txn_rows if t['status'] == 'utilized']
dup_sample = random.sample(base_txns, int(len(base_txns) * 0.05))
for t in dup_sample:
    dup = dict(t)
    dup['id'] = txn_id
    dup['sanction_id'] = f'SAN{str(txn_id).zfill(6)}'
    orig_date = datetime.strptime(t['release_date'], '%Y-%m-%d')
    dup_date = orig_date + timedelta(days=random.randint(1, 13))
    dup['release_date'] = dup_date.strftime('%Y-%m-%d')
    dup['utilization_date'] = (dup_date + timedelta(days=random.randint(3,15))).strftime('%Y-%m-%d')
    txn_rows.append(dup)
    txn_id += 1

write_csv('transactions.csv',
    ['id','sanction_id','ddo_code','vendor_id','amount','purpose_category',
     'release_date','utilization_date','status'],
    txn_rows)

# ── 5. INTELLIGENCE ALERTS ───────────────────────────────────────────────────
print("Generating intelligence_alerts.csv...")
alert_rows = []
alert_id = 1

# Build lookup: ddo_code -> dept_id
ddo_to_dept = {r['ddo_code']: r['dept_id'] for r in ddo_rows}

# Phantom alerts
for txn in txn_rows:
    if txn['status'] == 'paid' and not txn['utilization_date']:
        alert_rows.append({
            'alert_id': alert_id,
            'tx_id': txn['id'],
            'dept_id': ddo_to_dept.get(txn['ddo_code'], ''),
            'alert_type': 'Phantom Utilization',
            'confidence_score': round(random.uniform(0.84, 0.96), 2),
            'description': f"Transaction {txn['sanction_id']} marked paid but no utilization recorded within 30 days.",
            'timestamp': (datetime.strptime(txn['release_date'], '%Y-%m-%d') + timedelta(days=35)).strftime('%Y-%m-%d %H:%M:%S'),
        })
        alert_id += 1

# Duplicate alerts — find matching vendor+amount pairs
from collections import defaultdict
vendor_amount_map = defaultdict(list)
for txn in txn_rows:
    key = (txn['vendor_id'], txn['amount'])
    vendor_amount_map[key].append(txn)

for key, group in vendor_amount_map.items():
    if len(group) >= 2:
        group_sorted = sorted(group, key=lambda x: x['release_date'])
        for i in range(1, len(group_sorted)):
            d1 = datetime.strptime(group_sorted[i-1]['release_date'], '%Y-%m-%d')
            d2 = datetime.strptime(group_sorted[i]['release_date'], '%Y-%m-%d')
            if abs((d2 - d1).days) <= 14 and group_sorted[i]['ddo_code'] != group_sorted[i-1]['ddo_code']:
                alert_rows.append({
                    'alert_id': alert_id,
                    'tx_id': group_sorted[i]['id'],
                    'dept_id': ddo_to_dept.get(group_sorted[i]['ddo_code'], ''),
                    'alert_type': 'Duplicate Payment',
                    'confidence_score': round(random.uniform(0.78, 0.91), 2),
                    'description': f"Duplicate payment to vendor {key[0]} — same amount ₹{int(key[1]):,} paid {abs((d2-d1).days)} days apart.",
                    'timestamp': group_sorted[i]['release_date'] + ' 09:00:00',
                })
                alert_id += 1

# Year-end rush alerts
from collections import defaultdict as dd2
ddo_year_spend = dd2(lambda: dd2(float))
ddo_year_q4 = dd2(lambda: dd2(float))
for txn in txn_rows:
    year = txn['release_date'][:4]
    month = int(txn['release_date'][5:7])
    ddo_year_spend[txn['ddo_code']][year] += txn['amount']
    if month in [10, 11, 12]:
        ddo_year_q4[txn['ddo_code']][year] += txn['amount']

for ddo_code, year_totals in ddo_year_spend.items():
    for year, total in year_totals.items():
        q4 = ddo_year_q4[ddo_code][year]
        if total > 0 and (q4 / total) > 0.60:
            alert_rows.append({
                'alert_id': alert_id,
                'tx_id': None,
                'dept_id': ddo_to_dept.get(ddo_code, ''),
                'alert_type': 'Year-End Rush',
                'confidence_score': round(random.uniform(0.68, 0.84), 2),
                'description': f"DDO {ddo_code} spent {round(q4/total*100,1)}% of FY{year} budget in Oct–Dec.",
                'timestamp': f'{year}-12-31 23:59:00',
            })
            alert_id += 1

# Vendor collusion alerts — shell vendors receiving from 5+ DDOs
shell_ddo_connections = defaultdict(set)
for txn in txn_rows:
    if int(txn['vendor_id']) in SHELL_VENDOR_IDS:
        shell_ddo_connections[txn['vendor_id']].add(txn['ddo_code'])

for vendor_id, connected_ddos in shell_ddo_connections.items():
    if len(connected_ddos) >= 5:
        alert_rows.append({
            'alert_id': alert_id,
            'tx_id': None,
            'dept_id': None,
            'alert_type': 'Vendor Collusion Network',
            'confidence_score': round(random.uniform(0.80, 0.94), 2),
            'description': f"High-risk vendor #{vendor_id} connected to {len(connected_ddos)} DDOs across departments — possible shell vendor pattern.",
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        })
        alert_id += 1

write_csv('intelligence_alerts.csv',
    ['alert_id','tx_id','dept_id','alert_type','confidence_score','description','timestamp'],
    alert_rows)

# ── SUMMARY ──────────────────────────────────────────────────────────────────
print("\n All files generated in backend/data/")
print(f"   Anomaly breakdown:")
from collections import Counter
type_counts = Counter(a['alert_type'] for a in alert_rows)
for k, v in type_counts.items():
    print(f"     {k}: {v}")
