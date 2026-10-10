// WHAT MUSIC DOES TO US — Exhibition edition
// Original particle movement preserved from the first sketch.
let songs = [];
let particles = [];
let fft, amplitude;
let currentSong = null;
let energy = 0;
let bassEnergy = 0;
let trebleEnergy = 0;
let currentPalette = [195, 220, 260, 185];
let targetPalette = [195, 220, 260, 185];
let currentMood = 'SILENCE';
let fileInput, songSelect, emotionSelect, playButton, statusLabel, listeningLabel;
let loadingCount = 0;

const emotionPalettes = {
  SADNESS: [215, 235, 260, 280],
  ANGER: [0, 12, 345, 28],
  LOVE: [320, 335, 350, 305],
  CALM: [170, 185, 145, 195],
  JOY: [42, 52, 25, 15],
  DREAMY: [265, 285, 235, 305]
};

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  fft = new p5.FFT();
  amplitude = new p5.Amplitude();

  fileInput = document.getElementById('audio-upload');
  songSelect = document.getElementById('song-select');
  emotionSelect = document.getElementById('emotion-select');
  playButton = document.getElementById('play-button');
  statusLabel = document.getElementById('status');
  listeningLabel = document.getElementById('listening');

  fileInput.addEventListener('change', handleFiles);
  songSelect.addEventListener('change', changeSong);
  emotionSelect.addEventListener('change', changeEmotion);
  playButton.addEventListener('click', toggleMusic);

  for (let y = -215; y < 225; y += 5) {
    for (let x = -125; x < 125; x += 5) {
      if (insideBody(x, y) && random() < 0.72) {
        particles.push({
          x: x + random(-2, 2),
          y: y + random(-2, 2),
          seed: random(1000),
          size: random(1.2, 3.5),
          colorIndex: floor(random(4))
        });
      }
    }
  }
}

function insideBody(x, y) {
  if (sq(x / 39) + sq((y + 165) / 48) < 1) return true;
  if (abs(x) < 16 && y > -125 && y < -95) return true;
  if (y >= -100 && y < 80) {
    let bodyWidth = map(y, -100, 80, 76, 47);
    if (abs(x) < bodyWidth) return true;
  }
  if (y > -90 && y < 100) {
    let armX = 82 + (y + 90) * 0.13;
    if (abs(abs(x) - armX) < 15) return true;
  }
  if (y >= 80 && y < 225) {
    let legX = 24 + (y - 80) * 0.12;
    if (abs(abs(x) - legX) < 20) return true;
  }
  return false;
}

// Lightweight sample-based analysis. This is an artistic interpretation,
// not a reliable emotion or lyrics recognition model.
function analyseMood(song) {
  const buffer = song.buffer;
  if (!buffer) return 'DREAMY';
  const data = buffer.getChannelData(0);
  const samples = 48;
  const chunkSize = 128;
  let totalEnergy = 0, totalChange = 0, totalBrightness = 0, previousRMS = 0;
  for (let j = 0; j < samples; j++) {
    const start = Math.max(0, Math.floor((data.length - chunkSize) * (j + 0.5) / samples));
    let sum = 0, difference = 0, lastSample = 0;
    for (let i = 0; i < chunkSize; i++) {
      const value = data[start + i] || 0;
      sum += value * value;
      difference += Math.abs(value - lastSample);
      lastSample = value;
    }
    const rms = Math.sqrt(sum / chunkSize);
    totalEnergy += rms;
    totalChange += Math.abs(rms - previousRMS);
    totalBrightness += difference / chunkSize;
    previousRMS = rms;
  }
  const loudness = totalEnergy / samples;
  const dynamics = totalChange / samples;
  const brightness = totalBrightness / samples;
  if (loudness > 0.20 && dynamics > 0.07) return 'ANGER';
  if (loudness > 0.15 && brightness > 0.04) return 'JOY';
  if (loudness < 0.09 && brightness < 0.025) return 'CALM';
  if (loudness < 0.13 && dynamics < 0.035) return 'SADNESS';
  if (brightness < 0.035) return 'DREAMY';
  return 'LOVE';
}

function draw() {
  clear();
  let volume = 0, bass = 0, treble = 0;
  const playing = !!(currentSong && currentSong.isPlaying());
  if (playing) {
    fft.analyze();
    volume = amplitude.getLevel();
    bass = fft.getEnergy('bass') / 255;
    treble = fft.getEnergy('treble') / 255;
  }
  energy = lerp(energy, constrain(volume * 7, 0, 1.5), 0.09);
  bassEnergy = lerp(bassEnergy, bass, 0.12);
  trebleEnergy = lerp(trebleEnergy, treble, 0.12);

  for (let i = 0; i < 4; i++) {
    const difference = ((targetPalette[i] - currentPalette[i] + 540) % 360) - 180;
    currentPalette[i] = (currentPalette[i] + difference * 0.025 + 360) % 360;
  }

  // Only scale/position changes for responsive site. Movement formulas unchanged.
  const availableHeight = Math.max(220, height - (width < 650 ? 335 : 280));
  const scaleFactor = Math.min(width / 460, availableHeight / 470, 1.9);
  push();
  translate(width / 2, height < 700 ? height * 0.46 : height * 0.47);
  scale(scaleFactor);
  blendMode(ADD);
  noStroke();

  let pulse = 1 + bassEnergy * 0.17 + energy * 0.08;
  let time = millis() * 0.001;
  for (let p of particles) {
    let distortion = energy * 24 + bassEnergy * 30;
    let dx = sin(p.y * 0.025 + time * 3 + p.seed) * distortion;
    let dy = cos(p.x * 0.025 + time * 2 + p.seed) * distortion * 0.5;
    let px = p.x * pulse + dx;
    let py = p.y * pulse + dy;
    let particleHue = (currentPalette[p.colorIndex] + trebleEnergy * 12 + sin(p.seed * 0.08) * 6 + 360) % 360;
    let glow = 55 + energy * 30;
    fill(particleHue, 85, glow, 18);
    circle(px, py, p.size * (4 + energy * 3));
    fill(particleHue, 55, 100, 90);
    circle(px, py, p.size * (1 + energy * 0.8));
  }
  pop();
  blendMode(BLEND);
  listeningLabel.textContent = playing ? currentMood + '  ·  LISTENING' : (currentSong ? currentMood + '  ·  PAUSED' : 'SILENCE');
  playButton.textContent = playing ? 'Ⅱ Pause' : '▶ Play';
}

function handleFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  // Allows selecting the same file again if desired.
  fileInput.value = '';
  for (const file of files) {
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg)$/i.test(file.name)) {
      statusLabel.textContent = 'Please choose MP3, WAV, or OGG audio.';
      continue;
    }
    loadingCount++;
    statusLabel.textContent = 'Loading ' + file.name + '…';
    const reader = new FileReader();
    reader.onerror = () => {
      loadingCount--;
      statusLabel.textContent = 'Could not read ' + file.name;
    };
    reader.onload = () => {
      loadSound(reader.result, song => {
        loadingCount--;
        const detectedMood = analyseMood(song);
        const index = songs.length;
        songs.push({name: file.name, sound: song, detectedMood, selectedMood: 'AUTO'});
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = file.name;
        songSelect.appendChild(option);
        songSelect.value = String(index);
        changeSong();
        statusLabel.textContent = 'Ready: ' + file.name + ' · Suggested emotion: ' + detectedMood;
      }, error => {
        loadingCount--;
        console.error('Audio loading error:', error);
        statusLabel.textContent = 'Could not decode ' + file.name + '. Try another MP3.';
      });
    };
    reader.readAsDataURL(file);
  }
}

function changeSong() {
  if (currentSong) currentSong.stop();
  const index = Number(songSelect.value);
  if (index >= 0 && songs[index]) {
    const selected = songs[index];
    currentSong = selected.sound;
    fft.setInput(currentSong);
    amplitude.setInput(currentSong);
    emotionSelect.value = selected.selectedMood;
    applyEmotion(selected);
  } else {
    currentSong = null;
    currentMood = 'SILENCE';
  }
}

function changeEmotion() {
  const index = Number(songSelect.value);
  if (index < 0 || !songs[index]) return;
  const selected = songs[index];
  selected.selectedMood = emotionSelect.value;
  applyEmotion(selected);
}

function applyEmotion(selected) {
  currentMood = selected.selectedMood === 'AUTO' ? selected.detectedMood : selected.selectedMood;
  targetPalette = emotionPalettes[currentMood].slice();
  statusLabel.textContent = 'Suggested: ' + selected.detectedMood + ' · Displayed: ' + currentMood;
}

function toggleMusic() {
  userStartAudio();
  if (!currentSong) {
    statusLabel.textContent = 'Upload and select a song first.';
    return;
  }
  if (currentSong.isPlaying()) currentSong.pause();
  else currentSong.play();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
