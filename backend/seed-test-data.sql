-- Bulk test data for bands and porches
-- Run: psql $DATABASE_URL -f seed-test-data.sql
-- Requires: at least one organization and one active event to exist.
-- If none exist, this script creates a "Somerville Porchfest" org + event.

BEGIN;

-- Ensure we have an organization
INSERT INTO organizations (name, slug, description, city, state, contact_email, website)
VALUES (
  'Somerville Porchfest',
  'somerville-porchfest',
  'Annual neighborhood music festival featuring local bands on porches throughout Somerville.',
  'Somerville',
  'MA',
  'info@somervilleporchfest.org',
  'https://somervilleporchfest.org'
)
ON CONFLICT (slug) DO NOTHING;

-- Deactivate any existing active event for this org before inserting a new one
UPDATE events SET is_active = false
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'somerville-porchfest')
  AND is_active = true;

-- Ensure we have an active event
INSERT INTO events (organization_id, name, date, start_time, end_time, description, is_active,
  band_applications_open, band_applications_close, porch_applications_open, porch_applications_close)
SELECT id, 'Somerville Porchfest 2026', '2026-05-16', '12:00', '18:00',
  'Annual neighborhood music festival featuring local bands performing on porches throughout Somerville.',
  true, '2026-02-01', '2026-04-15', '2026-01-15', '2026-04-01'
FROM organizations WHERE slug = 'somerville-porchfest'
AND NOT EXISTS (
  SELECT 1 FROM events e
  JOIN organizations o ON e.organization_id = o.id
  WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026'
);

-- Link first user to this org if not already linked
INSERT INTO organization_users (user_id, organization_id, role)
SELECT u.id, o.id, 'owner'
FROM (SELECT id FROM users ORDER BY id LIMIT 1) u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'somerville-porchfest') o
WHERE EXISTS (SELECT 1 FROM users)
AND NOT EXISTS (
  SELECT 1 FROM organization_users ou WHERE ou.user_id = u.id AND ou.organization_id = o.id
);

-- ============================================================
-- PORCHES (20 porches with varied statuses and attributes)
-- Coordinates spread across real Somerville, MA neighborhoods
-- ============================================================

INSERT INTO porches (event_id, owner_name, email, address, city, lat, lng, capacity, has_power, parking_notes, accessibility_notes, status, admin_notes)
SELECT e.id, v.owner_name, v.email, v.address, v.city, v.lat, v.lng, v.capacity, v.has_power, v.parking_notes, v.accessibility_notes, v.status, v.admin_notes
FROM events e
JOIN organizations o ON e.organization_id = o.id
CROSS JOIN (VALUES
  -- Davis Square area
  ('Martha Reynolds',   'martha.r@email.com',    '15 Cutter Avenue',       'Somerville', 42.3967, -71.1225, 60,  true,  'Metered street parking',              'Wheelchair ramp at side entrance',    'approved',     'Excellent central location'),
  ('Dan Kowalski',      'dan.k@email.com',       '42 Herbert Street',      'Somerville', 42.3981, -71.1198, 35,  true,  'Resident permit parking only',        NULL,                                  'approved',     NULL),
  ('Priya Patel',       'priya.p@email.com',     '88 Day Street',          'Somerville', 42.3954, -71.1210, 45,  true,  'Small lot behind house',              'One step up to porch',                'approved',     'Has covered porch, good rain backup'),
  ('James O''Brien',    'james.ob@email.com',    '7 Kidder Avenue',        'Somerville', 42.3975, -71.1245, 80,  true,  'Free street parking, no time limit',  'Fully accessible, ground level',      'approved',     'Corner lot, great visibility'),
  -- Union Square area
  ('Rosa Gutierrez',    'rosa.g@email.com',      '134 Prospect Street',    'Somerville', 42.3795, -71.0945, 50,  true,  'Garage available for equipment load-in', NULL,                               'approved',     NULL),
  ('Tom Nakamura',      'tom.n@email.com',       '29 Concord Avenue',      'Somerville', 42.3808, -71.0968, 25,  false, NULL,                                  '4 steps, narrow stairway',            'approved',     'Cozy space, intimate setting'),
  ('Aisha Johnson',     'aisha.j@email.com',     '67 Summer Street',       'Somerville', 42.3812, -71.0932, 40,  true,  'Street parking, 2hr limit',           'Wide stairs with handrails',          'approved',     NULL),
  -- Spring Hill area
  ('Kevin McCarthy',    'kevin.mc@email.com',    '201 Central Street',     'Somerville', 42.3845, -71.1015, 55,  true,  'Driveway fits 3 cars',                'Level entry from driveway',           'approved',     'Returning host from last year'),
  ('Lucia Fernandez',   'lucia.f@email.com',     '18 Atherton Street',     'Somerville', 42.3858, -71.1038, 70,  true,  'Large driveway + street parking',     'Flat yard, no steps',                 'approved',     'Largest yard on the block'),
  ('Sam Washington',    'sam.w@email.com',       '95 School Street',       'Somerville', 42.3832, -71.1002, 30,  true,  NULL,                                  '2 steps to porch',                    'approved',     NULL),
  -- East Somerville area
  ('Helen Park',        'helen.p@email.com',     '310 Broadway',           'Somerville', 42.3725, -71.0820, 65,  true,  'Lot across the street',               'Ground level, ADA compliant',         'approved',     'Near Assembly Row, high foot traffic'),
  ('Marco DiStefano',   'marco.d@email.com',     '55 Cross Street',        'Somerville', 42.3738, -71.0845, 20,  false, 'Very limited parking',                '6 steps, not accessible',             'approved',     'Small but charming triple-decker porch'),
  -- Winter Hill area
  ('Denise Williams',   'denise.w@email.com',    '440 Broadway',           'Somerville', 42.3762, -71.0890, 45,  true,  'Street parking available',            'Ramp available on request',           'approved',     NULL),
  ('Chris Andersen',    'chris.a@email.com',     '12 Tufts Street',        'Somerville', 42.3915, -71.1120, 40,  true,  'Driveway for 2 cars',                 NULL,                                  'approved',     NULL),
  -- Pending porches
  ('Fatima Al-Rashid',  'fatima.ar@email.com',   '77 Willow Avenue',       'Somerville', 42.3942, -71.1185, 35,  true,  'Street parking',                      'One step, portable ramp available',   'pending',      NULL),
  ('Greg Thompson',     'greg.t@email.com',      '163 Highland Avenue',    'Somerville', 42.3890, -71.1068, 50,  true,  'Free lot next door on weekends',      NULL,                                  'pending',      'Need to verify power outlet count'),
  ('Nina Okafor',       'nina.o@email.com',      '22 Hancock Street',      'Somerville', 42.3780, -71.0910, 30,  false, NULL,                                  '3 steps',                             'pending',      NULL),
  -- Under review porches
  ('Raj Mehta',         'raj.m@email.com',       '505 Medford Street',     'Somerville', 42.3898, -71.0875, 40,  true,  'Shared parking with neighbor',        'Level entrance',                      'under_review', 'Confirming neighbor permission for overflow parking'),
  ('Lisa Chang',        'lisa.c@email.com',      '8 Pearson Road',         'Somerville', 42.3928, -71.1152, 55,  true,  'Driveway + street',                   'Wide porch, no steps',                'under_review', 'Checking electrical capacity'),
  -- Rejected porch
  ('Derek Stone',       'derek.s@email.com',     '91 Temple Street',       'Somerville', 42.3835, -71.0960, 15,  false, 'No parking nearby',                   'Not accessible',                      'rejected',     'Too small for any band setup, no power, parking issues')
) AS v(owner_name, email, address, city, lat, lng, capacity, has_power, parking_notes, accessibility_notes, status, admin_notes)
WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026';


-- ============================================================
-- BANDS (30 bands with varied genres, statuses, and details)
-- ============================================================

INSERT INTO bands (event_id, band_name, contact_name, contact_email, contact_phone, genre, member_count,
  music_sample_link, bio, set_length, venmo_handle, instagram, spotify, soundcloud, bandcamp,
  facebook, website, scheduling_notes, equipment_consent, payment_consent, timeline_consent,
  has_photo, photo_filename, questions_comments, status, admin_notes)
SELECT e.id, v.band_name, v.contact_name, v.contact_email, v.contact_phone, v.genre, v.member_count,
  v.music_sample_link, v.bio, v.set_length, v.venmo_handle, v.instagram, v.spotify, v.soundcloud, v.bandcamp,
  v.facebook, v.website, v.scheduling_notes, v.equipment_consent, v.payment_consent, v.timeline_consent,
  v.has_photo, v.photo_filename, v.questions_comments, v.status, v.admin_notes
FROM events e
JOIN organizations o ON e.organization_id = o.id
CROSS JOIN (VALUES
  -- APPROVED bands (15)
  ('The Stoop Jams',        'Alex Rivera',      'alex@stoopjams.com',        '617-555-0201', 'Funk',              '6',  'https://soundcloud.com/stoopjams/live',            'Six-piece funk band bringing the groove to every stoop and sidewalk. Horns, bass, and nonstop dancing.',                   '45', '@stoopjams',       '@thestoopjams',     'stoopjams',       NULL,            NULL,              NULL, 'https://stoopjams.com',       'Prefer 2pm or later',                     'agree', 'agree', 'agree', true,  'stoopjams.jpg',        NULL,                                          'approved', 'Great energy, crowd favorite'),
  ('Sidewalk Serenade',     'Mia Chen',         'mia@sidewalkserenade.com',  '617-555-0202', 'Indie Pop',         '3',  'https://spotify.com/sidewalkserenade',             'Dreamy indie pop trio with shimmering guitars and vocal harmonies that float through the neighborhood.',                   '30', '@sidewalkserenade', '@sidewalk_serenade', NULL,              'sidewalkserenade', NULL,           NULL, NULL,                          'Morning or early afternoon preferred',    'agree', 'agree', 'agree', true,  'sidewalkserenade.jpg', NULL,                                          'approved', NULL),
  ('Brass Knuckle Quartet', 'Devon James',      'devon@brassknuckle.band',   '617-555-0203', 'Jazz',              '4',  'https://bandcamp.com/brassknuckle',                'New Orleans-style jazz quartet. Trumpet, trombone, tuba, and drums bringing second-line energy to New England.',           '60', NULL,               '@brassknuckleqt',   NULL,              NULL,            'brassknuckle',    'brassknucklejazz', 'https://brassknuckle.band',  'Need shade — brass instruments in sun is rough', 'agree', 'agree', 'agree', true, 'brassknuckle.jpg', 'Do you have any shaded porches?',             'approved', 'Assign to a shaded/covered porch if possible'),
  ('Flannel Season',        'Jess Park',        'jess@flannelseason.com',    '617-555-0204', 'Folk/Americana',    '2',  'https://youtube.com/flannelseason',                'Guitar-and-banjo duo playing heartfelt Americana. Songs about trains, whiskey, and coming home.',                          '45', '@flannelseason',   '@flannel_season',   'flannelseason',   NULL,            NULL,              NULL, NULL,                          'Any time works',                          'agree', 'agree', 'agree', true,  'flannelseason.jpg',    NULL,                                          'approved', 'Solid demo, good crowd appeal'),
  ('The Neighbors',         'Carlos Reyes',     'carlos@theneighbors.band',  '617-555-0205', 'Rock',              '5',  'https://soundcloud.com/theneighborsband',          'Classic rock covers and originals. We are literally your neighbors — we live on Elm Street.',                              '45', '@theneighbors',    '@theneighborsband', NULL,              NULL,            'theneighborsband', NULL, 'https://theneighbors.band',   'We can play multiple sets if needed',     'agree', 'agree', 'agree', false, NULL,                   'Happy to fill any open slot!',                'approved', 'Local favorites, very flexible'),
  ('Bossa Nova Brunch',     'Ana Oliveira',     'ana@bossanovabrunch.com',   '617-555-0206', 'Bossa Nova/Latin',  '3',  'https://spotify.com/bossanovabrunch',              'Smooth bossa nova trio — guitar, percussion, and vocals. Perfect soundtrack for a lazy weekend afternoon.',                '30', '@bossanovabrunch', '@bossa_brunch',     'bossanovabrunch', NULL,            NULL,              NULL, NULL,                          '12pm-2pm ideal for our vibe',             'agree', 'agree', 'agree', true,  'bossanovabrunch.jpg',  NULL,                                          'approved', 'Perfect opening act energy'),
  ('Electric Porch Fire',   'Zach Donovan',     'zach@electricporchfire.com', '617-555-0207', 'Blues Rock',        '4',  'https://bandcamp.com/electricporchfire',            'Crunchy blues rock with scorching guitar solos. We turn porches into stages and yards into mosh pits.',                    '45', '@epfire',          '@electric_pf',      NULL,              'electricporchfire', NULL,          NULL, 'https://electricporchfire.com','Afternoon — we need the crowd warmed up',  'agree', 'agree', 'agree', true,  'electricporchfire.jpg', NULL,                                         'approved', 'High energy, check volume levels'),
  ('Tin Whistle Society',   'Fiona Burke',      'fiona@tinwhistle.org',      '617-555-0208', 'Celtic/Folk',       '4',  'https://youtube.com/tinwhistlesociety',             'Traditional Irish and Scottish tunes with fiddle, tin whistle, bodhran, and guitar. Jigs, reels, and singalongs.',         '45', NULL,               '@tinwhistlesociety', NULL,             NULL,            NULL,              'tinwhistlesociety', 'https://tinwhistle.org',    'Any slot, we are easy!',                  'agree', 'agree', 'agree', false, NULL,                   'We can teach a short tin whistle lesson too', 'approved', 'Fun interactive element'),
  ('DJ Porchlight',         'Sam Torres',       'sam@djporchlight.com',      '617-555-0209', 'Electronic/DJ',     '1',  'https://soundcloud.com/djporchlight',              'Solo DJ spinning house, disco, and funky beats. Just need power and a flat surface.',                                     '60', '@djporchlight',    '@dj_porchlight',    NULL,              'djporchlight',  NULL,              NULL, NULL,                          'Late afternoon preferred, 4pm-6pm',       'agree', 'agree', 'agree', true,  'djporchlight.jpg',     'I bring my own PA system',                    'approved', 'Self-sufficient setup, great closer'),
  ('The Lullaby League',    'Robin Marsh',      'robin@lullabyleague.com',   '617-555-0210', 'Children''s Music', '3',  'https://spotify.com/lullabyleague',                'Kid-friendly trio playing original songs, classic singalongs, and silly tunes. Bubbles and dancing guaranteed.',           '30', '@lullabyleague',   '@lullaby_league',   'lullabyleague',   NULL,            NULL,              NULL, 'https://lullabyleague.com',   '12pm-1pm so kids can nap after',          'agree', 'agree', 'agree', true,  'lullabyleague.jpg',    'We bring instruments for kids to try!',       'approved', 'Family-friendly slot, pair with accessible porch'),
  ('Sunset Dub Collective', 'Isaiah Green',     'isaiah@sunsetdub.com',      '617-555-0211', 'Reggae/Dub',        '5',  'https://bandcamp.com/sunsetdub',                   'Roots reggae and dub with heavy bass. Positive vibrations for the whole neighborhood.',                                   '45', '@sunsetdub',       '@sunset_dub',       NULL,              'sunsetdub',     NULL,              NULL, NULL,                          'Late afternoon, 4pm+',                    'agree', 'agree', 'agree', true,  'sunsetdub.jpg',        NULL,                                          'approved', NULL),
  ('The Parlor Cats',       'Hazel Quinn',      'hazel@parlorcats.com',      '617-555-0212', 'Swing/Jazz',        '5',  'https://youtube.com/theparlorcats',                'Hot jazz and swing from the 1930s-40s. Clarinet, upright bass, guitar, and vocals. Dress code: dapper.',                  '45', '@parlorcats',      '@the_parlor_cats',  'theparlorcats',   NULL,            NULL,              NULL, 'https://parlorcats.com',      'Early afternoon 1pm-3pm',                 'agree', 'agree', 'agree', true,  'parlorcats.jpg',       'We can do a swing dance demo too',            'approved', 'Unique act, good variety'),
  ('Concrete Meadow',       'Yuki Tanaka',      'yuki@concretemeadow.com',   '617-555-0213', 'Shoegaze/Dream Pop','4',  'https://soundcloud.com/concretemeadow',            'Layers of reverb-drenched guitars and ethereal vocals. Like lying in a meadow made of sound.',                             '30', '@concretemeadow',  '@concrete_meadow',  NULL,              'concretemeadow', NULL,             NULL, NULL,                          'Any time, we go with the flow',           'agree', 'agree', 'agree', false, NULL,                   NULL,                                          'approved', 'Atmospheric, would work well at a larger porch'),
  ('Mambo Kings of Mass',   'Ricardo Vargas',   'ricardo@mambokings.com',    '617-555-0214', 'Salsa/Latin',       '7',  'https://spotify.com/mambokingsmass',               'Seven-piece salsa band with full horn section. We will make your block party feel like Havana.',                           '60', '@mambokingsmass',  '@mambo_kings_mass', 'mambokings',      NULL,            NULL,              NULL, 'https://mambokings.com',      'Need large porch — 7 musicians + gear',   'agree', 'agree', 'agree', true,  'mambokings.jpg',       'We need at least 12x10 ft of space',          'approved', 'Large group, assign to biggest porch'),
  ('Porch Wine',            'Olivia Barrett',   'olivia@porchwine.band',     '617-555-0215', 'Singer-Songwriter', '1',  'https://bandcamp.com/porchwine',                   'Solo singer-songwriter with acoustic guitar. Intimate, confessional songs best enjoyed with a glass of something nice.',   '30', '@porchwine',       '@porch_wine',       NULL,              'porchwine',     NULL,              NULL, NULL,                          'Flexible, love a cozy porch',             'agree', 'agree', 'agree', true,  'porchwine.jpg',        NULL,                                          'approved', 'Good fit for smaller porches'),

  -- PENDING bands (7)
  ('Half Stack',            'Noah Kim',         'noah@halfstack.band',       '617-555-0216', 'Math Rock',         '3',  'https://soundcloud.com/halfstackband',             'Angular riffs, odd time signatures, and surprisingly catchy hooks. Math rock for people who hate math.',                   '30', '@halfstack',       '@halfstackband',    NULL,              'halfstack',     NULL,              NULL, 'https://halfstack.band',      NULL,                                      'agree', 'agree', 'agree', false, NULL,                   NULL,                                          'pending',  NULL),
  ('Grandma''s Attic',      'Eleanor Voss',     'eleanor@grandmasattic.com', '617-555-0217', 'Vintage Country',   '3',  'https://youtube.com/grandmasattic',                'Country and western classics from the golden era. Pedal steel, stand-up bass, and twang.',                                '45', '@grandmasattic',   '@grandmas_attic',   'grandmasattic',   NULL,            NULL,              NULL, NULL,                          'Afternoon preferred',                     'agree', 'agree', 'agree', true,  'grandmasattic.jpg',    NULL,                                          'pending',  NULL),
  ('The Voltage Thieves',   'Marcus Hall',      'marcus@voltagethieves.com', '617-555-0218', 'Garage Rock',       '4',  'https://bandcamp.com/voltagethieves',              'Raw, loud, garage rock. Four humans, eight speakers, zero apologies.',                                                    '30', '@voltagethieves',  '@voltage_thieves',  NULL,              'voltagethieves', NULL,             NULL, NULL,                          NULL,                                      'agree', 'agree', 'agree', true,  'voltagethieves.jpg',   'How loud can we be?',                         'pending',  'Need to discuss volume limits'),
  ('Clover Honey',          'Sienna Rowe',      'sienna@cloverhoney.com',    '617-555-0219', 'Indie Folk',        '2',  'https://spotify.com/cloverhoneymusic',             'Warm harmonies and finger-picked guitar. Songs about wildflowers, road trips, and finding your way home.',                 '30', '@cloverhoney',     '@clover_honey',     NULL,              'cloverhoney',   NULL,              NULL, NULL,                          'Morning if possible',                     'agree', 'agree', 'agree', true,  'cloverhoney.jpg',      NULL,                                          'pending',  NULL),
  ('The Midnight Bicycle',  'Leo Strauss',      'leo@midnightbicycle.com',   '617-555-0220', 'Post-Punk',         '4',  'https://soundcloud.com/midnightbicycle',           'Dark, driving post-punk with jagged guitars and brooding vocals. Joy Division meets the neighborhood.',                   '45', '@midnightbicycle', '@midnight_bicycle', NULL,              'midnightbicycle', NULL,            NULL, 'https://midnightbicycle.com', 'Late slots only, 5pm+',                   'agree', 'agree', 'agree', false, NULL,                   NULL,                                          'pending',  NULL),
  ('Pollen',                'Dani Reeves',      'dani@pollenmusic.com',      '617-555-0221', 'Chamber Pop',       '5',  'https://bandcamp.com/pollenmusic',                 'Strings, woodwinds, and synths woven into lush pop arrangements. Like a garden in bloom.',                                '45', '@pollenmusic',     '@pollen_music',     'pollenmusic',     NULL,            NULL,              NULL, 'https://pollenmusic.com',     'Need covered space for cello',            'agree', 'agree', 'agree', true,  'pollen.jpg',           'Our cellist needs protection from weather',   'pending',  'Check weather/covered porch availability'),
  ('Neighborhood Watch',    'Tyler Brooks',     'tyler@nwatchband.com',      '617-555-0222', 'Ska/Punk',          '6',  'https://youtube.com/nwatchband',                   'Third-wave ska with punk energy. Horns, checkerboard everything, and more skanking than you can handle.',                  '30', '@nwatchband',      '@nwatch_band',      NULL,              NULL,            'nwatchband',      NULL, NULL,                          'Anytime, we bring the party',             'agree', 'agree', 'agree', true,  'nwatchband.jpg',       NULL,                                          'pending',  NULL),

  -- UNDER REVIEW bands (5)
  ('Rust & Rye',            'Colton Hayes',     'colton@rustandrye.com',     '617-555-0223', 'Roots Rock',        '4',  'https://soundcloud.com/rustandrye',                'Gritty roots rock with whiskey-soaked vocals. Lap steel, telecasters, and tales from the road.',                           '45', '@rustandrye',      '@rust_and_rye',     'rustandrye',      NULL,            NULL,              NULL, NULL,                          'Mid-afternoon',                           'agree', 'agree', 'agree', true,  'rustandrye.jpg',       NULL,                                          'under_review', 'Reviewing sample quality'),
  ('Starling',              'Wren Calloway',    'wren@starlingmusic.net',    '617-555-0224', 'Art Rock',          '3',  'https://bandcamp.com/starlingmusic',               'Experimental art rock trio. Unconventional song structures, found sounds, and visual projections.',                        '30', '@starlingmusic',   '@starling_music',   NULL,              'starlingmusic', NULL,              NULL, 'https://starlingmusic.net',   'Need power for projector as well',        'agree', 'agree', 'agree', false, NULL,                   'We do visual projections — is that OK at a daytime fest?', 'under_review', 'Interesting concept, need to verify logistics'),
  ('The Compost Heap',      'Sage Moreno',      'sage@compostheap.band',     '617-555-0225', 'Psychedelic Rock',  '4',  'https://spotify.com/compostheap',                  'Psychedelic jams that grow organically. Long songs, weird sounds, and lots of pedals.',                                    '60', '@compostheap',     '@the_compost_heap', NULL,              'compostheap',   NULL,              NULL, NULL,                          'We need at least a 60-min slot',          'agree', 'agree', 'agree', true,  'compostheap.jpg',      'Our songs average 15 minutes',                'under_review', '60-min set might be hard to schedule'),
  ('Paper Lanterns',        'Ivy Chen',         'ivy@paperlanterns.band',    '617-555-0226', 'Dream Pop',         '3',  'https://youtube.com/paperlanternsband',             'Delicate dream pop with reverb-soaked guitars and whispery vocals. Quiet beauty for a noisy world.',                      '30', '@paperlanterns',   '@paper_lanterns',   'paperlanterns',   NULL,            NULL,              NULL, 'https://paperlanterns.band',  'Quieter time slot preferred',             'agree', 'agree', 'agree', true,  'paperlanterns.jpg',    'We are very quiet — can we be far from louder bands?',    'under_review', 'Volume scheduling consideration'),
  ('Iron Patio Furniture',  'Blake Morrison',   'blake@ironpatio.com',       '617-555-0227', 'Metal',             '5',  'https://bandcamp.com/ironpatiofurniture',          'Heavy metal that shakes the foundation. Dual guitars, blast beats, and enough bass to rattle the china.',                  '30', '@ironpatio',       '@iron_patio',       NULL,              'ironpatio',     NULL,              NULL, NULL,                          'We can play quieter if needed...',         'agree', 'agree', 'agree', true,  'ironpatio.jpg',        'Seriously, we can tone it down. Promise.',     'under_review', 'Need to discuss volume expectations'),

  -- REJECTED bands (3)
  ('DJ Bass Cannon',        'Kyle Pratt',       'kyle@basscannon.dj',        '617-555-0228', 'Dubstep/EDM',       '1',  'https://soundcloud.com/djbasscannon',              'BASS. DROPS. EVERY. THIRTY. SECONDS. Bring earplugs or don''t come.',                                                     '60', '@djbasscannon',    '@dj_bass_cannon',   NULL,              'djbasscannon',  NULL,              NULL, NULL,                          'Midnight slot? Just kidding. Or am I?',   'agree', 'agree', 'agree', false, NULL,                   NULL,                                          'rejected', 'Volume far too high for residential neighborhood'),
  ('The Algorithms',        'Chad Worthington',  'chad@thealgorithms.ai',    '617-555-0229', 'AI-Generated',      '0',  'https://suno.ai/thealgorithms',                    'Fully AI-generated music performed by laptops on stands. No humans involved. The future is now.',                          '120','@thealgorithms',   '@the_algorithms',   NULL,              NULL,            NULL,              NULL, 'https://thealgorithms.ai',    'Our laptops are always available',         'agree', 'agree', 'agree', false, NULL,                   'Do we count as a band if no one is in the band?',        'rejected', 'Must have live human performers'),
  ('Screaming Into Void',   'Raven Blackwood',  'raven@screamvoid.com',      '617-555-0230', 'Noise',             '1',  'https://bandcamp.com/screamingintovoid',           'One person, one microphone, one long unbroken scream. Art.',                                                               '90', '@screamvoid',      '@screaming_void',   NULL,              'screamvoid',    NULL,              NULL, NULL,                          'I only perform at dawn or dusk',          'agree', 'agree', 'agree', false, NULL,                   'This is a legitimate art form',                           'rejected', 'Not a good fit for a family-friendly neighborhood festival')
) AS v(band_name, contact_name, contact_email, contact_phone, genre, member_count,
       music_sample_link, bio, set_length, venmo_handle, instagram, spotify, soundcloud, bandcamp,
       facebook, website, scheduling_notes, equipment_consent, payment_consent, timeline_consent,
       has_photo, photo_filename, questions_comments, status, admin_notes)
WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026';


-- ============================================================
-- ASSIGN some approved bands to approved porches with time slots
-- ============================================================

-- Assign The Stoop Jams → 15 Cutter Avenue, 2:00-2:45
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '15 Cutter Avenue'),
  set_start_time = '14:00', set_end_time = '14:45'
WHERE band_name = 'The Stoop Jams' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign Sidewalk Serenade → 42 Herbert Street, 12:00-12:30
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '42 Herbert Street'),
  set_start_time = '12:00', set_end_time = '12:30'
WHERE band_name = 'Sidewalk Serenade' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign Brass Knuckle Quartet → 88 Day Street (has covered porch), 1:00-2:00
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '88 Day Street'),
  set_start_time = '13:00', set_end_time = '14:00'
WHERE band_name = 'Brass Knuckle Quartet' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign The Lullaby League → 7 Kidder Avenue (fully accessible), 12:00-12:30
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '7 Kidder Avenue'),
  set_start_time = '12:00', set_end_time = '12:30'
WHERE band_name = 'The Lullaby League' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign Mambo Kings of Mass → 18 Atherton Street (largest yard), 3:00-4:00
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '18 Atherton Street'),
  set_start_time = '15:00', set_end_time = '16:00'
WHERE band_name = 'Mambo Kings of Mass' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign DJ Porchlight → 310 Broadway (high foot traffic), 4:30-5:30
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '310 Broadway'),
  set_start_time = '16:30', set_end_time = '17:30'
WHERE band_name = 'DJ Porchlight' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign Sunset Dub Collective → 134 Prospect Street, 4:00-4:45
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '134 Prospect Street'),
  set_start_time = '16:00', set_end_time = '16:45'
WHERE band_name = 'Sunset Dub Collective' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;

-- Assign Bossa Nova Brunch → 201 Central Street, 12:30-1:00
UPDATE bands SET
  assigned_porch_id = (SELECT p.id FROM porches p JOIN events e ON p.event_id = e.id JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026' AND p.address = '201 Central Street'),
  set_start_time = '12:30', set_end_time = '13:00'
WHERE band_name = 'Bossa Nova Brunch' AND event_id = (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026')
AND assigned_porch_id IS NULL;


-- ============================================================
-- TIME SLOTS for this event
-- ============================================================

INSERT INTO time_slots (event_id, start_time, end_time)
SELECT e.id, v.start_time::timestamptz, v.end_time::timestamptz
FROM events e
JOIN organizations o ON e.organization_id = o.id
CROSS JOIN (VALUES
  ('2026-05-16T12:00:00-04:00', '2026-05-16T13:00:00-04:00'),
  ('2026-05-16T13:00:00-04:00', '2026-05-16T14:00:00-04:00'),
  ('2026-05-16T14:00:00-04:00', '2026-05-16T15:00:00-04:00'),
  ('2026-05-16T15:00:00-04:00', '2026-05-16T16:00:00-04:00'),
  ('2026-05-16T16:00:00-04:00', '2026-05-16T17:00:00-04:00'),
  ('2026-05-16T17:00:00-04:00', '2026-05-16T18:00:00-04:00')
) AS v(start_time, end_time)
WHERE o.slug = 'somerville-porchfest' AND e.name = 'Somerville Porchfest 2026'
AND NOT EXISTS (
  SELECT 1 FROM time_slots ts WHERE ts.event_id = e.id
);

COMMIT;
