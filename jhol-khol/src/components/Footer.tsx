import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4">Jhol Khol</h3>
            <p className="text-gray-400 mb-4">
              Empowering citizens with transparency and accountability. 
              Track government schemes, report irregularities, and ensure 
              public funds reach their intended beneficiaries.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-blue-400 transition-colors">Twitter</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Facebook</a>
              <a href="#" className="hover:text-blue-400 transition-colors">LinkedIn</a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/schemes" className="hover:text-blue-400 transition-colors">All Schemes</Link></li>
              <li><Link href="/reports" className="hover:text-blue-400 transition-colors">Submit Report</Link></li>
              <li><Link href="/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
              <li><Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Email: info@jholkhol.gov.in</li>
              <li>Helpline: 1800-XXX-XXXX</li>
              <li>Mon-Fri: 9AM - 6PM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
          <p>&copy; 2026 Jhol Khol. Built for COHERENCE-26 Hackathon. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
