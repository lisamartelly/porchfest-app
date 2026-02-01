import { Link } from "react-router-dom";

// Import images
import img1 from "../assets/img/Arlington-porchfest-2021.jpg";
import img2 from "../assets/img/jp-porchfest.jpg";

export default function ForHostsPage() {
  return (
    <div className="px-4 md:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-8 items-start mb-8">
          {/* Left Column */}
          <div className="flex-1">
            <div className="white-box mb-6">
              <h2 
                className="text-center text-2xl md:text-3xl mb-4"
                style={{ fontFamily: 'Carena, Pacifico, cursive' }}
              >
                Calling all people with porches!
              </h2>

              <p>
                On <b>August 16th,</b> bands will be scattered across porches
                throughout the Wedge neighborhood in Uptown putting on free
                concerts for the community. Neighbors can gather, wander, and
                experience music all around them.
              </p>
              
              <div className="sun-divider"></div>
              
              <p>
                <b>
                  If you like the idea of talented musicians coming (literally)
                  to your front door,
                </b>{" "}
                this is for you. It's also a great way to connect with your
                neighbors and help build our community.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <Link to="/apply/porch" className="btn-primary">
                  Sign up to host
                </Link>
              </div>
            </div>

            <img src={img2} alt="JP Porchfest" className="fancy-img w-full" />
          </div>

          {/* Right Column */}
          <div className="flex-1">
            <img src={img1} alt="Arlington Porchfest" className="fancy-img w-full mb-6" />

            <div className="neon-box">
              <h2 
                className="text-center text-2xl md:text-3xl mb-4"
                style={{ fontFamily: 'Carena, Pacifico, cursive' }}
              >
                All that's required:
              </h2>
              <ul className="sun-list">
                <li>
                  Your permission to host musicians on your porch, yard,
                  stoop, balcony, or driveway
                </li>
                <li>Access to an outlet/electricity</li>
                <li>
                  Willingness to communicate with your assigned band before
                  the event
                </li>
                <li>
                  Seeking spaces in Uptown neighborhoods: the Wedge, South
                  Uptown, and Whittier
                </li>
              </ul>
              
              <p>
                <b>
                  Musicians will bring the talent and equipment, you provide
                  the space!
                </b>
              </p>
              <p>
                If you want to play a key role in making this community event
                successful, click the sign up button and an event organizer
                will reach out to you! Make sure to get your application in
                fast as early applications will receive priority.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <Link to="/apply/porch" className="btn-primary">
                  Sign up to host
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="white-box">
          <h2 
            className="text-center text-2xl md:text-3xl mb-4"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            FAQ:
          </h2>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            Do I pick my band? What if I'm in a band or know a band?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              If you are in your own band, hell yeah, of course you can
              play at your own home during Porchfest! Same with if you
              know a band or have friends in a band
            </li>
            <li>
              We DO need you to still submit the Band/Host applications so
              that we can keep your info with everyone else's and get you
              listed on the map and our website. You can add a note in the
              app that you have your own band.
            </li>
            <li>
              Sound overlap is our major hurdle in organizing, and we want
              to spread the Porchfest love as much as possible. Please be
              willing to be flexible with us as we try to organize
              everyone who wants to play!
            </li>
            <li>
              If you aren't in a band and need us to pair you with one,
              it's generally not feasible to let hosts hand-select their
              band from our hundreds of applicants. Believe it or not, the
              element of chance is part of the magic of Porchfest. That
              being said, we will try our best to pair you with bands that
              are to your preferences! And if you have special
              circumstances around this, please just let us know.
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            What does a host have to do?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              Have a porch, yard, stoop, patio, or driveway where a
              musician or band can play!
            </li>
            <li>
              Have electrical power available. Depending on the band size,
              it may be smart to use separate outlets from separate
              circuits. Extension cords are OK, but they should be robust
              enough for the equipment that will be plugged into them. You
              can connect with your band about this!
            </li>
            <li>
              Make your band feel welcome and appreciated! They are
              playing for free, after all. This could include helping
              choose a space where your band can set up a merch table,
              offering chairs/stools, providing a bathroom for the
              performers to use, or having some beverages or snacks
              available. None of this is required but it all goes a long
              way in fostering community and giving everyone a positive
              experience
            </li>
            <li>
              In the event of severe weather Porchfest will pivot to the
              following day, Sunday, August 17th. Ideally, hosts should
              commit to being available both days
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            In the weeks before the show:
          </h3>
          <ul className="sun-list mb-6">
            <li>
              Contact your band once the Porchfest organizers connect you
              (usually about a month before the event) and discuss where
              the band will set up, how much time they will need to set
              up, parking options, their power/outlet requirements, and
              any other questions
            </li>
            <li>
              Look at your porch/yard/driveway from the street to imagine
              what someone watching the band will see. Feel free to spruce
              things up and have fun with it!
            </li>
            <li>
              Consider letting your neighbors know that the street might
              be crowded during Porchfest, and probably a little noisier
              than usual 🙂 But don't worry, the organizers will take care
              of noise permits for you!
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            What needs to be done the day of the show?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              We recommend coming up with a creative way to save the
              parking areas in front of your porch for attendees. This
              could be using your car and then moving it when your band
              starts, putting out chairs and hoping folks don't move them,
              or anything else you want to try 😎
            </li>
            <li>
              Be available to meet the band before the show to get set up,
              offer your bathroom if you're comfortable with that, etc.
            </li>
            <li>
              Our neighborhood houses are pretty old! It's best to have
              someone on-site during the show in case of blown circuit
              breakers or any other incidental issues
            </li>
            <li>
              HAVE FUN AND ENJOY THE SHOW BROUGHT RIGHT TO YOUR DOOR STEP
            </li>
          </ul>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/apply/porch" className="btn-primary">
              Sign up to host
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
