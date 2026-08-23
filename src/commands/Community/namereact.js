```javascript
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
// GET MEMBER NAME
// ============================================================

async function getMemberName(guild, userId) {

  try {

    const member =
      await guild.members.fetch(userId);

    return member.displayName;

  } catch {

    return `Unknown Member (${userId})`;

  }
}

// ============================================================
// GET ALL NAME REACTIONS
// ============================================================

async function getAllReactions(guild, data) {

  const allReactions = [];

  for (
    const [userId, userData]
    of Object.entries(data)
  ) {

    if (
      !userData ||
      !Array.isArray(userData.reactions)
    ) {
      continue;
    }

    const memberName =
      await getMemberName(
        guild,
        userId
      );

    for (
      let index = 0;
      index < userData.reactions.length;
      index++
    ) {

      const reaction =
        userData.reactions[index];

      if (
        !reaction ||
        !reaction.trigger
      ) {
        continue;
      }

      allReactions.push({

        userId,

        memberName,

        reactionIndex: index,

        trigger:
          reaction.trigger,

        emoji:
          reaction.emoji,

      });

    }

  }

  return allReactions;
}

// ============================================================
// BUILD REMOVE MENU
// ============================================================

function buildRemoveMenu(allReactions) {

  const options =
    allReactions
      .slice(0, 25)
      .map(reaction => ({

        label:
          `${reaction.trigger} — ${reaction.memberName}`
            .slice(0, 100),

        description:
          `Delete ${reaction.memberName}'s name reaction`
            .slice(0, 100),

        value:
          `${reaction.userId}::${reaction.reactionIndex}`,

      }));

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()

      .setCustomId(
        'nameReactionRemove'
      )

      .setPlaceholder(
        'Select a name reaction to remove...'
      )

      .addOptions(options)

  );

}

// ============================================================
// COMMAND
// ============================================================

export default {

  data:
    new SlashCommandBuilder()

      .setName('namereact')

      .setDescription(
        'Manage your custom name reactions.'
      )

      // ======================================================
      // SET
      // ======================================================

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

      // ======================================================
      // REMOVE
      // ======================================================

      .addSubcommand(subcommand =>
        subcommand

          .setName('remove')

          .setDescription(
            'Remove a name reaction.'
          )

          .addStringOption(option =>
            option

              .setName('trigger')

              .setDescription(
                'The trigger you want to remove.'
              )

              .setRequired(false)
          )
      )

      // ======================================================
      // LIST
      // ======================================================

      .addSubcommand(subcommand =>
        subcommand

          .setName('list')

          .setDescription(
            'View all saved name reactions.'
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

      // ======================================================
      // MAKE SURE USER DATA EXISTS
      // ======================================================

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

        // ----------------------------------------------------
        // CHECK ELIGIBILITY
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions. This feature is available to boosters, staff, and the server owner.'
          );

        }

        // ----------------------------------------------------
        // CHECK SLOT LIMIT
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // VALIDATE TRIGGER
        // ----------------------------------------------------

        if (!trigger) {

          return interaction.editReply(
            'The trigger cannot be empty.'
          );

        }

        // ----------------------------------------------------
        // CHECK DUPLICATE
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // VALIDATE EMOJI
        // ----------------------------------------------------

        const emojiId =
          getEmojiId(
            emojiInput
          );

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

        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        reactions.push({

          trigger,

          emoji:
            emoji.toString(),

        });

        saveData(data);

        // ----------------------------------------------------
        // DETERMINE ACCOUNT TYPE
        // ----------------------------------------------------

        let accessType =
          'Name Reaction';

        if (
          member.roles.cache.has(
            OWNER_ROLE
          )
        ) {

          accessType =
            'Server Owner';

        } else if (
          member.roles.cache.has(
            STAFF_ROLE
          )
        ) {

          accessType =
            'Staff';

        } else if (
          member.roles.cache.has(
            BOOSTER_2_ROLE
          )
        ) {

          accessType =
            '2× Booster';

        } else if (
          member.roles.cache.has(
            BOOSTER_1_ROLE
          )
        ) {

          accessType =
            '1× Booster';

        }

        return interaction.editReply(

          `**Name reaction added.**\n\n` +

          `Trigger: \`${trigger}\`\n` +

          `Reaction: ${emoji}\n` +

          `Access: **${accessType}**\n` +

          `Slots: **${reactions.length}/${limit}**`

        );

      }

      // ======================================================
      // REMOVE
      // ======================================================

      if (subcommand === 'remove') {

        // ----------------------------------------------------
        // STAFF / OWNER
        // ----------------------------------------------------

        if (
          canManageOthers(member)
        ) {

          const allReactions =
            await getAllReactions(
              interaction.guild,
              data
            );

          if (
            allReactions.length === 0
          ) {

            return interaction.editReply({

              embeds: [

                new EmbedBuilder()

                  .setTitle(
                    'Name Reaction Removal'
                  )

                  .setDescription(
                    'There are currently no saved name reactions.'
                  ),

              ],

              components: [],

            });

          }

          const menu =
            buildRemoveMenu(
              allReactions
            );

          let description =
            'Select a name reaction below to remove it.\n\n';

          description +=
            allReactions
              .slice(0, 25)
              .map(
                reaction =>
                  `${reaction.emoji} \`${reaction.trigger}\` — **${reaction.memberName}**`
              )
              .join('\n');

          if (
            allReactions.length > 25
          ) {

            description +=
              `\n\nShowing **25/${allReactions.length}** reactions.`;

          }

          return interaction.editReply({

            embeds: [

              new EmbedBuilder()

                .setTitle(
                  'Name Reaction Removal'
                )

                .setDescription(
                  description
                ),

            ],

            components: [
              menu,
            ],

          });

        }

        // ----------------------------------------------------
        // BOOSTER / PERSONAL REMOVE
        // ----------------------------------------------------

        if (limit === 0) {

          return interaction.editReply(
            'You are not eligible for name reactions.'
          );

        }

        const trigger =
          interaction.options
            .getString('trigger');

        if (!trigger) {

          return interaction.editReply(
            'Please provide the trigger you want to remove.'
          );

        }

        const normalizedTrigger =
          trigger
            .trim()
            .toLowerCase();

        const index =
          reactions.findIndex(
            reaction =>
              reaction.trigger ===
              normalizedTrigger
          );

        if (index === -1) {

          return interaction.editReply(
            `You don't have a name reaction for **${normalizedTrigger}**.`
          );

        }

        const removed =
          reactions[index];

        reactions.splice(
          index,
          1
        );

        if (
          reactions.length === 0
        ) {

          delete data[userId];

        }

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

        const allReactions =
          await getAllReactions(
            interaction.guild,
            data
          );

        // ----------------------------------------------------
        // NOTHING SAVED
        // ----------------------------------------------------

        if (
          allReactions.length === 0
        ) {

          return interaction.editReply({

            embeds: [

              new EmbedBuilder()

                .setTitle(
                  'Name Reactions'
                )

                .setDescription(
                  'There are currently no saved name reactions.'
                ),

            ],

          });

        }

        // ----------------------------------------------------
        // BUILD LIST
        // ----------------------------------------------------

        const visibleReactions =
          allReactions.slice(
            0,
            25
          );

        const lines =
          visibleReactions.map(
            reaction =>
              `${reaction.emoji} \`${reaction.trigger}\` — **${reaction.memberName}**`
          );

        let description =
          lines.join('\n');

        if (
          allReactions.length > 25
        ) {

          description +=
            `\n\nShowing **25/${allReactions.length}** reactions.`;

        }

        // ----------------------------------------------------
        // LIST EMBED
        // ----------------------------------------------------

        return interaction.editReply({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                'Name Reactions'
              )

              .setDescription(
                description
              )

              .setFooter({
                text:
                  'Name reaction triggers currently saved in the server.',
              }),

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

};
```
