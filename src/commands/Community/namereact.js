import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// FILE LOCATION
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.join(__dirname, '../../../data');

const DATA_FILE = path.join(
  DATA_DIRECTORY,
  'nameReactions.json'
);

// ============================================================
// ROLE IDs
// ============================================================

const BOOSTER_1_ROLE = '1532269323584802836';
const BOOSTER_2_ROLE = '1533675708193177700';

const STAFF_ROLE = '1532221464839848016';
const OWNER_ROLE = '1531440557954437273';

// ============================================================
// NAME REACTION LIMITS
// ============================================================

const ONE_BOOST_LIMIT = 1;
const THREE_REACTION_LIMIT = 3;

// ============================================================
// DATA FILE
// ============================================================

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    fs.mkdirSync(DATA_DIRECTORY, {
      recursive: true,
    });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({}, null, 2),
      'utf8'
    );
  }
}

function loadData() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(
      DATA_FILE,
      'utf8'
    );

    if (!raw.trim()) {
      return {};
    }

    const data = JSON.parse(raw);

    if (
      typeof data !== 'object' ||
      data === null ||
      Array.isArray(data)
    ) {
      return {};
    }

    return data;

  } catch (error) {
    console.error(
      'Failed to load name reaction data:',
      error
    );

    return {};
  }
}

function saveData(data) {
  ensureDataFile();

  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return true;

  } catch (error) {
    console.error(
      'Failed to save name reaction data:',
      error
    );

    return false;
  }
}

// ============================================================
// DETERMINE USER LIMIT
// ============================================================

function getReactionLimit(member) {

  // Owner
  if (
    member.roles.cache.has(OWNER_ROLE)
  ) {
    return THREE_REACTION_LIMIT;
  }

  // Staff
  if (
    member.roles.cache.has(STAFF_ROLE)
  ) {
    return THREE_REACTION_LIMIT;
  }

  // Two boosters
  if (
    member.roles.cache.has(BOOSTER_2_ROLE)
  ) {
    return THREE_REACTION_LIMIT;
  }

  // One booster
  if (
    member.roles.cache.has(BOOSTER_1_ROLE)
  ) {
    return ONE_BOOST_LIMIT;
  }

  // Normal member
  return 0;
}

// ============================================================
// STAFF / OWNER CHECK
// ============================================================

function canManageOthers(member) {

  return (
    member.roles.cache.has(STAFF_ROLE) ||
    member.roles.cache.has(OWNER_ROLE)
  );

}

// ============================================================
// EMOJI CHECK
// ============================================================

function getEmojiId(emoji) {

  if (!emoji) {
    return null;
  }

  const match = emoji.match(
    /^<a?:[a-zA-Z0-9_~]+:(\d+)>$/
  );

  if (!match) {
    return null;
  }

  return match[1];
}

// ============================================================
// GET ELIGIBLE MEMBERS
// ============================================================

async function getEligibleMembers(guild) {

  const members =
    await guild.members.fetch();

  return members.filter(member => {

    if (member.user.bot) {
      return false;
    }

    return getReactionLimit(member) > 0;

  });

}

// ============================================================
// BUILD MEMBER MENU
// ============================================================

function buildMemberMenu(members) {

  const options =
    members
      .sort(
        (a, b) =>
          a.displayName.localeCompare(
            b.displayName
          )
      )
      .first(25)
      .map(member => ({

        label:
          member.displayName.slice(0, 100),

        description:
          `${getReactionLimit(member)} reaction slot(s)`,

        value:
          member.id,

      }));

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()

      .setCustomId(
        'namereact_member_select'
      )

      .setPlaceholder(
        'Select a member...'
      )

      .addOptions(options)

  );

}

// ============================================================
// BUILD REACTION MENU
// ============================================================

function buildReactionMenu(
  userId,
  reactions
) {

  const options =
    reactions
      .slice(0, 25)
      .map((reaction, index) => ({

        label:
          reaction.trigger.slice(0, 100),

        description:
          `Reaction ${index + 1}`,

        value:
          String(index),

      }));

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()

      .setCustomId(
        `namereact_reaction_select_${userId}`
      )

      .setPlaceholder(
        'Select a reaction to manage...'
      )

      .addOptions(options)

  );

}

// ============================================================
// BUILD DELETE BUTTONS
// ============================================================

function buildDeleteButtons(
  userId,
  reactionIndex
) {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(
        `namereact_delete_${userId}_${reactionIndex}`
      )

      .setLabel(
        'Delete'
      )

      .setStyle(
        ButtonStyle.Danger
      ),

    new ButtonBuilder()

      .setCustomId(
        'namereact_cancel'
      )

      .setLabel(
        'Cancel'
      )

      .setStyle(
        ButtonStyle.Secondary
      )

  );

}

// ============================================================
// COMMAND
// ============================================================

export default {

  data: new SlashCommandBuilder()

    .setName('namereact')

    .setDescription(
      'Manage your custom name reactions.'
    )

    // ========================================================
    // SET
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand

        .setName('set')

        .setDescription(
          'Set a name trigger and custom emoji.'
        )

        .addStringOption(option =>
          option

            .setName('trigger')

            .setDescription(
              'The name or word that should trigger the reaction.'
            )

            .setRequired(true)

            .setMaxLength(50)
        )

        .addStringOption(option =>
          option

            .setName('emoji')

            .setDescription(
              'The custom server emoji to use.'
            )

            .setRequired(true)
        )
    )

    // ========================================================
    // REMOVE
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand

        .setName('remove')

        .setDescription(
          'Remove one of your name reactions.'
        )

        .addStringOption(option =>
          option

            .setName('trigger')

            .setDescription(
              'The trigger you want to remove.'
            )

            .setRequired(true)
        )
    )

    // ========================================================
    // LIST
    // ========================================================

    .addSubcommand(subcommand =>
      subcommand

        .setName('list')

        .setDescription(
          'View and manage name reactions.'
        )
    ),

  // ==========================================================
  // EXECUTE
  // ==========================================================

  async execute(interaction) {

    await interaction.deferReply({
      ephemeral: true,
    });

    try {

      const member =
        await interaction.guild.members.fetch(
          interaction.user.id
        );

      const limit =
        getReactionLimit(member);

      const subcommand =
        interaction.options.getSubcommand();

      const data =
        loadData();

      const userId =
        interaction.user.id;

      if (!data[userId]) {

        data[userId] = {
          reactions: [],
        };

      }

      if (
        !Array.isArray(
          data[userId].reactions
        )
      ) {

        data[userId].reactions = [];

      }

      const reactions =
        data[userId].reactions;

      // ======================================================
      // SET
      // ======================================================

      if (subcommand === 'set') {

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions. This feature is available to boosters, staff, and the server owner.'
          );

        }

        if (
          reactions.length >= limit
        ) {

          return interaction.editReply(
            `You have reached your name reaction limit of **${limit}**.`
          );

        }

        const trigger =
          interaction.options
            .getString('trigger')
            .trim()
            .toLowerCase();

        const emojiInput =
          interaction.options
            .getString('emoji')
            .trim();

        if (!trigger) {

          return interaction.editReply(
            'The trigger cannot be empty.'
          );

        }

        const duplicate =
          reactions.some(
            reaction =>
              reaction.trigger === trigger
          );

        if (duplicate) {

          return interaction.editReply(
            `You already have a reaction trigger for **${trigger}**.`
          );

        }

        const emojiId =
          getEmojiId(emojiInput);

        if (!emojiId) {

          return interaction.editReply(
            'Please use a custom emoji from this server.'
          );

        }

        const emoji =
          interaction.guild.emojis.cache.get(
            emojiId
          );

        if (!emoji) {

          return interaction.editReply(
            'That emoji does not belong to this server.'
          );

        }

        reactions.push({

          trigger,

          emoji:
            emoji.toString(),

        });

        saveData(data);

        return interaction.editReply(

          `**Name reaction added.**\n\n` +

          `Trigger: \`${trigger}\`\n` +

          `Reaction: ${emoji}\n` +

          `Slots: **${reactions.length}/${limit}**`

        );

      }

      // ======================================================
      // REMOVE
      // ======================================================

      if (subcommand === 'remove') {

        const trigger =
          interaction.options
            .getString('trigger')
            .trim()
            .toLowerCase();

        const index =
          reactions.findIndex(
            reaction =>
              reaction.trigger === trigger
          );

        if (index === -1) {

          return interaction.editReply(
            `You don't have a name reaction for **${trigger}**.`
          );

        }

        const removed =
          reactions[index];

        reactions.splice(
          index,
          1
        );

        saveData(data);

        return interaction.editReply(

          `**Name reaction removed.**\n\n` +

          `Trigger: \`${removed.trigger}\`\n` +

          `Slots: **${reactions.length}/${limit}**`

        );

      }

      // ======================================================
      // LIST
      // ======================================================

      if (subcommand === 'list') {

        // ----------------------------------------------------
        // Normal members
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions.'
          );

        }

        // ----------------------------------------------------
        // STAFF / OWNER
        // ----------------------------------------------------

        if (
          canManageOthers(member)
        ) {

          const eligibleMembers =
            await getEligibleMembers(
              interaction.guild
            );

          if (
            eligibleMembers.size === 0
          ) {

            return interaction.editReply(
              'There are currently no eligible members with name reactions.'
            );

          }

          const embed =
            new EmbedBuilder()

              .setTitle(
                'Name Reaction Manager'
              )

              .setDescription(
                'Select a booster, staff member, or owner below to view their name reactions.'
              );

          const menu =
            buildMemberMenu(
              eligibleMembers
            );

          return interaction.editReply({

            embeds: [
              embed,
            ],

            components: [
              menu,
            ],

          });

        }

        // ----------------------------------------------------
        // BOOSTER — OWN REACTIONS
        // ----------------------------------------------------

        if (
          reactions.length === 0
        ) {

          return interaction.editReply(

            `You don't have any name reactions yet.\n\n` +

            `Available slots: **${limit}**`

          );

        }

        const embed =
          new EmbedBuilder()

            .setTitle(
              'Your Name Reactions'
            )

            .setDescription(
              `You are using **${reactions.length}/${limit}** slots.\n\nSelect a reaction below to manage it.`
            );

        const menu =
          buildReactionMenu(
            userId,
            reactions
          );

        return interaction.editReply({

          embeds: [
            embed,
          ],

          components: [
            menu,
          ],

        });

      }

    } catch (error) {

      console.error(
        'Name reaction command error:',
        error
      );

      return interaction.editReply(
        'Something went wrong while managing your name reactions.'
      );

    }

  },

  // ==========================================================
  // COMPONENT HANDLER
  // ==========================================================

  async handleComponent(interaction) {

    try {

      // ======================================================
      // MEMBER SELECTION
      // ======================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          'namereact_member_select'
      ) {

        const selectedUserId =
          interaction.values[0];

        const selectedMember =
          await interaction.guild.members.fetch(
            selectedUserId
          );

        const reactionsData =
          loadData();

        const selectedData =
          reactionsData[selectedUserId] || {
            reactions: [],
          };

        const reactions =
          Array.isArray(
            selectedData.reactions
          )
            ? selectedData.reactions
            : [];

        const limit =
          getReactionLimit(
            selectedMember
          );

        if (
          reactions.length === 0
        ) {

          return interaction.update({

            embeds: [

              new EmbedBuilder()

                .setTitle(
                  `${selectedMember.displayName}'s Name Reactions`
                )

                .setDescription(
                  `This member has no name reactions.\n\nSlots: **0/${limit}**`
                ),

            ],

            components: [],

          });

        }

        const lines =
          reactions.map(
            (reaction, index) =>
              `**${index + 1}.** \`${reaction.trigger}\` → ${reaction.emoji}`
          );

        const embed =
          new EmbedBuilder()

            .setTitle(
              `${selectedMember.displayName}'s Name Reactions`
            )

            .setDescription(
              `${lines.join('\n')}\n\n` +
              `Slots: **${reactions.length}/${limit}**\n\n` +
              `Select a reaction below to manage it.`
            );

        const menu =
          buildReactionMenu(
            selectedUserId,
            reactions
          );

        return interaction.update({

          embeds: [
            embed,
          ],

          components: [
            menu,
          ],

        });

      }

      // ======================================================
      // REACTION SELECTION
      // ======================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith(
          'namereact_reaction_select_'
        )
      ) {

        const targetUserId =
          interaction.customId.replace(
            'namereact_reaction_select_',
            ''
          );

        const reactionIndex =
          Number(
            interaction.values[0]
          );

        const data =
          loadData();

        const targetData =
          data[targetUserId];

        if (
          !targetData ||
          !Array.isArray(
            targetData.reactions
          )
        ) {

          return interaction.update({

            content:
              'That member does not have any saved name reactions.',

            embeds: [],

            components: [],

          });

        }

        const reaction =
          targetData.reactions[
            reactionIndex
          ];

        if (!reaction) {

          return interaction.update({

            content:
              'That name reaction could not be found.',

            embeds: [],

            components: [],

          });

        }

        // ----------------------------------------------------
        // Permission check
        // ----------------------------------------------------

        const interactionMember =
          await interaction.guild.members.fetch(
            interaction.user.id
          );

        const canManage =
          canManageOthers(
            interactionMember
          ) ||
          interaction.user.id ===
            targetUserId;

        if (!canManage) {

          return interaction.reply({

            content:
              'You can only manage your own name reactions.',

            ephemeral: true,

          });

        }

        const targetMember =
          await interaction.guild.members.fetch(
            targetUserId
          );

        const embed =
          new EmbedBuilder()

            .setTitle(
              'Delete Name Reaction?'
            )

            .setDescription(

              `Are you sure you want to delete this name reaction?\n\n` +

              `**Member:** ${targetMember.displayName}\n` +

              `**Trigger:** \`${reaction.trigger}\`\n` +

              `**Reaction:** ${reaction.emoji}`

            );

        const buttons =
          buildDeleteButtons(
            targetUserId,
            reactionIndex
          );

        return interaction.update({

          embeds: [
            embed,
          ],

          components: [
            buttons,
          ],

        });

      }

      // ======================================================
      // DELETE
      // ======================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          'namereact_delete_'
        )
      ) {

        const parts =
          interaction.customId.split('_');

        const targetUserId =
          parts[2];

        const reactionIndex =
          Number(
            parts[3]
          );

        const interactionMember =
          await interaction.guild.members.fetch(
            interaction.user.id
          );

        const canManage =
          canManageOthers(
            interactionMember
          ) ||
          interaction.user.id ===
            targetUserId;

        if (!canManage) {

          return interaction.reply({

            content:
              'You do not have permission to delete this reaction.',

            ephemeral: true,

          });

        }

        const data =
          loadData();

        if (
          !data[targetUserId] ||
          !Array.isArray(
            data[targetUserId].reactions
          )
        ) {

          return interaction.update({

            content:
              'That member has no saved name reactions.',

            embeds: [],

            components: [],

          });

        }

        const reactions =
          data[targetUserId].reactions;

        const removed =
          reactions[reactionIndex];

        if (!removed) {

          return interaction.update({

            content:
              'That name reaction no longer exists.',

            embeds: [],

            components: [],

          });

        }

        reactions.splice(
          reactionIndex,
          1
        );

        saveData(data);

        const targetMember =
          await interaction.guild.members.fetch(
            targetUserId
          );

        const limit =
          getReactionLimit(
            targetMember
          );

        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                'Name Reaction Deleted'
              )

              .setDescription(

                `Successfully removed:\n\n` +

                `**Member:** ${targetMember.displayName}\n` +

                `**Trigger:** \`${removed.trigger}\`\n` +

                `**Reaction:** ${removed.emoji}\n\n` +

                `Slots: **${reactions.length}/${limit}**`

              ),

          ],

          components: [],

        });

      }

      // ======================================================
      // CANCEL
      // ======================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'namereact_cancel'
      ) {

        return interaction.update({

          content:
            'Deletion cancelled.',

          embeds: [],

          components: [],

        });

      }

    } catch (error) {

      console.error(
        'Name reaction component error:',
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        return interaction.followUp({

          content:
            'Something went wrong while managing that name reaction.',

          ephemeral: true,

        });

      }

      return interaction.reply({

        content:
          'Something went wrong while managing that name reaction.',

        ephemeral: true,

      });

    }

  },

};
