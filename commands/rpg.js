const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { getUserProfile, saveUserProfile, getNextMineCost, getPendingPassiveIncome, claimPassiveIncome, formatNumber } = require('../utils/game');

const BASE_PRODUCTION_PER_MINE = 10n;
const rpgUserLocks = new Set();

module.exports = {
  name: 'rpg',
  aliases: ['minas', 'mina', 'minar'],

  async execute(message, args) {
    const profile = getUserProfile(message.author.id);

    const createRpgEmbed = (prof) => {
      const { pendingGold, pendingExp } = getPendingPassiveIncome(prof);
      const cost = getNextMineCost(prof.generators.mines);
      const prestigeBonus = 1 + (prof.prestige * 0.5);
      const goldPerSec = BigInt(Math.floor(Number(prof.generators.mines * BASE_PRODUCTION_PER_MINE) * prestigeBonus));
      const expPerMin = prof.generators.mines * 12n;

      return new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle(`⛏️ Centro de Minería Pasiva - ${message.author.username}`)
        .addFields(
          { name: '🏭 Minas Activas', value: `\`${prof.generators.mines} Minas\``, inline: true },
          { name: '⚡ Tasa de Producción', value: `\`+${formatNumber(goldPerSec)} Oro/s\` | \`+${expPerMin} EXP/min\``, inline: true },
          { name: '📦 Bóveda (Pendiente por Recolectar)', value: `💰 **+${formatNumber(pendingGold)} Oro**\n⭐ **+${formatNumber(pendingExp)} EXP**`, inline: false },
          { name: '🎒 Monedero (Oro Disponible en Bolsillo)', value: `\`${formatNumber(prof.gold)} Oro\``, inline: true },
          { name: '📈 Costo Próxima Mina', value: `\`${formatNumber(cost)} Oro\``, inline: true }
        )
        .setDescription('💡 *El oro de la **Bóveda** se acumula de forma pasiva. Presiona **[💰 Recolectar]** para pasarlo a tu **Monedero**.*');
    };

    const createRpgRow = (prof) => {
      const { pendingGold } = getPendingPassiveIncome(prof);
      const cost = getNextMineCost(prof.generators.mines);
      const canBuy = prof.gold >= cost;
      const hasRewards = pendingGold > 0n;

      const collectLabel = hasRewards ? `Recolectar (+${formatNumber(pendingGold)} Oro)` : 'Bóveda Vacía';

      const collectButton = new ButtonBuilder()
        .setCustomId('collect_vault')
        .setLabel(collectLabel)
        .setStyle(hasRewards ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji('💰');

      const refreshButton = new ButtonBuilder()
        .setCustomId('refresh_vault')
        .setLabel('Actualizar')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄');

      const buyButton = new ButtonBuilder()
        .setCustomId('buy_mine')
        .setLabel(`Comprar Mina (${formatNumber(cost)} Oro)`)
        .setStyle(canBuy ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji('⛏️');

      return new ActionRowBuilder().addComponents(collectButton, refreshButton, buyButton);
    };

    const replyMsg = await message.reply({
      embeds: [createRpgEmbed(profile)],
      components: [createRpgRow(profile)]
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ 
          content: '❌ Solo el dueño del panel puede presionar estos botones.', 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});
      }

      if (rpgUserLocks.has(interaction.user.id)) {
        return interaction.reply({ 
          content: '⏳ Tu acción anterior se está procesando. Espera un momento por favor.', 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});
      }

      rpgUserLocks.add(interaction.user.id);

      try {
        try {
          await interaction.deferUpdate();
        } catch {
          return;
        }

        const currentProfile = getUserProfile(interaction.user.id);

        if (interaction.customId === 'collect_vault') {
          const { claimedGold, claimedExp, levelsGained } = claimPassiveIncome(currentProfile);

          // 🗄️ GUARDAR CAMBIOS EN SQLITE
          saveUserProfile(currentProfile);

          await interaction.editReply({
            embeds: [createRpgEmbed(currentProfile)],
            components: [createRpgRow(currentProfile)]
          });

          if (claimedGold === 0n) {
            await interaction.followUp({ 
              content: '⌛ La bóveda ya fue recolectada o está vacía. Espera a que tus minas generen más oro.', 
              flags: MessageFlags.Ephemeral 
            }).catch(() => {});
          } else {
            let msg = `💰 **¡Recolectaste +${formatNumber(claimedGold)} Oro** y **+${formatNumber(claimedExp)} EXP** de la mina!`;
            if (levelsGained > 0) {
              msg += `\n🎊 **¡Subiste ${levelsGained} nivel(es)!** Tienes nuevos puntos en \`!stats\`.`;
            }

            await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
          }
        }
        else if (interaction.customId === 'refresh_vault') {
          await interaction.editReply({
            embeds: [createRpgEmbed(currentProfile)],
            components: [createRpgRow(currentProfile)]
          });
        }
        else if (interaction.customId === 'buy_mine') {
          const cost = getNextMineCost(currentProfile.generators.mines);

          if (currentProfile.gold < cost) {
            await interaction.followUp({ 
              content: `❌ No tienes suficiente oro en tu monedero. Necesitas **${formatNumber(cost)} Oro**.`, 
              flags: MessageFlags.Ephemeral 
            }).catch(() => {});
            return;
          }

          currentProfile.gold -= cost;
          currentProfile.generators.mines += 1n;

          // 🗄️ GUARDAR CAMBIOS EN SQLITE
          saveUserProfile(currentProfile);

          await interaction.editReply({
            embeds: [createRpgEmbed(currentProfile)],
            components: [createRpgRow(currentProfile)]
          });

          await interaction.followUp({ 
            content: `⛏️ ¡Mina comprada con éxito! Ahora tienes **${currentProfile.generators.mines} Minas** en producción.`, 
            flags: MessageFlags.Ephemeral 
          }).catch(() => {});
        }
      } catch (error) {
        if (![10062, 40060].includes(error.code)) {
          console.error('Error en RPG:', error);
        }
      } finally {
        rpgUserLocks.delete(interaction.user.id);
      }
    });

    collector.on('end', async () => {
      await replyMsg.edit({ components: [] }).catch(() => {});
    });
  }
};