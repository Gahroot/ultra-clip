/** Built-in background music track identifier. */
export type MusicTrack =
  // Legacy generic tracks
  | 'ambient-tech'
  | 'ambient-motivational'
  | 'ambient-chill'
  // Style-curated tracks — each matches a preset's creative personality
  | 'cinematic-ambient'       // Film: atmospheric, slow-burn orchestral pads
  | 'cinematic-noir'          // Film Noir variant: jazzy, smoky, mysterious
  | 'cinematic-golden'        // Film Golden Hour: warm strings, hopeful
  | 'high-energy-beats'       // Velocity: punchy electronic, 140+ BPM
  | 'high-energy-trap'        // Velocity Bold: aggressive 808s, dark energy
  | 'gritty-lofi'             // Rebel: lo-fi with vinyl crackle, grungy bass
  | 'gritty-dark'             // Rebel Blackout: industrial, distorted, raw
  | 'synthwave-neon'          // Neon: retro synthwave, 80s arpeggios
  | 'synthwave-vapor'         // Neon Ice: vaporwave, dreamy pads
  | 'impact-hype'             // Impact: hard-hitting hip-hop instrumental
  | 'corporate-upbeat'        // Growth/Prime: clean, professional, uplifting
  | 'ember-warm'              // Ember: warm indie acoustic, soulful
  | 'volt-electric'           // Volt: electro house, driving bassline
  | 'clarity-focus'           // Clarity: minimal piano + soft pads, educational
