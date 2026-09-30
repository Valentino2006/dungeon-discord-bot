const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { getUserProfile, saveUserProfile, addItemToInventory, formatNumber } = require('../utils/game');

// 📜 RECETAS DE CRAFTEO
const CRAFT_RECIPES = [
  {
    id: 'pocion_milagrosa',
    name: '🧪 Poción Milagrosa (Poción Cheta)',
    btnLabel: '[1] Poción Milagrosa',
    result: {
      id: 'pocion_milagrosa',
      name: '🧪 Poción Milagrosa',
      type: 'consumable',
      effect: { healHp: 2000n },
      count: 1
    },
    reqs: [
      { id: 'mat_tela', name: '🧵 Tela Común', count: 5 },
      { id: 'mat_hueso', name: '🦴 Hueso Encantado', count: 3 },
      { id: 'mat_fuego', name: '🔥 Esencia de Fuego', count: 2 }
    ],
    description: 'Poción potente que cura **+2,000 de HP** al instante o salva tu vida en combate.'
  },
  {
    id: 'elixir_divino',
    name: '🍷 Elíxir Divino (Buff Cheto)',
    btnLabel: '[2] Elíxir Divino',
    result: {
      id: 'elixir_divino',
      name: '🍷 Elíxir Divino',
      type: 'consumable',
      effect: { buffStat: 'atk', amount: 100n, duration: 8 },
      count: 1
    },
    reqs: [
      { id: 'mat_fuego', name: '🔥 Esencia de Fuego', count: 3 },
      { id: 'mat_escama', name: '🐉 Escama Dracónica', count: 2 },
      { id: 'mat_nucleo', name: '🔮 Núcleo de Dragón', count: 1 }
    ],
    description: 'Otorga **+100 de ATK** extra durante **8 batallas** de mazmorra.'
  },
  {
    id: 'coraza_refuerzo',
    name: '🛡️ Coraza Fortificada',
    btnLabel: '[3] Coraza Fortificada',
    result: {
      id: 'coraza_refuerzo',
      name: '🛡️ Coraza Fortificada',
      type: 'armor',
      def: 30n,
      hp: 120n,
      rarity: 'Rara'
    },
    reqs: [
      { id: 'mat_cobre', name: '🟤 Lingote de Cobre', count: 10 },
      { id: 'mat_hierro', name: '⚪ Lingote de Hierro', count: 5 }
    ],
    description: 'Armadura pesada hecha a mano (**+30 DEF** | **+120 HP Máximo**).'
  },
  {
    id: 'hoja_elemental',
    name: '⚔️ Hoja de Mithril y Fuego',
    btnLabel: '[4] Hoja de Mithril',
    result: {
      id: 'hoja_elemental',
      name: '⚔️ Hoja de Mithril y Fuego',
      type: 'weapon',
      atk: 110n,
      rarity: 'Épica'
    },
    reqs: [
      { id: 'mat_mithril', name: '🔷 Lingote de Mithril', count: 8 },
      { id: 'mat_fuego', name: '🔥 Esencia de Fuego', count: 4 }
    ],
    description: 'Arma imbuida con fuego mágico (**+110 ATK**).'
  },
  {
    id: 'armadura_dragón',
    name: '🛡️ Armadura del Dragón Ancestral',
    btnLabel: '[5] Armadura Dragón',
    result: {
      id: 'armadura_dragón',
      name: '🛡️ Armadura del Dragón Ancestral',
      type: 'armor',
      def: 120n,
      hp: 600n,
      rarity: 'Legendaria'
    },
    reqs: [
      { id: 'mat_escama', name: '🐉 Escama Dracónica', count: 10 },
      { id: 'mat_nucleo', name: '🔮 Núcleo de Dragón', count: 3 },
      { id: 'mat_mithril', name: '🔷 Lingote de Mithril', count: 5 }
    ],
    description: 'Peto forjado con escamas de dragón (**+120 DEF** | **+600 HP Máximo**).'
  },
  {
    id: 'filo_divino_caos',
    name: '⚔️ Filo Divino del Abismo (Mítica)',
    btnLabel: '[6] Filo Divino',
    result: {
      id: 'filo_divino_caos',
      name: '⚔️ Filo Divino del Abismo',
      type: 'weapon',
      atk: 500n,
      rarity: 'Mítica'
    },
    reqs: [
      { id: 'mat_abisal', name: '🌌 Esencia Abisal', count: 5 },
      { id: 'mat_orichalcum', name: '✨ Orichalcum Puro', count: 5 },
      { id: 'mat_nucleo', name: '🔮 Núcleo de Dragón', count: 3 }
    ],
    description: 'Arma suprema de poder inconmensurable (**+500 ATK**).'
  }
];

// Helper: Obtener cantidad de un material en el inventario
function getMatCount(profile, matId) {
  if (!profile.inventory) return 0;
  const found = profile.inventory.find(item => item.id === matId);
  return found ? found.count || 1 : 0;
}

// Helper: Consumir materiales
function consumeMaterials(profile, reqs) {
  for (const req of reqs) {
    const itemIndex = profile.inventory.findIndex(item => item.id === req.id);
    if (itemIndex !== -1) {
      profile.inventory[itemIndex].count -= req.count;
      if (profile.inventory[itemIndex].count <= 0) {
        profile.inventory.splice(itemIndex, 1);
      }
    }
  }
}

module.exports = {
  name: 'craft',
  aliases: ['crafteo', 'craftear', 'recetas', 'crear'],

  async execute(message, args) {
    const profile = getUserProfile(message.author.id);

    // 🎨 EMBED DE RECETAS
    const createCraftEmbed = (prof) => {
      let recipeText = CRAFT_RECIPES.map((r, idx) => {
        let reqsFormatted = r.reqs.map(req => {
          const owned = getMatCount(prof, req.id);
          const hasEnough = owned >= req.count;
          const statusIcon = hasEnough ? '✅' : '❌';
          return `${statusIcon}${req.name}: \`${owned} / ${req.count}\``;
        }).join('\n└ ');

        return `**[${idx + 1}]${r.name}**\n└ ${r.description}\n└ **Materiales Requeridos:**\n└ ${reqsFormatted}`;
      }).join('\n\n');

      return new EmbedBuilder()
        .setColor('#8E44AD')
        .setTitle(`🔨 Forja y Mesa de Crafteo - ${message.author.username}`)
        .setDescription(`Obtén materiales completando **!mazmorra** y fabrica objetos legendarios.\n\n${recipeText}`)
        .setFooter({ text: 'Haz clic en los botones para craftear el objeto deseado.' });
    };

    // 🎛️ BOTONES DE CRAFTEO (2 Filas de 3 botones)
    const createCraftRows = () => {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('craft_0').setLabel(CRAFT_RECIPES[0].btnLabel).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('craft_1').setLabel(CRAFT_RECIPES[1].btnLabel).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('craft_2').setLabel(CRAFT_RECIPES[2].btnLabel).setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('craft_3').setLabel(CRAFT_RECIPES[3].btnLabel).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('craft_4').setLabel(CRAFT_RECIPES[4].btnLabel).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('craft_5').setLabel(CRAFT_RECIPES[5].btnLabel).setStyle(ButtonStyle.Success)
      );

      return [row1, row2];
    };

    const replyMsg = await message.reply({
      embeds: [createCraftEmbed(profile)],
      components: createCraftRows()
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000 // 90 segundos activo
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ 
          content: '❌ No puedes usar la mesa de forja de otro jugador.', 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});
      }

      try {
        const recipeIdx = parseInt(interaction.customId.replace('craft_', ''));
        const recipe = CRAFT_RECIPES[recipeIdx];
        const currentProfile = getUserProfile(interaction.user.id);

        // Verificar si cuenta con todos los materiales necesarios
        const missing = [];
        for (const req of recipe.reqs) {
          const owned = getMatCount(currentProfile, req.id);
          if (owned < req.count) {
            missing.push(`${req.name} (Tienes \`${owned}/${req.count}\`)`);
          }
        }

        if (missing.length > 0) {
          return interaction.reply({ 
            content: `❌ **Te faltan materiales para craftear ${recipe.name}:**\n• ${missing.join('\n• ')}`, 
            flags: MessageFlags.Ephemeral 
          }).catch(() => {});
        }

        // Descontar insumos y entregar el objeto crafteado
        consumeMaterials(currentProfile, recipe.reqs);
        addItemToInventory(currentProfile, recipe.result);

        // 🗄️ GUARDAR CAMBIOS EN SQLITE
        saveUserProfile(currentProfile);

        // Actualizar la interfaz
        await interaction.update({
          embeds: [createCraftEmbed(currentProfile)],
          components: createCraftRows()
        });

        await interaction.followUp({ 
          content: `🔨 **¡CRAFTEO EXITOSO!** Has fabricado **1x ${recipe.result.name}**. ¡Revisa tu \`!inventario\`!`, 
          flags: MessageFlags.Ephemeral 
        }).catch(() => {});

      } catch (error) {
        if (error.code !== 10062) {
          console.error(error);
        }
      }
    });

    collector.on('end', async () => {
      await replyMsg.edit({ components: [] }).catch(() => {});
    });
  }
};