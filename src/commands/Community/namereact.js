import {
  SlashCommandBuilder,
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
// GET USER REACTION LIMIT
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
// STAFF / OWNER CHECK
// ============================================================

function canManageOthers(member) {
  return (
    member.roles.cache.has(STAFF_ROLE) ||
    member.roles.cache.has(OWNER_ROLE)
  );
}

// ============================================================
// EMOJI PARSER
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
// GET USER REACTIONS FOR THIS GUILD
// ============================================================

function getUserReactions(
  guildData,
  userId
) {

  const reactions = [];

  for (
    const [trigger, reactionData]
    of Object.entries(guildData || {})
  ) {

    if (!reactionData) {
      continue;
    }

    if (
      reactionData.userId !== userId
    ) {
      continue;
    }

    reactions.push({
      trigger,
      emoji: reactionData.emoji,
      userId,
    });
  }

  return reactions;
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

    try {

      // ------------------------------------------------------
      // SERVER CHECK
      // ------------------------------------------------------

      if (!interaction.guild) {

        return interaction.reply({
          content:
            'This command can only be used inside the server.',
          ephemeral: true,
        });

      }

      // ------------------------------------------------------
      // DEFER
      // ------------------------------------------------------

      await interaction.deferReply({
        ephemeral: true,
      });

      // ------------------------------------------------------
      // MEMBER
      // ------------------------------------------------------

      const member =
        await interaction.guild.members.fetch(
          interaction.user.id
        );

      // ------------------------------------------------------
      // SUBCOMMAND
      // ------------------------------------------------------

      const subcommand =
        interaction.options.getSubcommand();

      // ------------------------------------------------------
      // LOAD DATA
      // ------------------------------------------------------

      const data =
        loadData();

      const guildId =
        interaction.guild.id;

      const userId =
        interaction.user.id;

      // ------------------------------------------------------
      // MAKE SURE GUILD DATA EXISTS
      // ------------------------------------------------------

      if (!data[guildId]) {
        data[guildId] = {};
      }

      const guildData =
        data[guildId];

      // ------------------------------------------------------
      // USER LIMIT
      // ------------------------------------------------------

      const limit =
        getReactionLimit(member);

      // ======================================================
      // SET
      // ======================================================

      if (subcommand === 'set') {

        // ----------------------------------------------------
        // ELIGIBILITY
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply({
            content:
              'You are not eligible for name reactions. You must be a booster, staff member, or server owner.',
          });

        }

        // ----------------------------------------------------
        // GET CURRENT REACTIONS
        // ----------------------------------------------------

        const userReactions =
          getUserReactions(
            guildData,
            userId
          );

        // ----------------------------------------------------
        // LIMIT
        // ----------------------------------------------------

        if (
          userReactions.length >= limit
        ) {

          return interaction.editReply({
            content:
              `You have reached your name reaction limit of **${limit}**.\n\n` +
              `Your current reactions: **${userReactions.length}/${limit}**`,
          });

        }

        // ----------------------------------------------------
        // GET INPUT
        // ----------------------------------------------------

        const trigger =
          interaction.options
            .getString('trigger')
            ?.trim()
            .toLowerCase();

        const emojiInput =
          interaction.options
            .getString('emoji')
            ?.trim();

        // ----------------------------------------------------
        // TRIGGER VALIDATION
        // ----------------------------------------------------

        if (!trigger) {

          return interaction.editReply({
            content:
              'The trigger cannot be empty.',
          });

        }

        // ----------------------------------------------------
        // DUPLICATE TRIGGER
        // ----------------------------------------------------

        if (
          guildData[trigger]
        ) {

          return interaction.editReply({
            content:
              `The trigger **${trigger}** is already being used by another name reaction.`,
          });

        }

        // ----------------------------------------------------
        // EMOJI VALIDATION
        // ----------------------------------------------------

        const emojiId =
          getEmojiId(emojiInput);

        if (!emojiId) {

          return interaction.editReply({
            content:
              'Please use a custom emoji from this server.',
          });

        }

        // ----------------------------------------------------
        // FIND SERVER EMOJI
        // ----------------------------------------------------

        const emoji =
          interaction.guild.emojis.cache.get(
            emojiId
          );

        if (!emoji) {

          return interaction.editReply({
            content:
              'That emoji does not belong to this server.',
          });

        }

        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        guildData[trigger] = {
          userId,
          emoji: emoji.toString(),
        };

        const saved =
          saveData(data);

        if (!saved) {

          delete guildData[trigger];

          return interaction.editReply({
            content:
              'I could not save your name reaction. Please try again.',
          });

        }

        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        const newCount =
          userReactions.length + 1;

        return interaction.editReply({
          content:
            `**Name reaction added.**\n\n` +
            `Trigger: \`${trigger}\`\n` +
            `Reaction: ${emoji}\n` +
            `Slots: **${newCount}/${limit}**`,
        });

      }

      // ======================================================
      // REMOVE
      // ======================================================

      if (subcommand === 'remove') {

        // ----------------------------------------------------
        // ELIGIBILITY
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply({
            content:
              'You are not eligible for name reactions.',
          });

        }

        // ----------------------------------------------------
        // GET TRIGGER
        // ----------------------------------------------------

        const trigger =
          interaction.options
            .getString('trigger')
            ?.trim()
            .toLowerCase();

        // ----------------------------------------------------
        // FIND TRIGGER
        // ----------------------------------------------------

        const reaction =
          guildData[trigger];

        if (
          !reaction ||
          reaction.userId !== userId
        ) {

          return interaction.editReply({
            content:
              `You don't have a name reaction for **${trigger}**.`,
          });

        }

        // ----------------------------------------------------
        // REMOVE
        // ----------------------------------------------------

        delete guildData[trigger];

        // Remove empty guild data
        if (
          Object.keys(guildData).length === 0
        ) {
          delete data[guildId];
        }

        const saved =
          saveData(data);

        if (!saved) {

          return interaction.editReply({
            content:
              'I could not save the removal. Please try again.',
          });

        }

        // ----------------------------------------------------
        // COUNT REMAINING
        // ----------------------------------------------------

        const remaining =
          getUserReactions(
            data[guildId] || {},
            userId
          ).length;

        return interaction.editReply({
          content:
            `**Name reaction removed.**\n\n` +
            `Trigger: \`${trigger}\`\n` +
            `Reaction: ${reaction.emoji}\n` +
            `Slots: **${remaining}/${limit}**`,
        });

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
            const [trigger, reaction]
            of Object.entries(guildData)
          ) {

            if (!reaction) {
              continue;
            }

            let username =
              reaction.userId;

            try {

              const targetMember =
                await interaction.guild.members.fetch(
                  reaction.userId
                );

              username =
                targetMember.user.username;

            } catch {
              // Member may have left.
            }

            lines.push(
              `${reaction.emoji} \`${trigger}\` — **${username}**`
            );

          }

          if (
            lines.length === 0
          ) {

            return interaction.editReply({
              content:
                'There are currently no name reactions.',
            });

          }

          return interaction.editReply({

            embeds: [

              new EmbedBuilder()

                .setTitle(
                  'Name Reactions'
                )

                .setDescription(
                  lines
                    .slice(0, 100)
                    .join('\n')
                )

                .setFooter({
                  text:
                    `${lines.length} name reaction(s)`,
                }),

            ],

          });

        }

        // ----------------------------------------------------
        // NORMAL USER
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply({
            content:
              'You are not eligible for name reactions.',
          });

        }

        const userReactions =
          getUserReactions(
            guildData,
            userId
          );

        if (
          userReactions.length === 0
        ) {

          return interaction.editReply({
            content:
              `You don't have any name reactions yet.\n\n` +
              `Available slots: **${limit}**`,
          });

        }

        const lines =
          userReactions.map(
            (reaction, index) =>
              `**${index + 1}.** \`${reaction.trigger}\` → ${reaction.emoji}`
          );

        return interaction.editReply({
          content:
            `**Your Name Reactions**\n\n` +
            `${lines.join('\n')}\n\n` +
            `Slots: **${userReactions.length}/${limit}**`,
        });

      }

      // ------------------------------------------------------
      // UNKNOWN SUBCOMMAND
      // ------------------------------------------------------

      return interaction.editReply({
        content:
          'Unknown name reaction subcommand.',
      });

    } catch (error) {

      console.error(
        'Name reaction command error:',
        error
      );

      // ------------------------------------------------------
      // SAFE ERROR RESPONSE
      // ------------------------------------------------------

      try {

        if (
          interaction.deferred ||
          interaction.replied
        ) {

          return interaction.editReply({
            content:
              'Something went wrong while managing your name reaction. Check the bot console for the error.',
          });

        }

        return interaction.reply({
          content:
            'Something went wrong while managing your name reaction. Check the bot console for the error.',
          ephemeral: true,
        });

      } catch (replyError) {

        console.error(
          'Could not send name reaction error response:',
          replyError
        );

      }

    }

  },

};
