const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserProfile, saveUserProfile, getRequiredExp, formatNumber, getCurrentHp, getEffectiveStats } = require('../utils/game');
const EMOJIS = require('../data/emojis');

// ⚙️ VALORES EXACTOS POR CADA 1 PUNTO INVERTIDO
const HP_PER_POINT = 10n;  // 1 Punto = +10 HP
const ATK_PER_POINT = 2n;  // 1 Punto = +2 ATK
const DEF_PER_POINT = 1n;  // 1 Punto = +1 DEF

function createStatsEmbedAndButtons(profile, userTag) {
  const reqExp = getRequiredExp(profile.level);

  // Obtener HP y estadísticas efectivas usando la lógica de game.js
  const { hp, maxHp } = getCurrentHp(profile);
  const effectiveStats = getEffectiveStats(profile);

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`👤 Perfil y Estadísticas - ${userTag}`)
    .addFields(
      { name: `${EMOJIS.level ?? '⭐'} Nivel`, value: `\`Nv. ${profile.level}\``, inline: true },
      { name: `${EMOJIS.prestigio ?? '🔮'} Prestigio`, value: `\`P. ${profile.prestige}\``, inline: true },
      { name: `${EMOJIS.xp ?? '✨'} Experiencia`, value: `\`${formatNumber(profile.exp)} / ${formatNumber(reqExp)}\``, inline: true },
      { name: `${EMOJIS.hp ?? '❤️'} Vida (HP)`, value: `\`${formatNumber(hp)} / ${formatNumber(maxHp)}\``, inline: true },
      { name: `${EMOJIS.espada ?? '⚔️'} Ataque (ATK)`, value: `\`${formatNumber(effectiveStats.atk)}\``, inline: true },
      { name: `${EMOJIS.escudo ?? '🛡️'} Defensa (DEF)`, value: `\`${formatNumber(effectiveStats.def)}\``, inline: true },
      { name: `${EMOJIS.puntos ?? '📊'} Puntos Disponibles`, value: `\`${profile.statPoints} Puntos\``, inline: false }
    )
    .setFooter({ text: 'Usa los botones para subir tus atributos.' });

  const hasPoints = profile.statPoints > 0;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('add_atk')
      .setLabel(`+${ATK_PER_POINT} ATK`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasPoints),
    new ButtonBuilder()
      .setCustomId('add_def')
      .setLabel(`+${DEF_PER_POINT} DEF`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!hasPoints),
    new ButtonBuilder()
      .setCustomId('add_hp')
      .setLabel(`+${HP_PER_POINT} HP`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasPoints)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  name: 'stats',
  aliases: ['perfil', 'p'],

  async execute(message) {
    const profile = getUserProfile(message.author.id);
    const uiData = createStatsEmbedAndButtons(profile, message.author.username);
    await message.reply(uiData);
  },

  async handleButton(interaction) {
    if (interaction.replied || interaction.deferred) return;

    const profile = getUserProfile(interaction.user.id);

    if (profile.statPoints <= 0) {
      return interaction.reply({
        content: '❌ No tienes puntos de atributo disponibles.',
        ephemeral: true
      }).catch(() => {});
    }

    // 1. Obtener la salud actual calculando la regeneración pasiva previa
    const { hp: currentHp } = getCurrentHp(profile);

    // 2. Incrementar atributo e ir descontando puntos
    if (interaction.customId === 'add_atk') {
      profile.stats.atk += ATK_PER_POINT;
      profile.statPoints -= 1;
    } else if (interaction.customId === 'add_def') {
      profile.stats.def += DEF_PER_POINT;
      profile.statPoints -= 1;
    } else if (interaction.customId === 'add_hp') {
      profile.stats.maxHp += HP_PER_POINT;
      profile.statPoints -= 1;
    }

    // 3. Mantener la salud actual utilizando las propiedades oficiales "currentHp" y "lastHpRegen"
    const effective = getEffectiveStats(profile);
    profile.currentHp = currentHp > effective.maxHp ? effective.maxHp : currentHp;
    profile.lastHpRegen = Date.now();

    // 🗄️ GUARDAR CAMBIOS EN SQLITE
    saveUserProfile(profile);

    const uiData = createStatsEmbedAndButtons(profile, interaction.user.username);
    await interaction.update(uiData).catch(() => {});
  }
};