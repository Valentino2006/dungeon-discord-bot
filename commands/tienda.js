const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { getUserProfile, saveUserProfile, addItemToInventory, formatNumber } = require('../utils/game');
const EMOJIS = require('../data/emojis');
const userLocks = new Set();

const SHOP_ITEMS = [
  {
    id: 'pocion_hp_chica',
    name: `${EMOJIS.pocion_chica} Poción de HP Chica`,
    btnLabel: '[1] HP Chica (100g)',
    description: 'Restaura +50 de HP inmediatamente o salvavidas en combate.',
    type: 'consumable',
    price: 100n,
    effect: { healHp: 50n }
  },
  {
    id: 'pocion_hp_media',
    name: `${EMOJIS.pocion_mediana} Poción de HP Mediana`,
    btnLabel: '[2] HP Mediana (400g)',
    description: 'Restaura +150 de HP inmediatamente o salvavidas en combate.',
    type: 'consumable',
    price: 400n,
    effect: { healHp: 150n }
  },
  {
    id: 'pocion_hp_grande',
    name: `${EMOJIS.pocion_grande} Poción de HP Grande`,
    btnLabel: '[3] HP Grande (1.50K g)',
    description: 'Restaura +350 de HP inmediatamente o salvavidas en combate.',
    type: 'consumable',
    price: 1500n,
    effect: { healHp: 350n }
  },
  {
    id: 'pocion_suprema',
    name: '🧪 Poción Suprema',
    btnLabel: '[4] HP Suprema (5.00K g)',
    description: 'Restaura +1,000 de HP inmediatamente o salvavidas en combate.',
    type: 'consumable',
    price: 5000n,
    effect: { healHp: 1000n }
  },
  {
    id: 'elixir_fuerza',
    name: '🍷 Elíxir de Fuerza',
    btnLabel: '[5] Fuerza (800g)',
    description: 'Otorga +15 de ATK extra durante 3 batallas de mazmorra.',
    type: 'consumable',
    price: 800n,
    effect: { buffStat: 'atk', amount: 15n, duration: 3 }
  },
  {
    id: 'elixir_escudo',
    name: '🛡️ Elíxir de Escudo',
    btnLabel: '[6] Escudo (800g)',
    description: 'Otorga +10 de DEF extra durante 3 batallas de mazmorra.',
    type: 'consumable',
    price: 800n,
    effect: { buffStat: 'def', amount: 10n, duration: 3 }
  },
  {
    id: 'elixir_vitalidad',
    name: '💚 Elíxir de Vitalidad',
    btnLabel: '[7] Vitalidad (2.00K g)',
    description: 'Otorga +100 de HP Máximo extra durante 3 batallas.',
    type: 'consumable',
    price: 2000n,
    effect: { buffStat: 'hp', amount: 100n, duration: 3 }
  },
  {
    id: 'elixir_furia',
    name: '🍷 Elíxir de Furia',
    btnLabel: '[8] Furia (3.00K g)',
    description: 'Otorga +50 de ATK extra durante 5 batallas de mazmorra.',
    type: 'consumable',
    price: 3000n,
    effect: { buffStat: 'atk', amount: 50n, duration: 5 }
  }
];

module.exports = {
  name: 'tienda',
  aliases: ['shop', 'comprar', 'buy'],

  async execute(message, args) {
    const profile = getUserProfile(message.author.id);

    let isBuyingText = false;
    let itemArg = null;
    let quantityArg = 1;

    if (args[0] === 'comprar' || args[0] === 'buy') {
      isBuyingText = true;
      itemArg = args[1];
      if (args[2]) quantityArg = parseInt(args[2]);
    } else if (message.content.toLowerCase().startsWith('!comprar') || message.content.toLowerCase().startsWith('!buy')) {
      isBuyingText = true;
      itemArg = args[0];
      if (args[1]) quantityArg = parseInt(args[1]);
    }

    if (isBuyingText) {
      const itemIndex = parseInt(itemArg) - 1;

      if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= SHOP_ITEMS.length) {
        return message.reply('❌ Número de objeto no válido. Revisa el catálogo con `!tienda`.');
      }

      const quantity = isNaN(quantityArg) || quantityArg < 1 ? 1 : quantityArg;
      const quantityBig = BigInt(quantity);

      const shopItem = SHOP_ITEMS[itemIndex];
      const totalCost = shopItem.price * quantityBig;

      if (profile.gold < totalCost) {
        return message.reply(`❌ No tienes suficiente oro. Necesitas **${formatNumber(totalCost)} Oro** (Tienes \`${formatNumber(profile.gold)} Oro\`).`);
      }

      profile.gold -= totalCost;

      addItemToInventory(profile, {
        id: shopItem.id,
        name: shopItem.name,
        type: shopItem.type,
        effect: shopItem.effect,
        count: quantity
      });

      // 🗄️ GUARDAR CAMBIOS EN SQLITE
      saveUserProfile(profile);

      const embedSuccess = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🛒 ¡Compra Exitosa!')
        .setDescription(`Has adquirido **${quantity}x${shopItem.name}** por **${EMOJIS.moneda}${formatNumber(totalCost)} Oro**.`)
        .addFields(
          { name: `${EMOJIS.moneda} Oro Restante`, value: `\`${formatNumber(profile.gold)} Oro\``, inline: true },
          { name: `${EMOJIS.xp} Inventario`, value: 'Usa `!inventario` para ver o consumir tus objetos.', inline: false }
        );

      return message.reply({ embeds: [embedSuccess] });
    }

    const createShopEmbed = (prof) => {
      let catalogText = SHOP_ITEMS.map((item, idx) => {
        return `**[${idx + 1}] ${item.name}** — ${EMOJIS.moneda} **${formatNumber(item.price)} Oro**\n└ *${item.description}*`;
      }).join('\n\n');

      return new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🏪 Tienda de Suministros del Aventurero')
        .setDescription(`${EMOJIS.moneda} Tu Oro en Bolsillo: **${formatNumber(prof.gold)} Oro**\n\n${catalogText}`)
        .setFooter({ text: 'Haz clic en los botones o usa: !tienda comprar <número> [cantidad]' });
    };

    const createShopRows = () => {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buy_0').setLabel(SHOP_ITEMS[0].btnLabel).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('buy_1').setLabel(SHOP_ITEMS[1].btnLabel).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('buy_2').setLabel(SHOP_ITEMS[2].btnLabel).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('buy_3').setLabel(SHOP_ITEMS[3].btnLabel).setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buy_4').setLabel(SHOP_ITEMS[4].btnLabel).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('buy_5').setLabel(SHOP_ITEMS[5].btnLabel).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('buy_6').setLabel(SHOP_ITEMS[6].btnLabel).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('buy_7').setLabel(SHOP_ITEMS[7].btnLabel).setStyle(ButtonStyle.Success)
      );

      return [row1, row2];
    };

    const replyMsg = await message.reply({
      embeds: [createShopEmbed(profile)],
      components: createShopRows()
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ 
          content: '❌ No puedes interactuar con el menú de otra persona.', 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});
      }

      if (userLocks.has(interaction.user.id)) {
        return interaction.reply({ 
          content: '⏳ Tu compra anterior se está procesando. Espera un segundo antes de volver a presionar.', 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});
      }

      userLocks.add(interaction.user.id);

      try {
        try {
          await interaction.deferUpdate();
        } catch {
          return;
        }

        const itemIdx = parseInt(interaction.customId.replace('buy_', ''));
        const shopItem = SHOP_ITEMS[itemIdx];
        const currentProfile = getUserProfile(interaction.user.id);

        if (currentProfile.gold < shopItem.price) {
          await interaction.followUp({ 
            content: `❌ Te falta oro para comprar **${shopItem.name}**. Necesitas **${formatNumber(shopItem.price)} Oro**.`, 
            flags: MessageFlags.Ephemeral 
          }).catch(() => {});
          return;
        }

        currentProfile.gold -= shopItem.price;

        addItemToInventory(currentProfile, {
          id: shopItem.id,
          name: shopItem.name,
          type: shopItem.type,
          effect: shopItem.effect,
          count: 1
        });

        // 🗄️ GUARDAR CAMBIOS EN SQLITE
        saveUserProfile(currentProfile);

        await interaction.editReply({
          embeds: [createShopEmbed(currentProfile)],
          components: createShopRows()
        });

        await interaction.followUp({ 
          content: `✅ Compraste 1x **${shopItem.name}** por **💰 ${formatNumber(shopItem.price)} Oro**.`, 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});
      } catch (error) {
        if (![10062, 40060].includes(error.code)) {
          console.error('Error al procesar compra:', error);
        }
      } finally {
        userLocks.delete(interaction.user.id);
      }
    });

    collector.on('end', async () => {
      await replyMsg.edit({ components: [] }).catch(() => {});
    });
  }
};