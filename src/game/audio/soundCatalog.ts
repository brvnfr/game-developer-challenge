/**
 * Sounds used by the game. Sources are the WAV files in assets/sounds; `npm run assets:audio` converts them
 * into public/assets/audio: short effects to MP3 (mono, 96 kbit/s), loops to mono 22 kHz WAV so they repeat
 * without the gap MP3 encoders add.
 */
export const SOUND_IDS = [
  'cannon_fire_1',
  'cannon_fire_2',
  'cannon_fire_3',
  'cannon_broadside',
  'cannonball_water_hit_1',
  'cannonball_water_hit_2',
  'ship_wood_hit_1',
  'ship_wood_hit_2',
  'ship_collision',
  'ship_explosion_1',
  'ship_explosion_2',
  'ship_sinking',
  'score_point',
  'health_low',
  'time_warning',
  'game_start',
  'game_pause',
  'game_resume',
  'game_complete',
  'game_over',
  'ui_click',
  'ocean_ambience_loop',
  'ship_sailing_loop',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

export const LOOP_SOUND_IDS = ['ocean_ambience_loop', 'ship_sailing_loop'] as const satisfies readonly SoundId[];
export type LoopSoundId = (typeof LOOP_SOUND_IDS)[number];

export function isLoopSound(id: SoundId): id is LoopSoundId {
  return (LOOP_SOUND_IDS as readonly SoundId[]).includes(id);
}

/** File served from public/assets/audio for a sound. */
export function soundFileName(id: SoundId): string {
  return isLoopSound(id) ? `${id}.wav` : `${id}.mp3`;
}
