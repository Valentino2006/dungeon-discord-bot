// data/pets.js

const EGGS = {
  huevo_bosque: {
    id: 'huevo_bosque',
    name: 'Huevo de Bosque',
    image: './assets/eggs/huevo_bosque.png', // 🖼️ Ruta de la imagen del huevo
    dungeonOrigin: 'Bosque Sombrío',
    dropChance: 0.9, // Probabilidad al completar la mazmorra
    bgImage: './assets/backgrounds/bosque_sombrio.png', // 🖼️ Fondo tematizado de la Mazmorra
    pets: [
      {
        id: 'duende_bebe',
        name: 'Duendecillo',
        rarity: 'Común',
        chance: 0.60,
        emoji: '🍃',
        color: '#A2D9CE',
        image: './assets/pets/duendecillo.png',
        stats: { atk: 3n, def: 1n, hp: 10n }
      },
      {
        id: 'lobo_silvestre',
        name: 'Lobo Silvestre',
        rarity: 'Raro',
        chance: 0.25,
        emoji: '🐺',
        color: '#3498DB',
        image: './assets/pets/lobo_silvestre.png',
        stats: { atk: 8n, def: 4n, hp: 25n }
      },
      {
        id: 'espiritu_musgo',
        name: 'Espíritu de Musgo',
        rarity: 'Épico',
        chance: 0.10,
        emoji: '🌿',
        color: '#9B59B6',
        image: './assets/pets/espiritu_musgo.png',
        stats: { atk: 18n, def: 10n, hp: 60n }
      },
      {
        id: 'buho_anciano',
        name: 'Búho Anciano',
        rarity: 'Legendario',
        chance: 0.04,
        emoji: '🦉',
        color: '#F1C40F',
        image: './assets/pets/buho_anciano.png',
        stats: { atk: 45n, def: 25n, hp: 140n }
      },
      {
        id: 'guardian_bosque',
        name: 'Guardián del Bosque',
        rarity: 'Mítico',
        chance: 0.01,
        emoji: '👑',
        color: '#E74C3C',
        image: './assets/pets/guardian_bosque.png',
        stats: { atk: 110n, def: 60n, hp: 350n }
      }
    ]
  }
};

// 📊 MARGEN DE VARIACIÓN (IVs) SEGÚN LA RAREZA
const RARITY_VARIATION = {
  'Común': { minMult: 0.75, maxMult: 1.35 },     // -25% a +35%
  'Raro': { minMult: 0.80, maxMult: 1.30 },      // -20% a +30%
  'Épico': { minMult: 0.85, maxMult: 1.25 },     // -15% a +25%
  'Legendario': { minMult: 0.90, maxMult: 1.20 },// -10% a +20%
  'Mítico': { minMult: 0.90, maxMult: 1.20 }     // -10% a +20%
};

// 🎲 Helper para obtener un entero aleatorio entre min y max (ambos inclusivos)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ⚡ Helper para simular IVs y retornar siempre un BigInt
function rollBigIntStat(baseValue, minMult, maxMult) {
  const baseNum = Number(baseValue);
  const min = Math.max(1, Math.floor(baseNum * minMult)); // Mínimo garantizado de 1
  const max = Math.max(min, Math.ceil(baseNum * maxMult));
  return BigInt(getRandomInt(min, max));
}

// 🔍 Helper para obtener la configuración y datos completos de un huevo
function getEggData(eggId) {
  return EGGS[eggId] || null;
}

// Función para tirar el dado de eclosión
function rollPetFromEgg(eggId) {
  const eggData = EGGS[eggId];
  if (!eggData) return null;

  const rand = Math.random();
  let cumulative = 0;
  let selectedPet = eggData.pets[0];

  for (const pet of eggData.pets) {
    cumulative += pet.chance;
    if (rand <= cumulative) {
      selectedPet = pet;
      break;
    }
  }

  // Obtener la configuración de variación según la rareza obtenida
  const config = RARITY_VARIATION[selectedPet.rarity] || { minMult: 0.8, maxMult: 1.2 };

  // CÁLCULO INDEPENDIENTE DE STATS (IVs) EN BIGINT
  const rolledAtk = rollBigIntStat(selectedPet.stats.atk, config.minMult, config.maxMult);
  const rolledDef = rollBigIntStat(selectedPet.stats.def, config.minMult, config.maxMult);
  const rolledHp = rollBigIntStat(selectedPet.stats.hp, config.minMult, config.maxMult);

  return {
    uid: `${selectedPet.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    id: selectedPet.id,
    name: selectedPet.name,
    rarity: selectedPet.rarity,
    emoji: selectedPet.emoji,
    color: selectedPet.color,
    image: selectedPet.image || null, // 🖼️ Transferimos la ruta de la imagen
    bgImage: eggData.bgImage || null,
    stats: {
      atk: rolledAtk,
      def: rolledDef,
      hp: rolledHp
    }
  };
}

module.exports = { EGGS, rollPetFromEgg, getEggData };