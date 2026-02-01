import { Link } from "react-router-dom";

export default function FAQPage() {
  return (
    <div className="px-4 md:px-12 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Row 1 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 white-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              Cost to attend?
            </h2>
            <ul className="sun-list">
              <li>Admission is completely free!!</li>
              <li>
                Something to note: this event is entirely powered by volunteer
                efforts, including the music. If you're able, we encourage
                tipping our artists to thank them for sharing their talents with
                us
              </li>
            </ul>
          </div>

          <div className="flex-1 neon-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              Do you need volunteers?
            </h2>
            <ul className="sun-list">
              <li>
                Yes! We are all grassroots and can't do it without help. Reach
                out via email and let us know what you'd like to help with.
              </li>
            </ul>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 neon-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              What if it rains?
            </h2>
            <ul className="sun-list">
              <li>
                This event will go on given light/passing-rain or drizzle! If
                it's terrible, dangerous, torrential rain, we may pivot to a
                rain date. Check back for info in that case.
              </li>
            </ul>
          </div>

          <div className="flex-1 white-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              What's the format of this event?
            </h2>
            <ul className="sun-list">
              <li>
                Porchfest will feature multiple, spread-out, overlapping
                concerts during a single afternoon that attendees can enjoy
                while wandering the neighborhood.
              </li>
            </ul>
          </div>
        </div>

        {/* Row 3 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 white-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              How can I get involved?
            </h2>
            <ul className="sun-list">
              <li>
                This event can't happen without musicians and porches! Please
                sign up to <Link to="/for-hosts" className="text-black font-bold">host</Link> or{" "}
                <Link to="/for-bands" className="text-black font-bold">play</Link> if you have either of those
                things going for you.
              </li>
              <li>
                Day-of volunteers are also appreciated! Please get in touch via
                email if you're interested in helping.
              </li>
            </ul>
          </div>

          <div className="flex-1 neon-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              Where are bathrooms?
            </h2>
            <ul className="sun-list">
              <li>
                Mueller park has 4 dedicated indoor bathroom stalls. There will
                also be portapotties stationed at the park and around the neighborhood 
                for extra access. See exact locations on our map!
              </li>
            </ul>
          </div>
        </div>

        {/* Row 4 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 neon-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              What's there to eat and drink?
            </h2>
            <ul className="sun-list">
              <li>
                There will be food/beverage trucks at Mueller Park. The Wedge is also 
                surrounded by tons of amazing local businesses! Pop in anywhere that 
                looks appetizing. Attendees are also encouraged to pack snacks and 
                drinks for themselves.
              </li>
            </ul>
          </div>

          <div className="flex-1 white-box">
            <h2 className="text-center text-xl md:text-2xl mb-4" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
              Where can I park?
            </h2>
            <ul className="sun-list">
              <li>
                The Wedge is a very dense neighborhood and street parking is
                notoriously sparse. Attendees are <b>highly</b> encouraged to
                take public transit, bike (the greenway cuts right through!), walk,
                rideshare, carpool, etc!
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
