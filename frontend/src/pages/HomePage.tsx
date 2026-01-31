import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-porch-100 via-transparent to-forest-100 opacity-50" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-porch-200 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-forest-200 rounded-full blur-3xl opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-display text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Music on Every
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-porch-600 to-forest-600"> Porch</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join the community celebration where local bands perform on neighborhood porches. 
              Discover live music just a walk away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg">
                Get Involved
              </Link>
              <Link to="/schedule" className="btn-outline text-lg">
                View Schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple steps to bring live music to your neighborhood
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-porch-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎸</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">Bands Apply</h3>
              <p className="text-gray-600">
                Musicians and bands sign up with their info, genre, and music samples for review.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🏡</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">Porches Sign Up</h3>
              <p className="text-gray-600">
                Homeowners offer their porches as venues, sharing details about space and amenities.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-porch-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎉</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">We Match & Schedule</h3>
              <p className="text-gray-600">
                Our team reviews applications and creates the perfect lineup for the festival day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-porch-600 to-porch-800 rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
            
            <div className="relative z-10">
              <h2 className="font-display text-4xl lg:text-5xl font-bold mb-6">Ready to Join?</h2>
              <p className="text-xl text-porch-100 mb-8 max-w-2xl mx-auto">
                Whether you're a musician looking for a stage or a homeowner with a porch to share, 
                we'd love to have you!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/register?role=band" 
                  className="bg-white text-porch-700 font-semibold py-3 px-8 rounded-lg hover:bg-porch-50 transition-colors"
                >
                  Register as Band
                </Link>
                <Link 
                  to="/register?role=porch" 
                  className="bg-transparent border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Offer Your Porch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-forest-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display text-5xl font-bold text-porch-400 mb-2">50+</div>
              <p className="text-forest-300">Bands Registered</p>
            </div>
            <div>
              <div className="font-display text-5xl font-bold text-porch-400 mb-2">30+</div>
              <p className="text-forest-300">Porch Venues</p>
            </div>
            <div>
              <div className="font-display text-5xl font-bold text-porch-400 mb-2">8</div>
              <p className="text-forest-300">Neighborhoods</p>
            </div>
            <div>
              <div className="font-display text-5xl font-bold text-porch-400 mb-2">1000+</div>
              <p className="text-forest-300">Happy Attendees</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

