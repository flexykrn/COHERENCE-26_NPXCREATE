import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 overflow-hidden">
      {/* Decorative background elements - Parliament Theme */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(17,94,89,0.1),transparent_50%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* About Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-lg">JK</span>
              </div>
              <h3 className="text-3xl font-black text-white">Jhol Khol</h3>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed max-w-md">
              Empowering citizens with transparency and accountability. 
              Track government schemes, report irregularities, and ensure 
              public funds reach their intended beneficiaries.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all text-gray-300 hover:text-white">
                <span className="text-sm">𝕏</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all text-gray-300 hover:text-white">
                <span className="text-sm">f</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all text-gray-300 hover:text-white">
                <span className="text-sm">in</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/schemes" className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  All Schemes
                </Link>
              </li>
              <li>
                <Link href="/reports" className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Submit Report
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">📧</span>
                <span className="text-gray-400">info@jholkhol.gov.in</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">📞</span>
                <span className="text-gray-400">1800-XXX-XXXX</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">🕐</span>
                <span className="text-gray-400">Mon-Fri: 9AM - 6PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2026 Jhol Khol. Built for COHERENCE-26 Hackathon. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Made with</span>
              <span className="text-red-500">❤️</span>
              <span className="text-gray-500">at VCET, Vasai</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
