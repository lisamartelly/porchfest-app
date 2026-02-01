import { Link } from 'react-router-dom'

export default function MapPage() {
  return (
    <div className="px-4 md:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl md:text-5xl mb-4"
            style={{ 
              fontFamily: 'Carena, Pacifico, cursive',
              color: '#000',
            }}
          >
            Event Map
          </h1>
          <h2 className="text-xl md:text-2xl mb-4">
            <a 
              href="#" 
              className="text-black underline hover:no-underline"
              style={{ fontFamily: 'Carena, Pacifico, cursive' }}
            >
              Click here to download the 2025 PDF map + schedule
            </a>
          </h2>
        </div>

        {/* Interactive Map */}
        <div 
          className="overflow-hidden"
          style={{ 
            backgroundColor: '#fafb9d',
            borderRadius: '60px 20px',
          }}
        >
          <div className="p-4">
            <div style={{ height: '70vh' }}>
              <iframe
                title="porchfest_map"
                src="https://www.google.com/maps/d/u/1/embed?mid=1JIdjlA_73LbT7Gi11hDo6_EZZACBdOM&ehbc=2E312F"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '20px' }}
              />
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 neon-box">
            <h2 
              className="text-center text-xl md:text-2xl mb-4"
              style={{ fontFamily: 'Carena, Pacifico, cursive' }}
            >
              Getting There
            </h2>
            <ul className="sun-list">
              <li>
                <b>Public Transit:</b> The 21, 17, 6, 4, and 2 bus lines all touch the Wedge
              </li>
              <li>
                <b>Bike:</b> The Greenway cuts right through the neighborhood!
              </li>
              <li>
                <b>Rideshare:</b> Uber/Lyft drop-offs work great
              </li>
              <li>
                <b>Parking:</b> Street parking is very limited - we highly recommend alternatives!
              </li>
            </ul>
          </div>

          <div className="flex-1 white-box">
            <h2 
              className="text-center text-xl md:text-2xl mb-4"
              style={{ fontFamily: 'Carena, Pacifico, cursive' }}
            >
              Map Legend
            </h2>
            <ul className="sun-list">
              <li>
                <b>🎵 Music icons:</b> Porch performance locations
              </li>
              <li>
                <b>🚽 Restroom icons:</b> Portapotties and park bathrooms
              </li>
              <li>
                <b>🍔 Food icons:</b> Food truck and vendor locations
              </li>
              <li>
                <b>📍 Star icon:</b> Mueller Park (main hub)
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link to="/schedule" className="btn-primary">
            View Full Schedule
          </Link>
        </div>
      </div>
    </div>
  )
}
