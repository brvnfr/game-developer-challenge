/**
 * Converts the provided WAV sounds (assets/sounds) into the files served by the game (public/assets/audio):
 * effects → MP3 mono 96 kbit/s (about 10× smaller), loops → WAV mono 22.05 kHz (seamless looping).
 *
 *   npm run assets:audio      (requires ffmpeg on the PATH)
 *
 * The output is committed, so a clean checkout does not need ffmpeg.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLoopSound, SOUND_IDS, soundFileName } from '../src/game/audio/soundCatalog';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'public', 'assets', 'audio');
mkdirSync(outputDirectory, { recursive: true });

let totalBytes = 0;
for (const id of SOUND_IDS) {
  const source = join(root, 'assets', 'sounds', `${id}.wav`);
  const target = join(outputDirectory, soundFileName(id));
  const encoding = isLoopSound(id)
    ? ['-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le']
    : ['-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, ...encoding, '-map_metadata', '-1', target]);
  totalBytes += statSync(target).size;
}
console.log(`${SOUND_IDS.length} sounds written to public/assets/audio (${Math.round(totalBytes / 1024)} KB)`);
