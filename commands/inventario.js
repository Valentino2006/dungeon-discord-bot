const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const { getUserProfile, saveUserProfile, formatNumber, getEffectiveStats, getCurrentHp } = require('../utils/game');
const EMOJIS = require('../data/emojis');

const invUserLocks = new Set();

// --- HELPER PARA DETECTAR Y FORMATAR EMOJIS CORRECTAMENTE ---
const resolveEmoji = (item) => {
  let raw = item.emoji;

  // Si el ítem no trae emoji adjunto, buscarlo en EMOJIS según su ID
  if (!raw && item.id) {
    const EMOJI_MAP = {
      'pocion_hp_chica': EMOJIS.pocion_chica,
      'pocion_hp_media': EMOJIS.pocion_mediana,
      'pocion_hp_grande': EMOJIS.pocion_grande,
      'pocion_suprema': '🧪',
      'elixir_fuerza': '🍷',
      'elixir_escudo': EMOJIS.escudo ?? '🛡',
      'elixir_vitalidad': '💚',
      'elixir_furia': '🍷',
      'espada_hierro': EMOJIS.espada_hierro,
      'armadura_cuero': EMOJIS.armadura_cuero,
      'lingote_cobre': EMOJIS.lingote_cobre,
      'tela_comun': EMOJIS.tela_comun,
      'huevo_bosque': EMOJIS.huevo_bosque
    };
    raw = EMOJI_MAP[item.id] ?? EMOJIS[item.id];
  }

  // Si viene en el nombre
  if (!raw && item.name) {
    const matchName = item.name.match(/<(a)?:([\w_]+):(\d+)>/);
    if (matchName) raw = matchName[0];
  }

  // Fallbacks predeterminados si no se encuentra ninguno
  if (!raw) {
    if (item.type === 'weapon' ? true : (item.atk !== undefined)) raw = EMOJIS.espada ?? '⚔️';
    else if (item.type === 'armor' ? true : (item.def !== undefined)) raw = EMOJIS.escudo ?? '🛡️';
    else if (item.type === 'consumable' ? true : Boolean(item.effect)) raw = '🧪';
    else raw = '🧱';
  }

  // Si es un emoji personalizado de Discord (<:nombre:ID>)
  const match = typeof raw === 'string' ? raw.match(/<(a)?:([\w_]+):(\d+)>/) : null;
  if (match) {
    const [fullTag, animated, name, id] = match;
    return {
      embedTag: fullTag,
      selectMenuEmoji: { id, name, animated: Boolean(animated) },
      buttonEmoji: id
    };
  }

  // Si es un emoji unicode estándar
  return {
    embedTag: raw,
    selectMenuEmoji: raw,
    buttonEmoji: raw
  };
};

// Helper para limpiar el nombre de cualquier residuo de código de emoji
const cleanItemName = (name) => {
  if (!name) return 'Objeto';
  return name
    .replace(/<a?:[\w_]+:\d+>/g, '')
    .replace(/^[^\w\s\u00C0-\u024F]+/g, '')
    .trim();
};

module.exports = {
  name: 'inventario',
  aliases: ['inv', 'mochila', 'items'],

  async execute(message, args) {
    const profile = getUserProfile(message.author.id);

    // --- CLASIFICAR OBJETOS ---
    const getCategorizedItems = (prof) => {
      const rawInv = prof.inventory ?? [];
      const extraMaterials = prof.materials ?? prof.craftingMaterials ?? [];

      const equipment = [];
      const consumables = [];
      const materials = [...extraMaterials];

      for (const item of rawInv) {
        const isEquip = (item.type === 'weapon') ? true : ((item.type === 'armor') ? true : ((item.atk !== undefined) ? true : (item.def !== undefined)));
        const isConsumable = (item.type === 'consumable') ? true : Boolean(item.effect);

        if (isEquip) {
          equipment.push(item);
        } else if (isConsumable) {
          consumables.push(item);
        } else {
          materials.push(item);
        }
      }

      return { equipment, consumables, materials };
    };

    // --- ESTADÍSTICAS Y HP ---
    const getSafeProfileStats = (prof) => {
      const eff = (typeof getEffectiveStats === 'function') ? getEffectiveStats(prof) : {};
      
      const { hp, maxHp } = (typeof getCurrentHp === 'function') 
        ? getCurrentHp(prof) 
        : { 
            hp: prof.currentHp !== undefined ? BigInt(prof.currentHp) : 100n, 
            maxHp: eff.maxHp ?? 100n 
          };

      const atk = eff.atk !== undefined ? BigInt(eff.atk) : 10n;
      const def = eff.def !== undefined ? BigInt(eff.def) : 5n;

      let regenText = '';
      let timeRemainingStr = '';
      if (hp < maxHp) {
        const missingHp = Number(maxHp - hp);
        const secondsNeeded = missingHp * 3;
        const mins = Math.floor(secondsNeeded / 60);
        const secs = secondsNeeded % 60;
        
        timeRemainingStr = `~${mins > 0 ? `${mins}m` : ''}${secs}s`;
        regenText = ` *(Llega al máx en ${timeRemainingStr})*`;
      }

      return { hp, maxHp, atk, def, regenText, timeRemainingStr };
    };

    // --- EMBED DEL INVENTARIO ---
    const createInventoryEmbed = (prof, previewMessage = null) => {
      const stats = getSafeProfileStats(prof);
      const { equipment, consumables, materials } = getCategorizedItems(prof);

      const weaponText = prof.equipment?.weapon?.name 
        ? `${prof.equipment.weapon.name} (${EMOJIS.espada ?? '⚔️'} +${formatNumber(prof.equipment.weapon.atk ?? 0)})`
        : '*Ninguna equipada*';

      const armorText = prof.equipment?.armor?.name 
        ? `${prof.equipment.armor.name} (${EMOJIS.escudo ?? '🛡️'} +${formatNumber(prof.equipment.armor.def ?? 0)} • ❤️ +${formatNumber(prof.equipment.armor.hp ?? 0)})` 
        : '*Ninguna equipada*';

      let buffsText = '*Sin efectos activos.*';
      if (prof.activeBuffs && prof.activeBuffs.length > 0) {
        buffsText = prof.activeBuffs.map(b => `• ${b.name} (${b.battlesLeft} batallas restantes)`).join('\n');
      }

      let gearList = '*Sin piezas de equipamiento guardadas.*';
      if (equipment.length > 0) {
        gearList = equipment.map((item, idx) => {
          const emojiData = resolveEmoji(item);
          const name = cleanItemName(item.name);
          const statText = item.atk ? `${EMOJIS.espada ?? '⚔️'} +${formatNumber(item.atk)}` : `${EMOJIS.escudo ?? '🛡️'} +${formatNumber(item.def ?? 0)}`;
          return `**[E${idx + 1}]** ${emojiData.embedTag} **${name}** (${statText}) x${item.count ?? 1}`;
        }).join('\n');
      }

      let itemsList = '*Sin objetos consumibles.*';
      if (consumables.length > 0) {
        itemsList = consumables.map((item, idx) => {
          const emojiData = resolveEmoji(item);
          const name = cleanItemName(item.name);
          return `**[C${idx + 1}]** ${emojiData.embedTag} **${name}** x${item.count}`;
        }).join('\n');
      }

      let materialsText = '*Sin materiales. Completa mazmorras para obtener insumos.*';
      if (materials.length > 0) {
        materialsText = materials.map(m => {
          const emojiData = resolveEmoji(m);
          const name = cleanItemName(m.name);
          return `${emojiData.embedTag} **${name}** x${m.count}`;
        }).join('\n');
      }

      const embed = new EmbedBuilder()
        .setColor('#8E44AD')
        .setTitle(`🎒 Inventario y Forja - ${message.author.username}`)
        .addFields(
          { name: `${EMOJIS.espada ?? '⚔️'} Arma Equipada`, value: weaponText, inline: true },
          { name: `${EMOJIS.escudo ?? '🛡️'} Armadura Equipada`, value: armorText, inline: true },
          { name: '🧪 Potenciadores Activos', value: buffsText, inline: false },
          { 
            name: '📊 Atributos Totales (Con Equipo y Buffs)', 
            value: `❤️ **HP:** ${formatNumber(stats.hp)} / ${formatNumber(stats.maxHp)}${stats.regenText}\n${EMOJIS.espada ?? '⚔️'} **ATK:** ${formatNumber(stats.atk)} • ${EMOJIS.escudo ?? '🛡️'} **DEF:** ${formatNumber(stats.def)}`, 
            inline: false 
          },
          { name: '🛡️ Equipamiento en Bolsa', value: gearList, inline: false },
          { name: '📦 Consumibles en Bolsa', value: itemsList, inline: false },
          { name: '🧱 Materiales de Crafteo', value: materialsText, inline: false }
        )
        .setFooter({ text: 'Usa el menú desplegable para equipar o usar tus objetos.' });

      if (previewMessage) {
        embed.addFields({ name: '⚠️ Acción Seleccionada', value: previewMessage, inline: false });
      }

      return embed;
    };

    // --- COMPONENTES ---
    const createInventoryComponents = (prof, selectedKey = null) => {
      const { equipment, consumables } = getCategorizedItems(prof);
      const rows = [];
      const options = [];

      equipment.forEach((item, idx) => {
        const emojiData = resolveEmoji(item);
        const name = cleanItemName(item.name);
        const statText = item.atk ? `+${formatNumber(item.atk)} ATK` : `+${formatNumber(item.def ?? 0)} DEF`;

        options.push({
          label: `Equipar: ${name}`.substring(0, 100),
          value: `eq_${idx}`,
          description: `Estadística: ${statText}`.substring(0, 100),
          emoji: emojiData.selectMenuEmoji,
          default: selectedKey === `eq_${idx}`
        });
      });

      consumables.forEach((item, idx) => {
        const emojiData = resolveEmoji(item);
        const name = cleanItemName(item.name);

        options.push({
          label: `Usar: ${name} (x${item.count})`.substring(0, 100),
          value: `cons_${idx}`,
          description: `Consumible`,
          emoji: emojiData.selectMenuEmoji,
          default: selectedKey === `cons_${idx}`
        });
      });

      if (options.length === 0) return rows;

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_inv_action')
        .setPlaceholder('🛡 Selecciona un objeto para equipar o usar...')
        .addOptions(options.slice(0, 25));

      rows.push(new ActionRowBuilder().addComponents(selectMenu));

      if (selectedKey) {
        const isEquipment = selectedKey.startsWith('eq_');
        const idx = parseInt(selectedKey.split('_')[1]);
        const item = isEquipment ? equipment[idx] : consumables[idx];

        if (item) {
          const emojiData = resolveEmoji(item);
          const name = cleanItemName(item.name);

          const btnLabel = isEquipment 
            ? `Equipar ${name}`.substring(0, 80)
            : `Usar 1x ${name}`.substring(0, 80);

          const confirmBtn = new ButtonBuilder()
            .setCustomId(`confirm_action_${selectedKey}`)
            .setLabel(btnLabel)
            .setEmoji(emojiData.buttonEmoji)
            .setStyle(isEquipment ? ButtonStyle.Primary : ButtonStyle.Success);

          const cancelBtn = new ButtonBuilder()
            .setCustomId('cancel_action')
            .setLabel('Cancelar')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary);

          rows.push(new ActionRowBuilder().addComponents(confirmBtn, cancelBtn));
        }
      }

      return rows;
    };

    const replyMsg = await message.reply({
      embeds: [createInventoryEmbed(profile)],
      components: createInventoryComponents(profile)
    });

    const collector = replyMsg.createMessageComponentCollector({ time: 90000 });
    let pendingSelectedKey = null;

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: '❌ No puedes interactuar con el inventario de otra persona.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      if (invUserLocks.has(interaction.user.id)) {
        return interaction.reply({ content: '⏳ Tu acción se está procesando. Espera un momento...', flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      invUserLocks.add(interaction.user.id);

      try {
        await interaction.deferUpdate();
        const currentProfile = getUserProfile(interaction.user.id);
        const { equipment, consumables } = getCategorizedItems(currentProfile);

        if (interaction.customId === 'select_inv_action') {
          pendingSelectedKey = interaction.values[0];
          const isEquipment = pendingSelectedKey.startsWith('eq_');
          const idx = parseInt(pendingSelectedKey.split('_')[1]);
          const selectedItem = isEquipment ? equipment[idx] : consumables[idx];

          if (!selectedItem) {
            await interaction.followUp({ content: '❌ Este objeto ya no está en tu bolsa.', flags: MessageFlags.Ephemeral }).catch(() => {});
            pendingSelectedKey = null;
            return;
          }

          let previewText = '';
          const emojiData = resolveEmoji(selectedItem);
          const name = cleanItemName(selectedItem.name);
          const itemDisplayName = `${emojiData.embedTag} **${name}**`;

          if (isEquipment) {
            const isWeapon = (selectedItem.type === 'weapon') ? true : (selectedItem.atk !== undefined);
            const currentEquipped = isWeapon ? currentProfile.equipment?.weapon : currentProfile.equipment?.armor;
            const currentName = currentEquipped ? cleanItemName(currentEquipped.name) : 'Ninguno';

            previewText = `¿Deseas equipar ${itemDisplayName}?\n*Reemplazará:* \`${currentName}\``;
          } else {
            const stats = getSafeProfileStats(currentProfile);
            if (selectedItem.effect?.healHp) {
              if (stats.hp >= stats.maxHp) {
                previewText = `⚠️ **Atención:** Tu vida ya está al máximo (\`${formatNumber(stats.hp)} /${formatNumber(stats.maxHp)}\`). Si usas este objeto no tendrá ningún efecto.`;
              } else if (stats.timeRemainingStr) {
                previewText = `💡 **Sugerencia:** Tu salud se regenerará al máximo en **${stats.timeRemainingStr}** de forma gratuita.\n¿Aún deseas consumir 1x ${itemDisplayName}?`;
              } else {
                previewText = `¿Deseas consumir 1x ${itemDisplayName}?`;
              }
            } else if (selectedItem.effect?.buffStat) {
              previewText = `¿Deseas activar 1x ${itemDisplayName}?\n*Efecto:* +${selectedItem.effect.amount} en ${selectedItem.effect.buffStat.toUpperCase()} por **${selectedItem.effect.duration} batallas**.`;
            } else {
              previewText = `¿Deseas consumir 1x ${itemDisplayName}?`;
            }
          }

          await interaction.editReply({
            embeds: [createInventoryEmbed(currentProfile, previewText)],
            components: createInventoryComponents(currentProfile, pendingSelectedKey)
          });
        }

        else if (interaction.customId === 'cancel_action') {
          pendingSelectedKey = null;
          await interaction.editReply({
            embeds: [createInventoryEmbed(currentProfile)],
            components: createInventoryComponents(currentProfile)
          });
        }

        else if (interaction.customId.startsWith('confirm_action_')) {
          const actionKey = interaction.customId.replace('confirm_action_', '');
          const isEquipment = actionKey.startsWith('eq_');
          const idx = parseInt(actionKey.split('_')[1]);
          const item = isEquipment ? equipment[idx] : consumables[idx];

          if (!item) {
            await interaction.followUp({ content: '❌ Objeto no encontrado.', flags: MessageFlags.Ephemeral }).catch(() => {});
            pendingSelectedKey = null;
            return;
          }

          const emojiData = resolveEmoji(item);
          const name = cleanItemName(item.name);
          const itemDisplayName = `${emojiData.embedTag} **${name}**`;
          let resultMsg = '';

          if (isEquipment) {
            if (!currentProfile.equipment) {
              currentProfile.equipment = { weapon: null, armor: null };
            }

            const isWeapon = (item.type === 'weapon') ? true : (item.atk !== undefined);
            const slot = isWeapon ? 'weapon' : 'armor';
            const oldItem = currentProfile.equipment[slot];

            currentProfile.equipment[slot] = { ...item };

            const invIdx = currentProfile.inventory.findIndex(i => (i.id === item.id) ? true : (i.name === item.name));
            if (invIdx !== -1) {
              if (currentProfile.inventory[invIdx].count > 1) {
                currentProfile.inventory[invIdx].count -= 1;
              } else {
                currentProfile.inventory.splice(invIdx, 1);
              }
            }

            if (oldItem) {
              const existingOld = currentProfile.inventory.find(i => (i.id === oldItem.id) ? true : (i.name === oldItem.name));
              if (existingOld) {
                existingOld.count = (existingOld.count ?? 1) + 1;
              } else {
                currentProfile.inventory.push({ ...oldItem, count: 1 });
              }
            }

            const oldNameClean = oldItem ? cleanItemName(oldItem.name) : '';
            resultMsg = `⚔️ ¡Te has equipado ${itemDisplayName}!${oldItem ? ` (Devuelto a la bolsa: *${oldNameClean}*)` : ''}`;
          } 
          else {
            if (!currentProfile.activeBuffs) {
              currentProfile.activeBuffs = [];
            }

            const stats = getSafeProfileStats(currentProfile);

            if (item.effect && item.effect.healHp) {
              if (stats.hp >= stats.maxHp) {
                await interaction.followUp({
                  content: `❤️ Tu vida ya está al máximo (\`${formatNumber(stats.hp)} /${formatNumber(stats.maxHp)}\`).`,
                  flags: MessageFlags.Ephemeral
                }).catch(() => {});

                pendingSelectedKey = null;
                await interaction.editReply({
                  embeds: [createInventoryEmbed(currentProfile)],
                  components: createInventoryComponents(currentProfile)
                });
                return;
              }

              const healAmount = BigInt(item.effect.healHp);
              const oldHp = stats.hp;

              currentProfile.currentHp = stats.hp + healAmount;
              if (currentProfile.currentHp > stats.maxHp) {
                currentProfile.currentHp = stats.maxHp;
              }
              currentProfile.lastHpRegen = Date.now();

              const actualHealed = currentProfile.currentHp - oldHp;
              const updatedStats = getSafeProfileStats(currentProfile);

              resultMsg = `✅ Usaste ${itemDisplayName} y restauraste **+${formatNumber(actualHealed)} HP** (Salud actual: \`${formatNumber(updatedStats.hp)} /${formatNumber(updatedStats.maxHp)}\`).`;
            } 
            else if (item.effect && item.effect.buffStat) {
              const existingIndex = currentProfile.activeBuffs.findIndex(b => b.stat === item.effect.buffStat);
              const newBuff = {
                name: name,
                stat: item.effect.buffStat,
                amount: item.effect.amount,
                battlesLeft: item.effect.duration
              };

              if (existingIndex !== -1) {
                currentProfile.activeBuffs[existingIndex] = newBuff;
              } else {
                currentProfile.activeBuffs.push(newBuff);
              }

              resultMsg = `🧪 ¡Has consumido ${itemDisplayName}! Efecto activo durante **${item.effect.duration} batallas**.`;
            } 
            else {
              resultMsg = `✅ Has utilizado ${itemDisplayName}.`;
            }

            item.count -= 1;
            if (item.count <= 0) {
              const originalIndex = currentProfile.inventory.findIndex(i => (i.id === item.id) ? true : (i.name === item.name));
              if (originalIndex !== -1) {
                currentProfile.inventory.splice(originalIndex, 1);
              }
            }
          }

          // 🗄️ GUARDAR CAMBIOS EN SQLITE
          saveUserProfile(currentProfile);

          pendingSelectedKey = null;

          await interaction.editReply({
            embeds: [createInventoryEmbed(currentProfile)],
            components: createInventoryComponents(currentProfile)
          });

          await interaction.followUp({ content: resultMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      } catch (error) {
        if (![10062, 40060].includes(error.code)) {
          console.error('Error en Inventario:', error);
        }
      } finally {
        invUserLocks.delete(interaction.user.id);
      }
    });

    collector.on('end', async () => {
      await replyMsg.edit({ components: [] }).catch(() => {});
    });
  }
};