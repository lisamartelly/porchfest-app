import { Link } from "react-router-dom";

// Import images
import heroImg from "../assets/img/somerville_porchfest_2021.jpg";
import bingImg from "../assets/img/bing-porchfest.png";
import kinfolkImg from "../assets/img/Kinfolk-7.jpg";
import replacementsImg from "../assets/img/replacements2.jpg";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section 
        className="relative h-[250px] sm:h-[350px] md:h-[500px] bg-cover bg-center"
        style={{
          background: `linear-gradient(180deg, rgba(78,79,84,0.8) 0%, rgba(255,255,255,0) 90%), 
                       url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex flex-col items-center justify-start pt-4 md:pt-8">
          <h2 
            className="text-xl md:text-2xl mb-0 mt-0"
            style={{ color: '#dfff9c', fontFamily: 'Carena, Pacifico, cursive' }}
          >
            another year of...
          </h2>
          <h1 
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-center m-0"
            style={{ 
              color: '#dfff9c', 
              fontFamily: 'Carena, Pacifico, cursive',
              textShadow: '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black',
            }}
          >
            Uptown Porchfest
          </h1>
        </div>
      </section>

      {/* Page Content */}
      <div className="flex flex-col max-w-[2000px] mx-auto">
        {/* Info Banner */}
        <div className="px-4 md:px-12 py-6">
          <div className="almond-box">
            <h2 className="text-center text-2xl md:text-3xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              It's Time to Porchfest!
            </h2>
            <p className="text-center">
              We have <b>87</b> amazing bands across 35 porches all excited to
              put on a great show for the neighborhood. Here are some last
              minute reminders to make sure everyone has a great day:
            </p>
            <ul className="sun-list max-w-3xl mx-auto">
              <li>
                <b>We are not scared of lingering rain and the show will go on!</b>
              </li>
              <li>
                This event is run entirely by volunteers, including the bands!
                Show your appreciation and{" "}
                <b><Link to="/tipthebands" className="text-black">tip them generously</Link></b>
              </li>
              <li>
                Check out the <Link to="/map" className="text-black">event map</Link> and download a copy before you arrive
              </li>
              <li>
                There will be musical activities <b>for kids of all ages</b> in Mueller Park from 4:00-5:00
              </li>
              <li>
                Trying to park in Uptown is a bad idea! Take the bus, rideshare, or bike!
              </li>
              <li>
                There will be <b>food and drink vendors</b> all day in Mueller Park!
              </li>
              <li>
                <b>Be respectful</b> of the neighborhood. There are portapotties and park bathrooms - check the map!
              </li>
            </ul>

            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Link to="/map" className="btn-primary">
                Download the event map
              </Link>
            </div>
          </div>
        </div>

        {/* What/When/Where Section */}
        <div className="px-4 md:px-12 py-6">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1">
              <div className="white-box">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                  <div className="md:w-1/3">
                    <h2 className="text-2xl md:text-3xl m-0" style={{ fontFamily: 'Carena, Pacifico, cursive', color: '#f60' }}>What?</h2>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="m-0 text-center md:text-left text-lg">A free and fun neighborhood music festival</h3>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                  <div className="md:w-1/3">
                    <h2 className="text-2xl md:text-3xl m-0" style={{ fontFamily: 'Carena, Pacifico, cursive', color: '#f60' }}>When?</h2>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="m-0 text-center md:text-left text-lg">August 16, 2025</h3>
                    <h3 className="m-0 text-center md:text-left text-lg">1pm - 5pm</h3>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="md:w-1/3">
                    <h2 className="text-2xl md:text-3xl m-0" style={{ fontFamily: 'Carena, Pacifico, cursive', color: '#f60' }}>Where?</h2>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="m-0 text-center md:text-left text-lg">Porches and yards across Uptown, Minneapolis</h3>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  <Link to="/for-bands" className="btn-primary">
                    Band Signup
                  </Link>
                  <Link to="/for-hosts" className="btn-primary">
                    Porch Signup
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <img 
                src={bingImg} 
                alt="Music on porch" 
                className="fancy-img w-full"
              />
            </div>
          </div>
        </div>

        {/* Porch-WHAT Section */}
        <div className="px-4 md:px-12 py-6">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 order-2 lg:order-1">
              <img 
                src={kinfolkImg} 
                alt="Live music performance" 
                className="fancy-img w-full"
              />
            </div>

            <div className="flex-1 order-1 lg:order-2">
              <div className="neon-box">
                <h2 className="text-center text-2xl md:text-3xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
                  Porch-WHAT?
                </h2>
                <p>
                  Porchfest will feature{" "}
                  <b>multiple, spread-out, overlapping concerts during a single afternoon</b>{" "}
                  that attendees can enjoy while wandering the neighborhood.
                </p>
                <div className="sun-divider"></div>
                <p>
                  It provides an opportunity to explore the Wedge neighborhood of
                  Uptown in an intimate and novel way. Attendees can discover new
                  musicians, support local businesses, and celebrate the diverse,
                  eclectic history of this neighborhood.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  <Link to="/for-bands" className="btn-primary">
                    Band Signup
                  </Link>
                  <Link to="/for-hosts" className="btn-primary">
                    Porch Signup
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Musical Mainstay Section */}
        <div className="px-4 md:px-12 py-6">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1">
              <div className="white-box">
                <h2 className="text-center text-2xl md:text-3xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
                  A Musical Mainstay
                </h2>
                <p>
                  Countless musicians have found their footing in this neighborhood.
                </p>
                <p>
                  Uptown has a history of diversity, creativity, and community. It
                  is both a destination and a home for artists and those that
                  appreciate them.
                </p>
                <p>
                  The Replacements (famously pictured here at their home in the Wedge) got their start here, Rhymesayers was rooted here
                  for decades, and musical shoutouts from Prince (and countless
                  others) highlight the true fashion of Uptown as a place where
                  anybody can be themselves and find support and community along
                  the way.
                </p>
              </div>
            </div>

            <div className="flex-1">
              <img 
                src={replacementsImg} 
                alt="The Replacements" 
                className="fancy-img w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
