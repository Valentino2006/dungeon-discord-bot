const db = require('./database');

const SUFIJOS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

const BASE_PRODUCTION_PER_MINE = 10n; 
const BASE_EXP_PER_MINE = 1n;
const BASE_MINE_COST = 300n;

// --- HELPERS PARA MANEJO DE JSON Y BIGINT EN SQLITE ---
function stringifyJSON(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

function parseJSON(str, defaultValue) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

// --- FORMATEO Y MATEMÁTICAS ---
function formatNumber(value) {
  if (value === undefined || value === null) return '0';
  let num = typeof value === 'bigint' ? Number(value) : Number(value);
  if (isNaN(num)) return '0';
  if (num < 1000) return num.toString();
  let index = 0;
  while (num >= 1000 && index < SUFIJOS.length - 1) {
    num /= 1000;
    index++;
  }
  return `${num.toFixed(2)}${SUFIJOS[index]}`;
}

function getRequiredExp(level) {
  return BigInt(Math.floor(100 * Math.pow(1.3, level - 1)));
}

function getNextMineCost(currentMines) {
  const multiplier = Math.pow(1.15, Number(currentMines));
  return BigInt(Math.floor(Number(BASE_MINE_COST) * multiplier));
}

// --- CÁLCULO DE ESTADÍSTICAS ---
function getEffectiveStats(profile) {
  const baseStats = profile.stats || {};
  let totalAtk = BigInt(baseStats.atk ?? 10n);
  let totalDef = BigInt(baseStats.def ?? 5n);
  let totalMaxHp = BigInt(baseStats.maxHp ?? 100n);

  // 1. Sumar equipamiento
  if (profile.equipment?.weapon?.atk) {
    totalAtk += BigInt(profile.equipment.weapon.atk);
  }
  if (profile.equipment?.armor?.def) {
    totalDef += BigInt(profile.equipment.armor.def);
  }
  if (profile.equipment?.armor?.hp) {
    totalMaxHp += BigInt(profile.equipment.armor.hp);
  }

  // 2. Sumar potenciadores (buffs) activos
  if (profile.activeBuffs && Array.isArray(profile.activeBuffs)) {
    for (const buff of profile.activeBuffs) {
      if (!buff.amount) continue;
      const buffAmount = BigInt(buff.amount);

      if (buff.stat === 'atk') totalAtk += buffAmount;
      if (buff.stat === 'def') totalDef += buffAmount;
      if (buff.stat === 'hp') totalMaxHp += buffAmount;
    }
  }

  // 3. 🐾 Sumar estadísticas de la Mascota Equipada
  if (profile.equippedPet && profile.equippedPet.stats) {
    const petStats = profile.equippedPet.stats;
    if (petStats.atk) totalAtk += BigInt(petStats.atk);
    if (petStats.def) totalDef += BigInt(petStats.def);
    if (petStats.hp) totalMaxHp += BigInt(petStats.hp);
  }

  return {
    atk: totalAtk,
    def: totalDef,
    maxHp: totalMaxHp
  };
}

// --- MANEJO DE REGENERACIÓN DE VIDA ---
function updateHpRegen(profile) {
  const stats = getEffectiveStats(profile);
  const now = Date.now();

  if (profile.currentHp === undefined || profile.currentHp === null) {
    profile.currentHp = stats.maxHp;
    profile.lastHpRegen = now;
    saveUserProfile(profile);
    return;
  }

  if (!profile.lastHpRegen) {
    profile.lastHpRegen = now;
  }

  if (profile.currentHp < stats.maxHp) {
    const secondsElapsed = BigInt(Math.floor((now - profile.lastHpRegen) / 1000));
    const hpToRegen = secondsElapsed / 3n;

    if (hpToRegen > 0n) {
      profile.currentHp += hpToRegen;
      if (profile.currentHp > stats.maxHp) {
        profile.currentHp = stats.maxHp;
      }
      profile.lastHpRegen = now;
      saveUserProfile(profile);
    }
  } else {
    if (profile.currentHp > stats.maxHp) {
      profile.currentHp = stats.maxHp;
      saveUserProfile(profile);
    }
  }
}

function getCurrentHp(profile) {
  updateHpRegen(profile);
  const stats = getEffectiveStats(profile);
  return {
    hp: profile.currentHp,
    maxHp: stats.maxHp
  };
}

// --- INGRESOS PASIVOS ---
function getPendingPassiveIncome(profile) {
  const now = Date.now();
  if (!profile.lastCollected) profile.lastCollected = now;

  const secondsElapsed = BigInt(Math.floor((now - profile.lastCollected) / 1000));

  if (secondsElapsed <= 0n || profile.generators.mines <= 0n) {
    return { pendingGold: 0n, pendingExp: 0n, secondsElapsed: 0n };
  }

  const prestigeBonus = 1 + (profile.prestige * 0.5);
  const pendingGold = BigInt(Math.floor(Number(profile.generators.mines * BASE_PRODUCTION_PER_MINE * secondsElapsed) * prestigeBonus));
  const pendingExp = (profile.generators.mines * secondsElapsed) / 5n;

  return { pendingGold, pendingExp, secondsElapsed };
}

function claimPassiveIncome(profile) {
  const { pendingGold, pendingExp, secondsElapsed } = getPendingPassiveIncome(profile);

  if (secondsElapsed > 0n && pendingGold > 0n) {
    profile.gold += pendingGold;
    let levelsGained = 0;
    if (pendingExp > 0n) {
      levelsGained = addExp(profile, pendingExp);
    }

    const remainderSeconds = secondsElapsed % 5n;
    profile.lastCollected = Date.now() - (Number(remainderSeconds) * 1000);

    saveUserProfile(profile);

    return { claimedGold: pendingGold, claimedExp: pendingExp, levelsGained };
  }

  return { claimedGold: 0n, claimedExp: 0n, levelsGained: 0 };
}

// --- OBTENER PERFIL DESDE SQLITE ---
function getUserProfile(userId) {
  const stmt = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?');
  let row = stmt.get(userId);

  const now = Date.now();

  // Si el usuario no existe en la BD, crearlo con valores iniciales
  if (!row) {
    const defaultProfile = {
      userId: userId,
      gold: 0n,
      level: 1,
      exp: 0n,
      prestige: 0,
      statPoints: 0,
      stats: {
        atk: 10n,
        def: 5n,
        maxHp: 100n
      },
      currentHp: 100n,
      equipment: {
        weapon: { id: 'espada_inicial', name: '🗡️ Espada de Madera Inicial', atk: 5n, rarity: 'Común' },
        armor: null
      },
      inventory: [
        {
          id: 'pocion_hp_chica',
          name: '🧪 Poción de HP Chica',
          type: 'consumable',
          effect: { healHp: 50n },
          count: 1
        }
      ],
      activeBuffs: [],
      generators: { mines: 1n },
      pets: [],
      equippedPet: null,
      lastCollected: now,
      lastHpRegen: now
    };

    saveUserProfile(defaultProfile);
    return defaultProfile;
  }

  // Parsear estructuras guardadas
  const rawStats = parseJSON(row.stats, { atk: '10', def: '5', maxHp: '100' });
  const rawEquipment = parseJSON(row.equipment, { weapon: null, armor: null });
  const rawGenerators = parseJSON(row.generators, { mines: '1' });
  const rawInventory = parseJSON(row.inventory, []);
  const rawActiveBuffs = parseJSON(row.active_buffs, []);
  const rawPets = parseJSON(row.pets, []);
  const rawEquippedPet = parseJSON(row.equipped_pet, null);

  // Convertir BigInts internos del equipamiento
  if (rawEquipment.weapon && rawEquipment.weapon.atk !== undefined) {
    rawEquipment.weapon.atk = BigInt(rawEquipment.weapon.atk);
  }
  if (rawEquipment.armor) {
    if (rawEquipment.armor.def !== undefined) rawEquipment.armor.def = BigInt(rawEquipment.armor.def);
    if (rawEquipment.armor.hp !== undefined) rawEquipment.armor.hp = BigInt(rawEquipment.armor.hp);
  }

  // Convertir BigInts internos del inventario
  const normalizedInventory = rawInventory.map(item => {
    if (item.effect && item.effect.healHp !== undefined) {
      item.effect.healHp = BigInt(item.effect.healHp);
    }
    if (item.atk !== undefined) item.atk = BigInt(item.atk);
    if (item.def !== undefined) item.def = BigInt(item.def);
    return item;
  });

  const profile = {
    userId: row.user_id,
    gold: BigInt(row.gold ?? '0'),
    level: Number(row.level ?? 1),
    exp: BigInt(row.exp ?? '0'),
    prestige: Number(row.prestige ?? 0),
    statPoints: Number(row.stat_points ?? 0),
    stats: {
      atk: BigInt(rawStats.atk ?? '10'),
      def: BigInt(rawStats.def ?? '5'),
      maxHp: BigInt(rawStats.maxHp ?? '100')
    },
    currentHp: BigInt(row.current_hp ?? '100'),
    equipment: rawEquipment,
    inventory: normalizedInventory,
    activeBuffs: rawActiveBuffs,
    generators: {
      mines: BigInt(rawGenerators.mines ?? '1')
    },
    pets: rawPets,
    equippedPet: rawEquippedPet,
    lastCollected: Number(row.last_collected ?? now),
    lastHpRegen: Number(row.last_hp_regen ?? now)
  };

  updateHpRegen(profile);
  return profile;
}

// --- GUARDAR O ACTUALIZAR PERFIL EN SQLITE ---
function saveUserProfile(profile) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (
      user_id, gold, level, exp, prestige, stat_points, stats,
      current_hp, equipment, inventory, active_buffs, generators,
      pets, equipped_pet, last_collected, last_hp_regen
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT(user_id) DO UPDATE SET
      gold = excluded.gold,
      level = excluded.level,
      exp = excluded.exp,
      prestige = excluded.prestige,
      stat_points = excluded.stat_points,
      stats = excluded.stats,
      current_hp = excluded.current_hp,
      equipment = excluded.equipment,
      inventory = excluded.inventory,
      active_buffs = excluded.active_buffs,
      generators = excluded.generators,
      pets = excluded.pets,
      equipped_pet = excluded.equipped_pet,
      last_collected = excluded.last_collected,
      last_hp_regen = excluded.last_hp_regen
  `);

  stmt.run(
    profile.userId,
    profile.gold.toString(),
    profile.level,
    profile.exp.toString(),
    profile.prestige,
    profile.statPoints,
    stringifyJSON(profile.stats),
    profile.currentHp.toString(),
    stringifyJSON(profile.equipment),
    stringifyJSON(profile.inventory),
    stringifyJSON(profile.activeBuffs),
    stringifyJSON(profile.generators),
    stringifyJSON(profile.pets),
    stringifyJSON(profile.equippedPet),
    profile.lastCollected,
    profile.lastHpRegen
  );
}

// --- MODIFICACIÓN DE INVENTARIO Y EXP ---
function addItemToInventory(profile, item) {
  if (!profile.inventory) profile.inventory = [];
  const existing = profile.inventory.find(i => i.id === item.id);
  if (existing) {
    existing.count = (existing.count || 1) + (item.count || 1);
  } else {
    profile.inventory.push({ ...item, count: item.count || 1 });
  }
}

function addExp(profile, amount) {
  profile.exp += BigInt(amount);
  let levelsGained = 0;

  while (true) {
    const required = getRequiredExp(profile.level);
    if (profile.exp >= required) {
      profile.exp -= required;
      profile.level += 1;
      profile.statPoints += 5;
      levelsGained++;
    } else {
      break;
    }
  }
  return levelsGained;
}

module.exports = {
  formatNumber,
  getUserProfile,
  saveUserProfile,
  getEffectiveStats,
  getCurrentHp,
  updateHpRegen,
  addItemToInventory,
  getRequiredExp,
  addExp,
  getPendingPassiveIncome,
  claimPassiveIncome,
  getNextMineCost,
  BASE_PRODUCTION_PER_MINE
};