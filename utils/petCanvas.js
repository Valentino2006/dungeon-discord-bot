// utils/petCanvas.js
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

// Colores por rareza
const RARITY_COLORS = {
  'Común': '#2ECC71',
  'Raro': '#3498DB',
  'Épico': '#9B59B6',
  'Legendario': '#F1C40F',
  'Mítico': '#E74C3C'
};

/**
 * 🛠 Limpia emojis de Discord (<:nombre:id> o <a:nombre:id>) para renderizar texto limpio en Canvas
 */
function cleanTextForCanvas(text) {
  if (!text) return '';
  return text.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Función auxiliar para ajustar texto largo y evitar desbordamientos
 */
function drawAutoFitText(ctx, text, x, y, maxWidth, initialFontSize, fontStyle = 'bold') {
  const clean = cleanTextForCanvas(text);
  let fontSize = initialFontSize;
  ctx.font = `${fontStyle} ${fontSize}px sans-serif`;
  
  while (ctx.measureText(clean).width > maxWidth && fontSize > 12) {
    fontSize -= 2;
    ctx.font = `${fontStyle} ${fontSize}px sans-serif`;
  }
  ctx.fillText(clean, x, y);
}

/**
 * Helper para escalar imágenes en alta calidad por etapas (Downsampling)
 */
function getScaledImageCanvas(img, targetWidth, targetHeight) {
  let currentCanvas = createCanvas(img.width, img.height);
  let currentCtx = currentCanvas.getContext('2d');
  
  currentCtx.imageSmoothingEnabled = true;
  currentCtx.imageSmoothingQuality = 'high';
  currentCtx.drawImage(img, 0, 0);

  let w = img.width;
  let h = img.height;

  while (w * 0.5 >= targetWidth && h * 0.5 >= targetHeight) {
    w = Math.floor(w * 0.5);
    h = Math.floor(h * 0.5);

    const nextCanvas = createCanvas(w, h);
    const nextCtx = nextCanvas.getContext('2d');
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(currentCanvas, 0, 0, w, h);

    currentCanvas = nextCanvas;
  }

  if (w !== targetWidth || h !== targetHeight) {
    const finalCanvas = createCanvas(targetWidth, targetHeight);
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);
    currentCanvas = finalCanvas;
  }

  return currentCanvas;
}

/**
 * Dibuja rayos de luz en rotación detrás del huevo (Efecto Místico)
 */
function drawRotatingRays(ctx, x, y, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(frame * 0.12); // Velocidad de rotación progresiva

  const rays = 12; // Número de rayos de energía
  ctx.fillStyle = 'rgba(255, 215, 0, 0.08)'; // Color dorado sutil traslúcido

  for (let i = 0; i < rays; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 600, (i * Math.PI * 2) / rays, ((i + 0.45) * Math.PI * 2) / rays);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Dibuja el Huevo en fase de vibración y agrietamiento (Fase 1)
 */
function drawEggPhase(ctx, eggImg, eggEmoji, x, y, size, frame) {
  ctx.save();
  ctx.translate(x, y);

  const shake = Math.min(frame * 2.5, 14);
  const angle = Math.sin(frame * 4) * (shake * Math.PI / 180);
  const offsetX = Math.cos(frame * 6) * (shake * 0.4);
  
  ctx.rotate(angle);
  ctx.translate(offsetX, 0);

  if (eggImg) {
    const scaledCanvas = getScaledImageCanvas(eggImg, size, size);
    ctx.drawImage(scaledCanvas, -size / 2, -size / 2, size, size);
  } else {
    ctx.font = `${size * 0.75}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(eggEmoji || '🥚', 0, 0);
  }

  // Grietas progresivas sobre el huevo
  if (frame >= 3) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(-size * 0.12, -size * 0.05);
    ctx.lineTo(size * 0.08, size * 0.08);

    if (frame >= 5) {
      ctx.lineTo(-size * 0.18, size * 0.25);
      ctx.moveTo(size * 0.08, size * 0.08);
      ctx.lineTo(size * 0.22, size * 0.12);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dibuja partículas flotantes mágicas
 */
function drawAmbientParticles(ctx, frame, totalFrames, color) {
  const particleCount = 12;
  ctx.fillStyle = color;
  for (let i = 0; i < particleCount; i++) {
    const progress = ((frame / totalFrames) + (i / particleCount)) % 1;
    const px = 60 + ((i * 41) % 240);
    const py = 330 - (progress * 260);
    const radius = (1 - progress) * 3.5 + 1;
    
    ctx.globalAlpha = (1 - progress) * 0.8;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Genera la tarjeta visual ANIMADA EN GIF con transición de fondo
 */
async function generateHatchCard(pet, username, egg = null) {
  const width = 800;
  const height = 380;
  const mainColor = RARITY_COLORS[pet.rarity] || '#2ECC71';

  // 1. CARGAR FONDO 1: Incubación / Eclosión
  let incubatingBgImg = null;
  try {
    incubatingBgImg = await loadImage('./assets/backgrounds/hatch_bg.png');
  } catch (err) {}

  // 2. CARGAR FONDO 2: Mazmorra de origen de la Mascota o del Huevo
  let dungeonBgImg = null;
  const dungeonBgPath = (pet && (pet.bgImage || pet.dungeonBg)) || (egg && (egg.bgImage || egg.dungeonBg));
  if (dungeonBgPath) {
    try {
      dungeonBgImg = await loadImage(dungeonBgPath);
    } catch (err) {}
  }

  // 3. Cargar imágenes de Huevo y Mascota
  let eggImg = null;
  if (egg && egg.image) {
    try {
      eggImg = await loadImage(egg.image);
    } catch (e) {}
  }

  let petImg = null;
  if (pet && pet.image) {
    try {
      petImg = await loadImage(pet.image);
    } catch (e) {}
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const gif = GIFEncoder();

  const totalFrames = 24;

  for (let frame = 0; frame < totalFrames; frame++) {
    ctx.clearRect(0, 0, width, height);

    // ==========================================
    // 🌌 MANEJO DINÁMICO DE FONDOS Y TRANSICIÓN
    // ==========================================
    
    // FASE 1: Fondo de Incubación (Frames 0-7)
    if (frame < 8) {
      if (incubatingBgImg) {
        ctx.drawImage(incubatingBgImg, 0, 0, width, height);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#110b29');
        gradient.addColorStop(0.5, '#2a1a4a');
        gradient.addColorStop(1, '#0b0c10');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, width, height);
    } 
    // FASE 2 y 3: Fondo de Mazmorra (Frames 8-23)
    else {
      if (dungeonBgImg) {
        ctx.drawImage(dungeonBgImg, 0, 0, width, height);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0b0c10');
        gradient.addColorStop(0.5, '#1f2833');
        gradient.addColorStop(1, '#0b0c10');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, width, height);
    }

    // RECUADRO IZQUIERDO TRASLÚCIDO
    ctx.fillStyle = 'rgba(15, 15, 26, 0.55)';
    ctx.beginPath();
    ctx.roundRect(40, 40, 280, 300, 20);
    ctx.fill();

    ctx.strokeStyle = frame >= 8 ? mainColor : '#7289DA';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ==========================================
    // FASE 1: HUEVO AGRIETÁNDOSE (Frames 0 a 7)
    // ==========================================
    if (frame < 8) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#E0E0E0';
      drawAutoFitText(ctx, `¡ECLOSIONANDO HUEVO!`, 360, 80, 400, 20, 'bold');

      const eggTitle = egg ? egg.name : 'Huevo Misterioso';
      ctx.fillStyle = '#F1C40F';
      drawAutoFitText(ctx, eggTitle, 360, 130, 400, 32, 'bold');

      // 🔄 Icono Spinner de Carga
      const spinnerX = 372;
      const spinnerY = 202;
      const spinnerAngle = (frame / 8) * Math.PI * 2;

      ctx.save();
      ctx.translate(spinnerX, spinnerY);
      ctx.rotate(spinnerAngle);
      ctx.strokeStyle = '#F1C40F';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();

      const dots = '.'.repeat((frame % 3) + 1);
      ctx.fillStyle = '#A0AAB0';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Abriendo cascarón${dots}`, 392, spinnerY);

      // ✨ Rayos mágicos giratorios detrás del huevo
      drawRotatingRays(ctx, 180, 190, frame);

      // Dibujar huevo agrietándose
      drawEggPhase(ctx, eggImg, egg ? egg.emoji : '🥚', 180, 190, 200, frame);
    }

    // ==========================================
    // FASE 2 Y 3: REVELACIÓN Y STATS (Frames 8 a 23)
    // ==========================================
    else {
      // Aura de rareza pulsante
      const pulse = 0.35 + 0.15 * Math.sin((frame / totalFrames) * Math.PI * 2);
      const auraGradient = ctx.createRadialGradient(180, 190, 10, 180, 190, 170);
      auraGradient.addColorStop(0, mainColor);
      auraGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGradient;
      ctx.globalAlpha = Math.max(0, Math.min(1, pulse));
      ctx.beginPath();
      ctx.arc(180, 190, 170, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Partículas flotantes
      drawAmbientParticles(ctx, frame, totalFrames, mainColor);

      // Panel derecho
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#E0E0E0';
      drawAutoFitText(ctx, `¡ECLOSIÓN DE ${username.toUpperCase()}!`, 360, 80, 400, 20, 'bold');

      ctx.fillStyle = mainColor;
      drawAutoFitText(ctx, pet.name, 360, 130, 400, 36, 'bold');

      // Badge de Rareza
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.roundRect(360, 145, 130, 30, 8);
      ctx.fill();

      ctx.fillStyle = '#0b0c10';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((pet.rarity || 'Común').toUpperCase(), 425, 166);

      // Estadísticas
      ctx.textAlign = 'left';
      const startY = 220;
      const statsList = [
        { label: 'ATQ', value: `+${pet.stats.atk}`, color: '#E74C3C' },
        { label: 'DEF', value: `+${pet.stats.def}`, color: '#3498DB' },
        { label: 'HP',  value: `+${pet.stats.hp}`,  color: '#2ECC71' }
      ];

      statsList.forEach((stat, idx) => {
        const y = startY + (idx * 40);

        ctx.fillStyle = stat.color;
        ctx.beginPath();
        ctx.roundRect(360, y - 20, 55, 26, 6);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.label, 387, y - 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(stat.value, 430, y - 1);
      });

      // Movimiento de flotación de la Mascota
      const floatY = Math.sin(((frame - 8) / 16) * Math.PI * 2) * 7;
      const petX = 180;
      const petY = 190 + floatY;

      let scaleProgress = 1.0;
      if (frame <= 10) {
        scaleProgress = 0.5 + ((frame - 8) / 2) * 0.5;
      }
      const currentSize = 220 * scaleProgress;

      if (petImg) {
        const scaledCanvas = getScaledImageCanvas(petImg, currentSize, currentSize);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(scaledCanvas, petX - currentSize / 2, petY - currentSize / 2, currentSize, currentSize);
      } else {
        ctx.font = `${100 * scaleProgress}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(pet ? (pet.emoji || '🐾') : '🐾', petX, petY);
      }
    }

    // ==========================================
    // ⚡ TRANSICIÓN WHITE FLASH (Frames 8 a 11)
    // ==========================================
    if (frame >= 8 && frame <= 11) {
      const flashAlphas = { 8: 0.90, 9: 0.60, 10: 0.30, 11: 0.10 };
      const flashAlpha = flashAlphas[frame] || 0;

      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // EXTRAER FOTOGRAMA PARA EL GIF
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const palette = quantize(imageData, 256);
    const index = applyPalette(imageData, palette);

    gif.writeFrame(index, width, height, { palette, delay: 100 });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

/**
 * Genera la tarjeta de perfil ESTÁTICA (PNG) para la mascota equipada
 */
async function generatePetCard(pet, username) {
  const width = 1000;
  const height = 340;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const mainColor = pet ? (RARITY_COLORS[pet.rarity] || '#9B59B6') : '#555555';

  if (!pet) {
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin Mascota Equipada', width / 2, height / 2);
    return canvas.toBuffer('image/png');
  }

  let loadedBg = false;
  if (pet.bgImage) {
    try {
      const bgImg = await loadImage(pet.bgImage);
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.fillStyle = 'rgba(15, 15, 26, 0.45)';
      ctx.fillRect(0, 0, width, height);
      loadedBg = true;
    } catch (e) {}
  }

  if (!loadedBg) {
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(15, 15, width - 30, height - 30, 20);
  ctx.stroke();

  if (pet.image) {
    try {
      const img = await loadImage(pet.image);
      const scaledCanvas = getScaledImageCanvas(img, 180, 180);
      ctx.drawImage(scaledCanvas, 140 - 90, 170 - 90, 180, 180);
    } catch (err) {
      ctx.font = '110px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(pet.emoji || '🐾', 140, 170);
    }
  } else {
    ctx.font = '110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(pet.emoji || '🐾', 140, 170);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  drawAutoFitText(ctx, pet.name, 280, 110, 660, 42, 'bold');

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`[${pet.rarity}]`, 280, 150);

  const startY = 200;
  const statsList = [
    { label: 'ATQ', value: `+${pet.stats.atk}`, color: '#E74C3C' },
    { label: 'DEF', value: `+${pet.stats.def}`, color: '#3498DB' },
    { label: 'HP',  value: `+${pet.stats.hp}`,  color: '#2ECC71' }
  ];

  statsList.forEach((stat, idx) => {
    const x = 280 + (idx * 220);

    ctx.fillStyle = stat.color;
    ctx.beginPath();
    ctx.roundRect(x, startY, 75, 38, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.label, x + 37, startY + 25);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.value, x + 90, startY + 27);
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateHatchCard, generatePetCard };