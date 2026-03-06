import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  ShieldCheckIcon, 
  UserGroupIcon, 
  LightBulbIcon,
  HeartIcon 
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  const team = [
    { name: 'Development Team', role: 'VCET, Vasai', icon: '👨‍💻' },
    { name: 'Design Team', role: 'UI/UX Specialists', icon: '🎨' },
    { name: 'Data Team', role: 'Analytics & Research', icon: '📊' },
  ];

  const values = [
    {
      icon: ShieldCheckIcon,
      title: 'Transparency',
      description: 'Providing clear, accessible information about government schemes and public funds.',
    },
    {
      icon: UserGroupIcon,
      title: 'Empowerment',
      description: 'Giving citizens tools to hold their representatives accountable.',
    },
    {
      icon: LightBulbIcon,
      title: 'Innovation',
      description: 'Using technology to solve age-old problems of governance and corruption.',
    },
    {
      icon: HeartIcon,
      title: 'Public Service',
      description: 'Dedicated to serving the public interest and improving civic engagement.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Jhol Khol</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              A citizen-centric platform built to expose irregularities, track government schemes, 
              and ensure accountability in public governance.
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl p-12 mb-16 text-white">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            <p className="text-lg text-center leading-relaxed max-w-4xl mx-auto">
              "Jhol Khol" (Hindi for "Expose" or "Reveal") is committed to creating a transparent 
              governance ecosystem where every rupee of public money is accounted for, every scheme 
              is tracked, and every citizen has the power to report irregularities. We believe that 
              transparency is the foundation of democracy, and technology can be the catalyst for change.
            </p>
          </div>

          {/* What We Do */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              What We Do
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Track Schemes
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Monitor the progress, budget allocation, and beneficiary reach of government 
                  welfare programs in real-time with verified data.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Expose Corruption
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Provide a secure platform for citizens and whistleblowers to report irregularities, 
                  ghost beneficiaries, and misuse of public funds.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-4xl mb-4">⚖️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Ensure Accountability
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a public record of complaints, track resolution status, and hold 
                  authorities accountable through community engagement.
                </p>
              </div>
            </div>
          </div>

          {/* Our Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Our Core Values
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div 
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* The Team */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Built by Students, For the People
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <p className="text-center text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Jhol Khol was developed during <strong>COHERENCE-26</strong>, a 24-hour hackathon 
                held at Vidyavardhini's College of Engineering & Technology (VCET), Vasai.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {team.map((member, index) => (
                  <div 
                    key={index}
                    className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl"
                  >
                    <div className="text-5xl mb-3">{member.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {member.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Impact Stats */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Making a Difference</h2>
            <p className="text-gray-300 mb-8">
              Technology for good governance starts with platforms like Jhol Khol
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-5xl font-bold text-blue-400 mb-2">24hrs</div>
                <div className="text-gray-300">Development Time</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-purple-400 mb-2">100%</div>
                <div className="text-gray-300">Open Source</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-pink-400 mb-2">∞</div>
                <div className="text-gray-300">Potential Impact</div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Join the Movement
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Together, we can build a more transparent and accountable government
            </p>
            <a 
              href="/reports"
              className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg rounded-full font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              Start Reporting
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
