// Government scheme budget data for India

export interface StateData {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  districts: DistrictData[];
}

export interface DistrictData {
  id: string;
  name: string;
  allocated: number;
  spent: number;
}

export interface SchemeData {
  id: string;
  name: string;
  icon: string;
  allocated: number;
  spent: number;
  utilization: number;
  trend: number[];
  anomalies: AnomalyData[];
  category: string;
}

export interface AnomalyData {
  id: string;
  type: 'spike' | 'low_utilization' | 'suspicious';
  severity: 'high' | 'medium' | 'low';
  description: string;
  amount: number;
  date: string;
}

// Major government schemes with budget data
export const schemes: SchemeData[] = [
  {
    id: 'pm-awas',
    name: 'PM Awas Yojana',
    icon: '🏠',
    category: 'Housing',
    allocated: 48000,
    spent: 38000,
    utilization: 79,
    trend: [30, 32, 34, 35, 36, 37, 38, 37, 38, 38, 38, 38],
    anomalies: [
      {
        id: 'a1',
        type: 'suspicious',
        severity: 'high',
        description: 'Multiple duplicate beneficiary entries detected in Maharashtra',
        amount: 2400,
        date: '2025-11-20'
      }
    ]
  },
  {
    id: 'ayushman-bharat',
    name: 'Ayushman Bharat',
    icon: '🏥',
    category: 'Healthcare',
    allocated: 64000,
    spent: 52000,
    utilization: 81,
    trend: [40, 42, 44, 45, 47, 49, 50, 48, 50, 52, 52, 52],
    anomalies: [
      {
        id: 'a2',
        type: 'spike',
        severity: 'medium',
        description: 'Unusual surge in medical claims from private hospitals in Delhi',
        amount: 5200,
        date: '2025-12-01'
      }
    ]
  },
  {
    id: 'swachh-bharat',
    name: 'Swachh Bharat Mission',
    icon: '♻️',
    category: 'Sanitation',
    allocated: 35000,
    spent: 18000,
    utilization: 51,
    trend: [12, 14, 15, 16, 17, 18, 19, 18, 17, 18, 18, 18],
    anomalies: [
      {
        id: 'a3',
        type: 'low_utilization',
        severity: 'high',
        description: 'Toilet construction fund severely underutilized in rural areas',
        amount: 17000,
        date: '2025-10-15'
      }
    ]
  },
  {
    id: 'digital-india',
    name: 'Digital India',
    icon: '💻',
    category: 'Technology',
    allocated: 42000,
    spent: 35000,
    utilization: 83,
    trend: [25, 27, 29, 30, 32, 33, 34, 35, 35, 35, 35, 35],
    anomalies: []
  },
  {
    id: 'pm-kisan',
    name: 'PM-KISAN',
    icon: '🌾',
    category: 'Agriculture',
    allocated: 75000,
    spent: 68000,
    utilization: 91,
    trend: [55, 58, 60, 62, 64, 65, 66, 67, 68, 68, 68, 68],
    anomalies: [
      {
        id: 'a4',
        type: 'suspicious',
        severity: 'high',
        description: 'Payments made to invalid bank accounts in UP',
        amount: 3400,
        date: '2025-11-28'
      }
    ]
  },
  {
    id: 'ujjwala',
    name: 'Ujjwala Yojana',
    icon: '🔥',
    category: 'Energy',
    allocated: 28000,
    spent: 24000,
    utilization: 86,
    trend: [18, 19, 20, 21, 22, 22, 23, 23, 24, 24, 24, 24],
    anomalies: []
  },
  {
    id: 'mid-day-meal',
    name: 'Mid-Day Meal Scheme',
    icon: '🍽️',
    category: 'Education',
    allocated: 38000,
    spent: 32000,
    utilization: 84,
    trend: [25, 26, 27, 28, 29, 30, 30, 31, 32, 32, 32, 32],
    anomalies: [
      {
        id: 'a5',
        type: 'spike',
        severity: 'medium',
        description: 'Inflated food procurement costs in Karnataka',
        amount: 1800,
        date: '2025-09-12'
      }
    ]
  },
  {
    id: 'mnrega',
    name: 'MGNREGA',
    icon: '👷',
    category: 'Employment',
    allocated: 98000,
    spent: 72000,
    utilization: 73,
    trend: [58, 60, 62, 64, 66, 68, 69, 70, 71, 72, 72, 72],
    anomalies: [
      {
        id: 'a6',
        type: 'low_utilization',
        severity: 'medium',
        description: 'Work allocation declined in Q3 despite demand',
        amount: 26000,
        date: '2025-10-30'
      }
    ]
  }
];

// State-wise budget data mapped to svg-maps/india location IDs
export const states: StateData[] = [
  {
    id: 'mh',
    name: 'Maharashtra',
    allocated: 125000,
    spent: 89000,
    districts: [
      { id: 'mumbai', name: 'Mumbai', allocated: 35000, spent: 28000 },
      { id: 'pune', name: 'Pune', allocated: 22000, spent: 18000 },
      { id: 'nagpur', name: 'Nagpur', allocated: 18000, spent: 12000 },
      { id: 'nashik', name: 'Nashik', allocated: 15000, spent: 11000 },
      { id: 'aurangabad', name: 'Aurangabad', allocated: 12000, spent: 8000 },
      { id: 'thane', name: 'Thane', allocated: 23000, spent: 12000 }
    ]
  },
  {
    id: 'ka',
    name: 'Karnataka',
    allocated: 98000,
    spent: 72000,
    districts: [
      { id: 'bangalore', name: 'Bengaluru', allocated: 30000, spent: 25000 },
      { id: 'mysore', name: 'Mysuru', allocated: 18000, spent: 14000 },
      { id: 'hubli', name: 'Hubli-Dharwad', allocated: 14000, spent: 10000 },
      { id: 'mangalore', name: 'Mangaluru', allocated: 12000, spent: 9000 },
      { id: 'belgaum', name: 'Belgaum', allocated: 11000, spent: 7000 },
      { id: 'gulbarga', name: 'Gulbarga', allocated: 13000, spent: 7000 }
    ]
  },
  {
    id: 'tn',
    name: 'Tamil Nadu',
    allocated: 110000,
    spent: 85000,
    districts: [
      { id: 'chennai', name: 'Chennai', allocated: 32000, spent: 27000 },
      { id: 'coimbatore', name: 'Coimbatore', allocated: 20000, spent: 16000 },
      { id: 'madurai', name: 'Madurai', allocated: 16000, spent: 12000 },
      { id: 'trichy', name: 'Tiruchirappalli', allocated: 14000, spent: 10000 },
      { id: 'salem', name: 'Salem', allocated: 12000, spent: 9000 },
      { id: 'tirunelveli', name: 'Tirunelveli', allocated: 10000, spent: 7000 },
      { id: 'vellore', name: 'Vellore', allocated: 6000, spent: 4000 }
    ]
  },
  {
    id: 'up',
    name: 'Uttar Pradesh',
    allocated: 145000,
    spent: 95000,
    districts: [
      { id: 'lucknow', name: 'Lucknow', allocated: 28000, spent: 20000 },
      { id: 'varanasi', name: 'Varanasi', allocated: 18000, spent: 12000 },
      { id: 'agra', name: 'Agra', allocated: 15000, spent: 10000 },
      { id: 'kanpur', name: 'Kanpur', allocated: 20000, spent: 14000 },
      { id: 'prayagraj', name: 'Prayagraj', allocated: 14000, spent: 9000 },
      { id: 'ghaziabad', name: 'Ghaziabad', allocated: 16000, spent: 11000 },
      { id: 'meerut', name: 'Meerut', allocated: 12000, spent: 8000 },
      { id: 'gorakhpur', name: 'Gorakhpur', allocated: 10000, spent: 6000 },
      { id: 'noida', name: 'Gautam Buddha Nagar', allocated: 12000, spent: 5000 }
    ]
  },
  {
    id: 'rj',
    name: 'Rajasthan',
    allocated: 88000,
    spent: 62000,
    districts: [
      { id: 'jaipur', name: 'Jaipur', allocated: 25000, spent: 20000 },
      { id: 'jodhpur', name: 'Jodhpur', allocated: 16000, spent: 11000 },
      { id: 'udaipur', name: 'Udaipur', allocated: 14000, spent: 10000 },
      { id: 'kota', name: 'Kota', allocated: 12000, spent: 8000 },
      { id: 'ajmer', name: 'Ajmer', allocated: 10000, spent: 7000 },
      { id: 'bikaner', name: 'Bikaner', allocated: 11000, spent: 6000 }
    ]
  },
  {
    id: 'gj',
    name: 'Gujarat',
    allocated: 105000,
    spent: 82000,
    districts: [
      { id: 'ahmedabad', name: 'Ahmedabad', allocated: 30000, spent: 25000 },
      { id: 'surat', name: 'Surat', allocated: 22000, spent: 18000 },
      { id: 'vadodara', name: 'Vadodara', allocated: 16000, spent: 12000 },
      { id: 'rajkot', name: 'Rajkot', allocated: 14000, spent: 11000 },
      { id: 'bhavnagar', name: 'Bhavnagar', allocated: 11000, spent: 8000 },
      { id: 'jamnagar', name: 'Jamnagar', allocated: 12000, spent: 8000 }
    ]
  },
  {
    id: 'mp',
    name: 'Madhya Pradesh',
    allocated: 82000,
    spent: 55000,
    districts: [
      { id: 'bhopal', name: 'Bhopal', allocated: 22000, spent: 16000 },
      { id: 'indore', name: 'Indore', allocated: 18000, spent: 14000 },
      { id: 'jabalpur', name: 'Jabalpur', allocated: 12000, spent: 8000 },
      { id: 'gwalior', name: 'Gwalior', allocated: 11000, spent: 7000 },
      { id: 'ujjain', name: 'Ujjain', allocated: 10000, spent: 6000 },
      { id: 'sagar', name: 'Sagar', allocated: 9000, spent: 4000 }
    ]
  },
  {
    id: 'wb',
    name: 'West Bengal',
    allocated: 92000,
    spent: 68000,
    districts: [
      { id: 'kolkata', name: 'Kolkata', allocated: 28000, spent: 22000 },
      { id: 'howrah', name: 'Howrah', allocated: 14000, spent: 10000 },
      { id: 'darjeeling', name: 'Darjeeling', allocated: 10000, spent: 7000 },
      { id: 'durgapur', name: 'Durgapur', allocated: 12000, spent: 9000 },
      { id: 'asansol', name: 'Asansol', allocated: 11000, spent: 8000 },
      { id: 'siliguri', name: 'Siliguri', allocated: 9000, spent: 6000 },
      { id: 'malda', name: 'Malda', allocated: 8000, spent: 6000 }
    ]
  },
  {
    id: 'kl',
    name: 'Kerala',
    allocated: 72000,
    spent: 60000,
    districts: [
      { id: 'thiruvananthapuram', name: 'Thiruvananthapuram', allocated: 20000, spent: 17000 },
      { id: 'kochi', name: 'Kochi', allocated: 18000, spent: 15000 },
      { id: 'kozhikode', name: 'Kozhikode', allocated: 12000, spent: 10000 },
      { id: 'thrissur', name: 'Thrissur', allocated: 10000, spent: 8000 },
      { id: 'kannur', name: 'Kannur', allocated: 8000, spent: 6000 },
      { id: 'kollam', name: 'Kollam', allocated: 4000, spent: 4000 }
    ]
  },
  {
    id: 'ts',
    name: 'Telangana',
    allocated: 85000,
    spent: 65000,
    districts: [
      { id: 'hyderabad', name: 'Hyderabad', allocated: 30000, spent: 25000 },
      { id: 'warangal', name: 'Warangal', allocated: 14000, spent: 10000 },
      { id: 'nizamabad', name: 'Nizamabad', allocated: 12000, spent: 9000 },
      { id: 'karimnagar', name: 'Karimnagar', allocated: 11000, spent: 8000 },
      { id: 'khammam', name: 'Khammam', allocated: 10000, spent: 7000 },
      { id: 'nalgonda', name: 'Nalgonda', allocated: 8000, spent: 6000 }
    ]
  },
  {
    id: 'ap',
    name: 'Andhra Pradesh',
    allocated: 95000,
    spent: 68000,
    districts: [
      { id: 'visakhapatnam', name: 'Visakhapatnam', allocated: 22000, spent: 17000 },
      { id: 'vijayawada', name: 'Vijayawada', allocated: 20000, spent: 15000 },
      { id: 'tirupati', name: 'Tirupati', allocated: 15000, spent: 11000 },
      { id: 'guntur', name: 'Guntur', allocated: 13000, spent: 9000 },
      { id: 'nellore', name: 'Nellore', allocated: 11000, spent: 7000 },
      { id: 'kakinada', name: 'Kakinada', allocated: 10000, spent: 6000 },
      { id: 'rajahmundry', name: 'Rajahmundry', allocated: 4000, spent: 3000 }
    ]
  },
  {
    id: 'br',
    name: 'Bihar',
    allocated: 98000,
    spent: 58000,
    districts: [
      { id: 'patna', name: 'Patna', allocated: 25000, spent: 16000 },
      { id: 'gaya', name: 'Gaya', allocated: 12000, spent: 7000 },
      { id: 'muzaffarpur', name: 'Muzaffarpur', allocated: 10000, spent: 6000 },
      { id: 'bhagalpur', name: 'Bhagalpur', allocated: 11000, spent: 7000 },
      { id: 'darbhanga', name: 'Darbhanga', allocated: 10000, spent: 6000 },
      { id: 'purnia', name: 'Purnia', allocated: 9000, spent: 5000 },
      { id: 'arrah', name: 'Arrah', allocated: 8000, spent: 5000 },
      { id: 'begusarai', name: 'Begusarai', allocated: 7000, spent: 4000 },
      { id: 'katihar', name: 'Katihar', allocated: 6000, spent: 2000 }
    ]
  },
  {
    id: 'dl',
    name: 'Delhi',
    allocated: 65000,
    spent: 52000,
    districts: [
      { id: 'new_delhi', name: 'New Delhi', allocated: 30000, spent: 25000 },
      { id: 'south_delhi', name: 'South Delhi', allocated: 15000, spent: 12000 },
      { id: 'north_delhi', name: 'North Delhi', allocated: 10000, spent: 8000 },
      { id: 'east_delhi', name: 'East Delhi', allocated: 10000, spent: 7000 }
    ]
  },
  {
    id: 'hr',
    name: 'Haryana',
    allocated: 62000,
    spent: 48000,
    districts: [
      { id: 'gurugram', name: 'Gurugram', allocated: 20000, spent: 16000 },
      { id: 'faridabad', name: 'Faridabad', allocated: 14000, spent: 11000 },
      { id: 'panipat', name: 'Panipat', allocated: 10000, spent: 8000 },
      { id: 'ambala', name: 'Ambala', allocated: 8000, spent: 6000 },
      { id: 'rohtak', name: 'Rohtak', allocated: 10000, spent: 7000 }
    ]
  },
  {
    id: 'pb',
    name: 'Punjab',
    allocated: 58000,
    spent: 45000,
    districts: [
      { id: 'amritsar', name: 'Amritsar', allocated: 16000, spent: 13000 },
      { id: 'ludhiana', name: 'Ludhiana', allocated: 14000, spent: 11000 },
      { id: 'jalandhar', name: 'Jalandhar', allocated: 12000, spent: 9000 },
      { id: 'patiala', name: 'Patiala', allocated: 10000, spent: 8000 },
      { id: 'bathinda', name: 'Bathinda', allocated: 6000, spent: 4000 }
    ]
  },
  {
    id: 'jh',
    name: 'Jharkhand',
    allocated: 55000,
    spent: 34000,
    districts: [
      { id: 'ranchi', name: 'Ranchi', allocated: 18000, spent: 12000 },
      { id: 'jamshedpur', name: 'Jamshedpur', allocated: 12000, spent: 8000 },
      { id: 'dhanbad', name: 'Dhanbad', allocated: 10000, spent: 6000 },
      { id: 'bokaro', name: 'Bokaro', allocated: 9000, spent: 5000 },
      { id: 'hazaribagh', name: 'Hazaribagh', allocated: 6000, spent: 3000 }
    ]
  },
  {
    id: 'ct',
    name: 'Chhattisgarh',
    allocated: 55000,
    spent: 38000,
    districts: [
      { id: 'raipur', name: 'Raipur', allocated: 18000, spent: 13000 },
      { id: 'bilaspur', name: 'Bilaspur', allocated: 10000, spent: 7000 },
      { id: 'durg', name: 'Durg', allocated: 9000, spent: 6000 },
      { id: 'bhilai', name: 'Bhilai', allocated: 8000, spent: 5000 },
      { id: 'korba', name: 'Korba', allocated: 6000, spent: 4000 },
      { id: 'rajnandgaon', name: 'Rajnandgaon', allocated: 4000, spent: 3000 }
    ]
  },
  {
    id: 'or',
    name: 'Odisha',
    allocated: 72000,
    spent: 48000,
    districts: [
      { id: 'bhubaneswar', name: 'Bhubaneswar', allocated: 20000, spent: 14000 },
      { id: 'cuttack', name: 'Cuttack', allocated: 12000, spent: 8000 },
      { id: 'rourkela', name: 'Rourkela', allocated: 10000, spent: 7000 },
      { id: 'puri', name: 'Puri', allocated: 9000, spent: 6000 },
      { id: 'sambalpur', name: 'Sambalpur', allocated: 8000, spent: 5000 },
      { id: 'berhampur', name: 'Berhampur', allocated: 7000, spent: 4000 },
      { id: 'balasore', name: 'Balasore', allocated: 6000, spent: 4000 }
    ]
  },
  {
    id: 'as',
    name: 'Assam',
    allocated: 52000,
    spent: 35000,
    districts: [
      { id: 'guwahati', name: 'Guwahati', allocated: 18000, spent: 13000 },
      { id: 'dibrugarh', name: 'Dibrugarh', allocated: 10000, spent: 7000 },
      { id: 'silchar', name: 'Silchar', allocated: 8000, spent: 5000 },
      { id: 'jorhat', name: 'Jorhat', allocated: 7000, spent: 4000 },
      { id: 'nagaon', name: 'Nagaon', allocated: 6000, spent: 4000 },
      { id: 'tezpur', name: 'Tezpur', allocated: 3000, spent: 2000 }
    ]
  },
  {
    id: 'ut',
    name: 'Uttarakhand',
    allocated: 42000,
    spent: 32000,
    districts: [
      { id: 'dehradun', name: 'Dehradun', allocated: 14000, spent: 11000 },
      { id: 'haridwar', name: 'Haridwar', allocated: 10000, spent: 8000 },
      { id: 'haldwani', name: 'Haldwani', allocated: 8000, spent: 6000 },
      { id: 'roorkee', name: 'Roorkee', allocated: 6000, spent: 4000 },
      { id: 'rudrapur', name: 'Rudrapur', allocated: 4000, spent: 3000 }
    ]
  },
  {
    id: 'hp',
    name: 'Himachal Pradesh',
    allocated: 35000,
    spent: 28000,
    districts: [
      { id: 'shimla', name: 'Shimla', allocated: 12000, spent: 10000 },
      { id: 'kullu', name: 'Kullu', allocated: 8000, spent: 6000 },
      { id: 'dharamshala', name: 'Dharamshala', allocated: 7000, spent: 6000 },
      { id: 'solan', name: 'Solan', allocated: 5000, spent: 4000 },
      { id: 'mandi', name: 'Mandi', allocated: 3000, spent: 2000 }
    ]
  },
  {
    id: 'jk',
    name: 'Jammu and Kashmir',
    allocated: 48000,
    spent: 32000,
    districts: [
      { id: 'srinagar', name: 'Srinagar', allocated: 16000, spent: 11000 },
      { id: 'jammu', name: 'Jammu', allocated: 14000, spent: 10000 },
      { id: 'anantnag', name: 'Anantnag', allocated: 8000, spent: 5000 },
      { id: 'baramulla', name: 'Baramulla', allocated: 6000, spent: 4000 },
      { id: 'udhampur', name: 'Udhampur', allocated: 4000, spent: 2000 }
    ]
  },
  {
    id: 'la',
    name: 'Ladakh',
    allocated: 12000,
    spent: 7500,
    districts: [
      { id: 'leh', name: 'Leh', allocated: 7000, spent: 4500 },
      { id: 'kargil', name: 'Kargil', allocated: 5000, spent: 3000 }
    ]
  },
  {
    id: 'ga',
    name: 'Goa',
    allocated: 12000,
    spent: 10000,
    districts: [
      { id: 'panaji', name: 'Panaji', allocated: 6000, spent: 5000 },
      { id: 'margao', name: 'Margao', allocated: 6000, spent: 5000 }
    ]
  },
  {
    id: 'sk',
    name: 'Sikkim',
    allocated: 10000,
    spent: 8000,
    districts: [
      { id: 'gangtok', name: 'Gangtok', allocated: 5000, spent: 4000 },
      { id: 'namchi', name: 'Namchi', allocated: 3000, spent: 2500 },
      { id: 'mangan', name: 'Mangan', allocated: 2000, spent: 1500 }
    ]
  },
  {
    id: 'tr',
    name: 'Tripura',
    allocated: 14000,
    spent: 10000,
    districts: [
      { id: 'agartala', name: 'Agartala', allocated: 7000, spent: 5000 },
      { id: 'udaipur_tr', name: 'Udaipur', allocated: 4000, spent: 3000 },
      { id: 'dharmanagar', name: 'Dharmanagar', allocated: 3000, spent: 2000 }
    ]
  },
  {
    id: 'mn',
    name: 'Manipur',
    allocated: 15000,
    spent: 10000,
    districts: [
      { id: 'imphal', name: 'Imphal', allocated: 8000, spent: 6000 },
      { id: 'thoubal', name: 'Thoubal', allocated: 4000, spent: 2500 },
      { id: 'churachandpur', name: 'Churachandpur', allocated: 3000, spent: 1500 }
    ]
  },
  {
    id: 'ml',
    name: 'Meghalaya',
    allocated: 16000,
    spent: 11000,
    districts: [
      { id: 'shillong', name: 'Shillong', allocated: 8000, spent: 6000 },
      { id: 'tura', name: 'Tura', allocated: 5000, spent: 3000 },
      { id: 'jowai', name: 'Jowai', allocated: 3000, spent: 2000 }
    ]
  },
  {
    id: 'mz',
    name: 'Mizoram',
    allocated: 12000,
    spent: 9000,
    districts: [
      { id: 'aizawl', name: 'Aizawl', allocated: 6000, spent: 5000 },
      { id: 'lunglei', name: 'Lunglei', allocated: 4000, spent: 2500 },
      { id: 'champhai', name: 'Champhai', allocated: 2000, spent: 1500 }
    ]
  },
  {
    id: 'nl',
    name: 'Nagaland',
    allocated: 14000,
    spent: 9000,
    districts: [
      { id: 'kohima', name: 'Kohima', allocated: 7000, spent: 5000 },
      { id: 'dimapur', name: 'Dimapur', allocated: 5000, spent: 3000 },
      { id: 'mokokchung', name: 'Mokokchung', allocated: 2000, spent: 1000 }
    ]
  },
  {
    id: 'ar',
    name: 'Arunachal Pradesh',
    allocated: 18000,
    spent: 11000,
    districts: [
      { id: 'itanagar', name: 'Itanagar', allocated: 8000, spent: 5000 },
      { id: 'tawang', name: 'Tawang', allocated: 5000, spent: 3000 },
      { id: 'pasighat', name: 'Pasighat', allocated: 5000, spent: 3000 }
    ]
  },
  {
    id: 'ch',
    name: 'Chandigarh',
    allocated: 8000,
    spent: 6500,
    districts: [
      { id: 'chandigarh_city', name: 'Chandigarh', allocated: 8000, spent: 6500 }
    ]
  },
  {
    id: 'py',
    name: 'Puducherry',
    allocated: 6000,
    spent: 4800,
    districts: [
      { id: 'puducherry_city', name: 'Puducherry', allocated: 4000, spent: 3200 },
      { id: 'karaikal', name: 'Karaikal', allocated: 2000, spent: 1600 }
    ]
  },
  {
    id: 'an',
    name: 'Andaman and Nicobar',
    allocated: 5000,
    spent: 3500,
    districts: [
      { id: 'port_blair', name: 'Port Blair', allocated: 3000, spent: 2200 },
      { id: 'car_nicobar', name: 'Car Nicobar', allocated: 2000, spent: 1300 }
    ]
  },
  {
    id: 'ld',
    name: 'Lakshadweep',
    allocated: 3000,
    spent: 2200,
    districts: [
      { id: 'kavaratti', name: 'Kavaratti', allocated: 3000, spent: 2200 }
    ]
  },
  {
    id: 'dn',
    name: 'Dadra and Nagar Haveli',
    allocated: 4000,
    spent: 3000,
    districts: [
      { id: 'silvassa', name: 'Silvassa', allocated: 4000, spent: 3000 }
    ]
  },
  {
    id: 'dd',
    name: 'Daman and Diu',
    allocated: 3500,
    spent: 2800,
    districts: [
      { id: 'daman', name: 'Daman', allocated: 2000, spent: 1600 },
      { id: 'diu', name: 'Diu', allocated: 1500, spent: 1200 }
    ]
  }
];

export const nationalStats = {
  totalAllocated: 2250000,
  totalSpent: 1575000,
  remaining: 675000,
  activeAlerts: 32,
  statesMonitored: 36,
  schemesTracked: 157
};

export const formatCrores = (value: number): string => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L Cr`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K Cr`;
  return `₹${value} Cr`;
};

export const getUtilizationColor = (pct: number): string => {
  if (pct >= 80) return 'text-green-500';
  if (pct >= 50) return 'text-yellow-500';
  return 'text-red-500';
};
