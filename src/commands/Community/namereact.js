import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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

const DATA_DIRECTORY = path.join(
  __dirname,
  '../../../data'
);

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
// LIMITS
// ============================================================

const ONE_BOOST_LIMIT = 1;
const THREE_REACTION_LIMIT = 3;

// ============================================================
// DATA
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
// REACTION LIMIT
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

  // Two boosts
  if (
    member.roles.cache.has(BOOSTER_2_ROLE)
  ) {
    return THREE_REACTION_LIMIT;
  }

  // One boost
  if (
    member.roles.cache.has(BOOSTER_1_ROLE)
  ) {
    return ONE_BOOST_LIMIT;
  }

  // Everyone else
  return 0;
}

// ============================================================
// STAFF / OWNER
// ============================================================

function canManageOthers(member) {
  return (
    member.roles.cache.has(STAFF_ROLE) ||
    member.roles.cache.has(OWNER_ROLE)
  );
}

// ============================================================
// EMOJI
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
// COMMAND
// ============================================================

export default {

  data: new SlashCommandBuilder()

    .setName('namereact')

    .setDescription(
      'Manage custom name reactions.'
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
          'View name reactions.'
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

      const limit =
        getReactionLimit(member);

      // ======================================================
      // SET
      // ======================================================

      if (subcommand === 'set') {

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions. You must be a booster, staff member, or server owner.'
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
            `You already have a reaction for **${trigger}**.`
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
          emoji: emoji.toString(),
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

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions.'
          );

        }

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
          `Reaction: ${removed.emoji}\n` +
          `Slots: **${reactions.length}/${limit}**`
        );
      }

      // ======================================================
      // LIST
      // ======================================================

      if (subcommand === 'list') {

        // ----------------------------------------------------
        // STAFF / OWNER
        // ----------------------------------------------------

        if (
          canManageOthers(member)
        ) {

          const lines = [];

          for (
            const [targetUserId, userData]
            of Object.entries(data)
          ) {

            if (
              !userData ||
              !Array.isArray(
                userData.reactions
              )
            ) {
              continue;
            }

            let targetName =
              targetUserId;

            try {

              const targetMember =
                await interaction.guild.members.fetch(
                  targetUserId
                );

              targetName =
                targetMember.displayName;

            } catch {
              // Member may have left.
            }

            for (
              const reaction
              of userData.reactions
            ) {

              lines.push(
                `${reaction.emoji} \`${reaction.trigger}\` — **${targetName}**`
              );

            }

          }

          if (
            lines.length === 0
          ) {

            return interaction.editReply(
              'There are currently no name reactions.'
            );

          }

          return interaction.editReply({

            embeds: [

              new EmbedBuilder()

                .setTitle(
                  'Name Reactions'
                )

                .setDescription(
                  lines
                    .slice(0, 50)
                    .join('\n')
                ),

            ],

          });

        }

        // ----------------------------------------------------
        // NORMAL USER
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions.'
          );

        }

        if (
          reactions.length === 0
        ) {

          return interaction.editReply(
            `You don't have any name reactions yet.\n\n` +
            `Available slots: **${limit}**`
          );

        }

        const lines =
          reactions.map(
            (reaction, index) =>
              `**${index + 1}.** \`${reaction.trigger}\` → ${reaction.emoji}`
          );

        return interaction.editReply(
          `**Your Name Reactions**\n\n` +
          `${lines.join('\n')}\n\n` +
          `Slots: **${reactions.length}/${limit}**`
        );
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

};
