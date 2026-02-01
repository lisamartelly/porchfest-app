import { Link } from "react-router-dom";

// Import images
import img1 from "../assets/img/another-porchfest.jpg";
import img2 from "../assets/img/oakhurst-porchfest.jpg";
import img3 from "../assets/img/philly-porchfest.png";
import img4 from "../assets/img/oakhurst-porchfest3.jpg";

export default function ForBandsPage() {
  return (
    <div className="px-4 md:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-8 items-center mb-8">
          <div className="flex-1">
            <div className="neon-box">
              <h2 
                className="text-center text-2xl md:text-3xl mb-4"
                style={{ fontFamily: 'Carena, Pacifico, cursive' }}
              >
                Picture this:
              </h2>
              <p>
                It's a summer day, there's a nice breeze,{" "}
                <b>
                  you're playing with your band in front of a crowd of local
                  supporters
                </b>
                , helping to forge connections in a pocket of the city{" "}
                <b>where great music has been born.</b> This is Porchfest.
              </p>

              <div className="sun-divider"></div>
              
              <p>
                We will do our best to accommodate as many bands as possible and
                are so grateful for the enthusiasm for this event - we feel it
                too!{" "}
                <b>
                  Please read below for important information on how to get
                  involved.
                </b>
              </p>

              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <Link to="/apply/band" className="btn-primary">
                  Apply to Play - Available til May 31
                </Link>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <img src={img1} alt="Porchfest performance" className="fancy-img w-full" />
          </div>
        </div>

        {/* Three Image Row */}
        <div className="flex gap-5 mb-8">
          <div 
            className="flex-1 h-[200px] md:h-[250px] bg-cover bg-center rounded-[20px] hidden md:block"
            style={{ backgroundImage: `url(${img3})` }}
          />
          <div 
            className="flex-1 h-[200px] md:h-[250px] bg-cover bg-center rounded-[20px]"
            style={{ backgroundImage: `url(${img2})` }}
          />
          <div 
            className="flex-1 h-[200px] md:h-[250px] bg-cover bg-center rounded-[20px]"
            style={{ backgroundImage: `url(${img4})`, backgroundPosition: '33% center' }}
          />
        </div>

        {/* Details & FAQ Section */}
        <div className="white-box">
          <h2 
            className="text-center text-2xl md:text-3xl mb-4"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            DETAILS:
          </h2>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            The gist:
          </h3>
          <ul className="sun-list mb-6">
            <li>
              Apply to play via the form on this website between April 1
              and May 31
            </li>
            <li>
              Watch for an email containing your application decision
              around/by June 15
            </li>
            <li>
              If selected as a Porchfest band, you will be assigned and
              connected to your porch by July 16
            </li>
            <li>
              Bands are{" "}
              <b>responsible for bringing their own equipment.</b>
            </li>
          </ul>

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
            How do applications work?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              The ONLY way to apply is via our application form.
              This gathers a ton of information we need to list your band
              on our website and connect you with your host.
            </li>
            <li>
              Applications are not on a rolling basis! We will assess
              everyone after the application window closes. So please take
              your time filling the application out! If you throw together
              a bio and want to change it later, for example, we cannot
              guarantee that we will be able to do that, and things like
              that can eat up a lot of time.
            </li>
            <li>
              Please do not email us application-y emails. We need all
              applications to go through the form to keep everything in
              one place.
            </li>
            <li>
              Applications will typically be open for two months, from
              April 1 - May 31
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            When will I find out if I'm in?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              We hope to send out acceptances around June 15, but it might
              be later than that. Please be patient! We get a lot of
              interest in the event and we want to be fair to everyone
            </li>
            <li>
              Since applications are open until May 31, you will
              definitely not hear back anytime before then, even if you
              were the first person to apply
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            When will I know my porch/where/when I'm playing?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              We aim to have everyone assigned and connected to their
              porch by July 15, roughly one month before the event. The
              hardest part of all of this is connecting bands and porches
              but we go as fast as we can!
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            Will I be paid for performing?
          </h3>
          <ul className="sun-list mb-6">
            <li>Not by us :( </li>
            <li>
              We would love to pay all of the porchfest musicians
              directly, but, being entirely volunteer driven with hundreds
              of musicians involved, we cannot.
            </li>
            <li>
              We strongly push attendees to tip, and often hear feedback
              that tips do come through pretty well! Of course, this is
              not guaranteed.
            </li>
            <li>
              If you are unable to play for tips only, then this event is
              unfortunately not for you.
            </li>
          </ul>

          <h3 
            className="text-xl mb-2"
            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
          >
            Is there sound/PA support provided?
          </h3>
          <ul className="sun-list mb-6">
            <li>
              <b>No! Bands are in charge of their own sound.</b>
            </li>
            <li>
              If you're playing at a porch that has multiple bands during
              the day, we encourage gear sharing and will connect you with
              the other bands via email!
            </li>
            <li>
              You MUST be prepared to provide your own sound for
              porchfest. Do not apply if you can't commit to this.
            </li>
          </ul>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/apply/band" className="btn-primary">
              Apply to Play - Available til May 31
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
