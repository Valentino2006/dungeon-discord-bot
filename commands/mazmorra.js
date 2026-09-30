const { EmbedBuilder } = require('discord.js');
const { getUserProfile, saveUserProfile, getEffectiveStats, addItemToInventory, addExp, formatNumber } = require('../utils/game');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const EMOJIS = require('../data/emojis');
const PETS = require('../data/pets');
const MAZMORRAS = [
  {
    id: 1,
    name: `${EMOJIS.bosque_sombrio} Bosque Sombrío`,
    minLevel: 1,
    reqPrestige: 0,
    waves: [
      { type: 'subditos', name: ` ${EMOJIS.duende_esbirro} 3x Duendes Silvestres`, atk: 5n, def: 1n, hp: 25n, exp: 40n, gold: 80n },
      { type: 'subjefe', name: ` ${EMOJIS.duende_chaman} Chamán Duende`, atk: 10n, def: 3n, hp: 50n, exp: 80n, gold: 180n },
      { type: 'jefe', name: ` ${EMOJIS.duende_rey} Rey Duende Garlok`, atk: 16n, def: 6n, hp: 100n, exp: 180n, gold: 400n }
    ],
    dropTable: [
      { id: 'pocion_hp_chica', name: `${EMOJIS.pocion_chica} Poción de HP Chica`, type: 'consumable', effect: { healHp: 50n }, chance: 0.5 },
      { id: 'espada_hierro', name: `${EMOJIS.espada_hierro} Espada de Hierro`, type: 'weapon', atk: 15n, rarity: 'Rara', chance: 0.2 },
      { id: 'armadura_cuero', name: `${EMOJIS.armadura_cuero} Armadura de Cuero`, type: 'armor', def: 5n, hp: 25n, rarity: 'Común', chance: 0.2 },
      { id: 'huevo_bosque', name: `${EMOJIS.huevo_bosque} Huevo de Bosque`, type: 'egg', chance: PETS.EGGS.huevo_bosque.dropChance },
      { id: 'mat_cobre', name: `${EMOJIS.lingote_cobre} Lingote de Cobre`, type: 'material', chance: 0.6 },
      { id: 'mat_tela', name: `${EMOJIS.tela_comun} Tela Común`, type: 'material', chance: 0.5 }
    ]
  },
  {
    id: 2,
    name: 'Cueva de los Cálices',
    minLevel: 10,
    reqPrestige: 0,
    waves: [
      { type: 'subditos', name: '4x Esqueletos Guerreros', atk: 25n, def: 8n, hp: 120n, exp: 200n, gold: 400n },
      { type: 'subjefe', name: 'Gólem de Piedra', atk: 50n, def: 25n, hp: 350n, exp: 450n, gold: 1000n },
      { type: 'jefe', name: 'Lich del Averno', atk: 90n, def: 40n, hp: 750n, exp: 1000n, gold: 2800n }
    ],
    dropTable: [
      { id: 'pocion_hp_media', name: '🧪 Poción de HP Mediana', type: 'consumable', effect: { healHp: 150n }, chance: 0.4 },
      { id: 'espada_acero', name: '⚔️ Espada de Acero', type: 'weapon', atk: 35n, rarity: 'Rara', chance: 0.2 },
      { id: 'cota_malla', name: '🛡️ Cota de Malla', type: 'armor', def: 15n, hp: 70n, rarity: 'Rara', chance: 0.2 },
      { id: 'huevo_cueva', name: '🥚 Huevo Subterráneo', type: 'egg', chance: 0.05 },
      { id: 'mat_hierro', name: '⚪ Lingote de Hierro', type: 'material', chance: 0.5 },
      { id: 'mat_hueso', name: '🦴 Hueso Encantado', type: 'material', chance: 0.4 }
    ]
  },
  {
    id: 3,
    name: 'Catacumbas Infernales',
    minLevel: 25,
    reqPrestige: 0,
    waves: [
      { type: 'subditos', name: '5x Demonios Menores', atk: 120n, def: 50n, hp: 900n, exp: 1500n, gold: 3500n },
      { type: 'subjefe', name: 'Demonio Mayor', atk: 220n, def: 100n, hp: 2200n, exp: 3500n, gold: 8000n },
      { type: 'jefe', name: 'Señor del Fuego Ignis', atk: 380n, def: 180n, hp: 5000n, exp: 8000n, gold: 18000n }
    ],
    dropTable: [
      { id: 'pocion_hp_grande', name: '🧪 Poción de HP Grande', type: 'consumable', effect: { healHp: 350n }, chance: 0.4 },
      { id: 'mandoble_mithril', name: '⚔️ Mandoble de Mithril', type: 'weapon', atk: 75n, rarity: 'Épica', chance: 0.2 },
      { id: 'huevo_catacumbas', name: '🥚 Huevo Infernal', type: 'egg', chance: 0.04 },
      { id: 'mat_mithril', name: '🔷 Lingote de Mithril', type: 'material', chance: 0.4 },
      { id: 'mat_fuego', name: '🔥 Esencia de Fuego', type: 'material', chance: 0.3 }
    ]
  },
  {
    id: 4,
    name: 'Cima del Dragón',
    minLevel: 50,
    reqPrestige: 0,
    waves: [
      { type: 'subditos', name: '4x Dracos de la Garganta', atk: 450n, def: 220n, hp: 6000n, exp: 12000n, gold: 30000n },
      { type: 'subjefe', name: 'Dragón Joven', atk: 800n, def: 400n, hp: 15000n, exp: 28000n, gold: 70000n },
      { type: 'jefe', name: 'Dragón Anciano Ignajar', atk: 1400n, def: 750n, hp: 32000n, exp: 65000n, gold: 160000n }
    ],
    dropTable: [
      { id: 'pocion_suprema', name: '🧪 Poción Suprema', type: 'consumable', effect: { healHp: 1000n }, chance: 0.3 },
      { id: 'hoja_draconica', name: '⚔️ Hoja Dracónica', type: 'weapon', atk: 160n, rarity: 'Legendaria', chance: 0.15 },
      { id: 'huevo_dragon', name: '🥚 Huevo Dracónico', type: 'egg', chance: 0.04 },
      { id: 'mat_escama', name: '🐉 Escama Dracónica', type: 'material', chance: 0.35 },
      { id: 'mat_nucleo', name: '🔮 Núcleo de Dragón', type: 'material', chance: 0.2 }
    ]
  },
  {
    id: 5,
    name: 'Abismo del Caos',
    minLevel: 80,
    reqPrestige: 1,
    waves: [
      { type: 'subditos', name: '6x Sombras del Vacío', atk: 1800n, def: 900n, hp: 25000n, exp: 120000n, gold: 350000n },
      { type: 'subjefe', name: 'General del Vacío', atk: 3200n, def: 1600n, hp: 65000n, exp: 300000n, gold: 800000n },
      { type: 'jefe', name: 'Emperador de la Sombra', atk: 5500n, def: 2800n, hp: 140000n, exp: 750000n, gold: 2000000n }
    ],
    dropTable: [
      { id: 'pocion_celestial', name: '🧪 Poción Celestial', type: 'consumable', effect: { healHp: 5000n }, chance: 0.25 },
      { id: 'huevo_caos', name: '🥚 Huevo del Caos', type: 'egg', chance: 0.03 },
      { id: 'mat_abisal', name: '🌌 Esencia Abisal', type: 'material', chance: 0.25 },
      { id: 'mat_orichalcum', name: '✨ Orichalcum Puro', type: 'material', chance: 0.15 }
    ]
  }
];

module.exports = {
  name: 'mazmorra',
  aliases: ['pelear', 'dungeon'],

  async execute(message, args) {
    const profile = getUserProfile(message.author.id);
    const dungeonId = parseInt(args[0]);

    if (!dungeonId || isNaN(dungeonId)) {
      let list = MAZMORRAS.map(m => {
        const isLocked = profile.level < m.minLevel || profile.prestige < m.reqPrestige;
        const icon = isLocked ? '🔒' : '⚔️';
        const pReq = m.reqPrestige > 0 ? ` • 🔮 Prestigio Min: ${m.reqPrestige}` : '';
        return `${icon} **[${m.id}]${m.name}** - Nv. Min: ${m.minLevel}${pReq}`;
      }).join('\n');

      const embedList = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('🗡️ Mazmorras de la Comarca')
        .setDescription(`Usa \`!mazmorra <número>\` para iniciar una incursión.\n\n${list}`)
        .setFooter({ text: 'Tu HP se conserva entre batallas. Sana con pociones en !inventario.' });

      return message.reply({ embeds: [embedList] });
    }

    const dungeon = MAZMORRAS.find(m => m.id === dungeonId);
    if (!dungeon) return message.reply('❌ Esa mazmorra no existe.');
    if (profile.level < dungeon.minLevel) return message.reply(`🔒 Requieres ser **Nivel ${dungeon.minLevel}**.`);
    if (profile.prestige < dungeon.reqPrestige) return message.reply(`🚫 Requieres **Prestigio ${dungeon.reqPrestige}**.`);

    const stats = getEffectiveStats(profile);

    if (profile.currentHp <= 0n) {
      return message.reply(`❌ **Estás debilitado y no puedes pelear.**\n${EMOJIS.hp} Vida Actual: \`0 / ${formatNumber(stats.maxHp)}\` HP\n\n💡 *Usa una poción con \`!inventario\` o espera a regenerar vida.*`);
    }

    let currentHp = profile.currentHp;
    let totalGoldEarned = 0n;
    let totalExpEarned = 0n;
    const droppedItems = [];

    const totalEnemyAtkAllWaves = dungeon.waves.reduce((sum, w) => sum + w.atk, 0n);
    const isAutoWin = stats.def >= totalEnemyAtkAllWaves && stats.atk >= dungeon.waves[2].hp;

    const combatEmbed = new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle(`🏰 Incursión: ${dungeon.name}`)
      .setDescription(`⚔️ **${message.author.username}** entra a la mazmorra...\n${EMOJIS.hp} HP Inicial: \`${formatNumber(currentHp)} / ${formatNumber(stats.maxHp)}\` • ${EMOJIS.espada} ATK: \`${formatNumber(stats.atk)}\` • ${EMOJIS.escudo} DEF: \`${formatNumber(stats.def)}\``);

    const battleMessage = await message.reply({ embeds: [combatEmbed] });

    if (!isAutoWin) await sleep(1200);

    for (let i = 0; i < dungeon.waves.length; i++) {
      const wave = dungeon.waves[i];
      const waveTitle = wave.type === 'subditos' ? '👥 Oleada 1: Esbirros ' : (wave.type === 'subjefe' ? '⚠️ Oleada 2: Sub-Jefe ' : '☠️ Oleada 3: JEFE FINAL ');

      const playerDmgPerTurn = stats.atk > wave.def ? stats.atk - wave.def : 1n;
      const enemyDmgPerTurn = wave.atk > stats.def ? wave.atk - stats.def : 0n;

      const turnsToKillEnemy = BigInt(Math.ceil(Number(wave.hp) / Number(playerDmgPerTurn)));
      const damageTakenInWave = enemyDmgPerTurn * turnsToKillEnemy;

      currentHp -= damageTakenInWave;

      if (currentHp <= 0n) {
        const potionIdx = profile.inventory.findIndex(item => item.type === 'consumable' && item.effect && item.effect.healHp);
        
        if (potionIdx !== -1) {
          const potion = profile.inventory[potionIdx];
          
          if (currentHp + potion.effect.healHp > 0n) {
            currentHp += potion.effect.healHp;
            
            potion.count -= 1;
            if (potion.count <= 0) profile.inventory.splice(potionIdx, 1);

            combatEmbed.addFields({
              name: `🧪 ¡SALVADO POR POCIÓN!`,
              value: `Consumiste **${potion.name}** (+${potion.effect.healHp} HP) y sobreviviste la oleada.`
            });
          }
        }
      }

      if (currentHp <= 0n) {
        profile.currentHp = 0n;
        profile.lastHpRegen = Date.now();
        
        profile.gold += totalGoldEarned;
        const levelsGained = addExp(profile, totalExpEarned);

        if (profile.activeBuffs && Array.isArray(profile.activeBuffs)) {
          profile.activeBuffs = profile.activeBuffs
            .map(b => ({ ...b, battlesLeft: b.battlesLeft - 1 }))
            .filter(b => b.battlesLeft > 0);
        }

        // 🗄️ GUARDAR ESTADO DE DERROTA EN SQLITE
        saveUserProfile(profile);

        combatEmbed.addFields({
          name: `${waveTitle} -${wave.name}`,
          value: `❌ **Derrotado** • Daño recibido: \`-${formatNumber(damageTakenInWave)}\` • HP Restante: \`0\``
        });

        let lossDescription = `Caíste en combate durante la **${waveTitle}${wave.name}**.\n\n` +
          `🎁 **Recompensa de Consolación:**\n` +
          `${EMOJIS.moneda} **Oro:** \`+${formatNumber(totalGoldEarned)}\` • ${EMOJIS.xp} **EXP:** \`+${formatNumber(totalExpEarned)}\``;

        if (levelsGained > 0) {
          lossDescription += `\n\n🎊 **¡Subiste a Nv. ${profile.level}!** Tienes nuevos puntos para asignar en \`!stats\`.`;
        }

        combatEmbed.setColor('#FF0000')
          .setTitle(`💀 Derrota en ${dungeon.name}`)
          .setDescription(lossDescription);
        
        return battleMessage.edit({ embeds: [combatEmbed] }).catch(() => {});
      }

      totalGoldEarned += wave.gold;
      totalExpEarned += wave.exp;

      if (!isAutoWin) {
        combatEmbed.addFields({
          name: `${waveTitle} -${wave.name}`,
          value: `✅ Derrotado • Daño recibido: \`-${formatNumber(damageTakenInWave)}\` • HP Restante: \`${formatNumber(currentHp)}\``
        });
        await battleMessage.edit({ embeds: [combatEmbed] }).catch(() => {});
        await sleep(1200);
      }
    }

    // Sistema de drops de la mazmorra (incluye huevos)
    for (const drop of dungeon.dropTable) {
      if (Math.random() <= drop.chance) {
        const dropAmount = drop.type === 'material' ? Math.floor(Math.random() * 3) + 1 : 1;
        const dropItem = { ...drop, count: dropAmount };
        droppedItems.push(dropItem);
        addItemToInventory(profile, dropItem);
      }
    }

    if (profile.activeBuffs && Array.isArray(profile.activeBuffs)) {
      profile.activeBuffs = profile.activeBuffs
        .map(b => ({ ...b, battlesLeft: b.battlesLeft - 1 }))
        .filter(b => b.battlesLeft > 0);
    }

    profile.gold += totalGoldEarned;
    const levelsGained = addExp(profile, totalExpEarned);

    profile.currentHp = currentHp;
    profile.lastHpRegen = Date.now();

    // 🗄️ GUARDAR ESTADO DE VICTORIA Y RECOMPENSAS EN SQLITE
    saveUserProfile(profile);

    let dropsSummary = droppedItems.length > 0 
      ? droppedItems.map(d => `• ${d.name}${d.count > 1 ? ` x${d.count}` : ''}`).join('\n') 
      : '*No se obtuvieron objetos esta vez.*';

    combatEmbed.setColor('#2ECC71')
      .setTitle(`🎉 ¡MAZMORRA COMPLETADA! - ${dungeon.name}`)
      .setDescription(isAutoWin ? `⚡ **¡VICTORIA INSTANTÁNEA!** Tus stats superan la mazmorra.` : `¡Has derrotado a las 3 oleadas!`)
      .setFields(
        { name: `${EMOJIS.moneda} Oro Ganado`, value: `\`+${formatNumber(totalGoldEarned)}\``, inline: true },
        { name: `${EMOJIS.xp} EXP Ganada`, value: `\`+${formatNumber(totalExpEarned)}\``, inline: true },
        { name: `${EMOJIS.hp} HP Restante`, value: `\`${formatNumber(currentHp)} / ${formatNumber(stats.maxHp)}\``, inline: true },
        { name: `${EMOJIS.botin} Botín y Materiales`, value: dropsSummary, inline: false }
      );

    if (levelsGained > 0) {
      combatEmbed.setFooter({ text: `🎊 ¡Subiste ${levelsGained} nivel(es)! Asigna tus puntos con !stats.` });
    }

    await battleMessage.edit({ embeds: [combatEmbed] }).catch(() => {});
  }
};