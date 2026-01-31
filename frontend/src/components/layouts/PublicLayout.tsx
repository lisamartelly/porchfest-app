import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function PublicLayout() {
  const { user, signOut } = useAuthStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-porch-50 via-white to-forest-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-porch-100 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-porch-500 to-porch-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🎵</span>
              </div>
              <span className="font-display text-2xl font-bold text-porch-800">Porchfest</span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/schedule" className="text-gray-600 hover:text-porch-600 transition-colors font-medium">
                Schedule
              </Link>
              <Link to="/map" className="text-gray-600 hover:text-porch-600 transition-colors font-medium">
                Map
              </Link>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <Link 
                    to={`/dashboard/${user.role}`} 
                    className="text-gray-600 hover:text-porch-600 transition-colors font-medium"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={signOut}
                    className="btn-outline text-sm py-2 px-4"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-gray-600 hover:text-porch-600 transition-colors font-medium">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-sm py-2 px-4">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-gray-600 hover:text-porch-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-forest-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-porch-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">🎵</span>
                </div>
                <span className="font-display text-xl font-bold">Porchfest</span>
              </div>
              <p className="text-forest-300 text-sm">
                Bringing live music to neighborhoods, one porch at a time.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-forest-300">
                <li><Link to="/schedule" className="hover:text-white transition-colors">Schedule</Link></li>
                <li><Link to="/map" className="hover:text-white transition-colors">Map</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Get Involved</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Participants</h4>
              <ul className="space-y-2 text-sm text-forest-300">
                <li><Link to="/register" className="hover:text-white transition-colors">Register as Band</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Offer Your Porch</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-forest-300">
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-forest-700 mt-8 pt-8 text-center text-forest-400 text-sm">
            <p>© {new Date().getFullYear()} Porchfest. Made with ♥ for the community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

