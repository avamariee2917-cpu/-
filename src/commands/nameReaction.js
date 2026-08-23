import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// PATHS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.join(__dirname, '../../data');
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
// DATA STORAGE
// ============================================================

function ensureDataFile() {
  try {
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
  } catch (error) {
    console.error(
      'Could not create name reaction data file:',
      error
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
      'Could not load name reaction data:',
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
      'Could not save name reaction data:',
      error
    );

    return false;
  }
}

// ============================================================
// PERMISSION / LIMIT CHECKING
// ============================================================

function getReactionLimit(member) {
  // Owner gets 3
  if (member.roles.cache.has(OWNER_ROLE)) {
    return THREE_REACTION_LIMIT;
  }

  // Staff gets 3
  if (member.roles.cache.has(STAFF_ROLE)) {
    return THREE_REACTION_LIMIT;
  }

  // 2+ booster gets 3
  if (member.roles.cache.has(BOOSTER_2_ROLE)) {
    return THREE_REACTION_LIMIT;
  }

  // 1 booster gets 1
  if (member.roles.cache.has(BOOSTER_1_ROLE)) {
    return ONE_BOOST_LIMIT;
  }

  // Everyone else gets 0
  return 0;
}

// ============================================================
// EMOJI VALIDATION
// ============================================================

function getCustomEmojiId(emoji) {
  if (!emoji) {
    return null;
  }

  // Discord custom emoji format:
  // <:name:id>
  // <a:name:id>

  const match = emoji.match(
    /^<a?:[a-zA-Z0-9_~]+:(\d+)>$/
  );

  if (!match) {
    return null;
  }

  return match[1];
}

// ============================================================
// SLASH COMMAND
// ============================================================

export default {
  data: new SlashCommandBuilder()
    .setName('nameresponse')
    .setDescription(
      'Manage your custom name reaction triggers.'
    )

    // --------------------------------------------------------
    // ADD
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription(
          'Create a name reaction trigger.'
        )
        .addStringOption(option =>
          option
            .setName('trigger')
            .setDescription(
              'The word or name that should trigger your emoji.'
            )
            .setRequired(true)
            .setMaxLength(50)
        )
        .addStringOption(option =>
          option
            .setName('emoji')
            .setDescription(
              'The custom server emoji to react with.'
            )
            .setRequired(true)
        )
    )

    // --------------------------------------------------------
    // REMOVE
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription(
          'Remove one of your name reaction triggers.'
        )
        .addStringOption(option =>
          option
            .setName('trigger')
            .setDescription(
              'The trigger you want to remove.'
            )
            .setRequired(true)
            .setMaxLength(50)
        )
    )

    // --------------------------------------------------------
    // LIST
    // --------------------------------------------------------

    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription(
          'View your current name reaction triggers.'
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
          triggers: [],
        };
      }

      if (!Array.isArray(data[userId].triggers)) {
        data[userId].triggers = [];
      }

      const triggers =
        data[userId].triggers;

      // ======================================================
      // ADD
      // ======================================================

      if (subcommand === 'add') {
        if (limit === 0) {
          return interaction.editReply(
            'You are not eligible to use name reactions. This feature is available to boosters, staff, and the server owner.'
          );
        }

        if (triggers.length >= limit) {
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
            'Your trigger cannot be empty.'
          );
        }

        // Prevent duplicate triggers for the same person
        const alreadyExists =
          triggers.some(
            item =>
              item.trigger === trigger
          );

        if (alreadyExists) {
          return interaction.editReply(
            `You already have a name reaction for **${trigger}**.`
          );
        }

        // Make sure it is a custom emoji
        const emojiId =
          getCustomEmojiId(emojiInput);

        if (!emojiId) {
          return interaction.editReply(
            'That does not appear to be a valid custom Discord emoji. Please select one of your server custom emojis.'
          );
        }

        // Make sure emoji belongs to this server
        const emoji =
          interaction.guild.emojis.cache.get(
            emojiId
          );

        if (!emoji) {
          return interaction.editReply(
            'That emoji is not a custom emoji from this server. Please use one of your server emojis.'
          );
        }

        triggers.push({
          trigger,
          emoji: emoji.toString(),
        });

        saveData(data);

        return interaction.editReply(
          `Name reaction added successfully.\n\n` +
          `**Trigger:** \`${trigger}\`\n` +
          `**Emoji:** ${emoji}\n` +
          `**Slots:** ${triggers.length}/${limit}`
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
          triggers.findIndex(
            item =>
              item.trigger === trigger
          );

        if (index === -1) {
          return interaction.editReply(
            `You don't have a name reaction for **${trigger}**.`
          );
        }

        const removed =
          triggers[index];

        triggers.splice(index, 1);

        saveData(data);

        return interaction.editReply(
          `Name reaction removed successfully.\n\n` +
          `**Trigger:** \`${removed.trigger}\`\n` +
          `**Slots:** ${triggers.length}/${limit}`
        );
      }

      // ======================================================
      // LIST
      // ======================================================

      if (subcommand === 'list') {
        if (limit === 0) {
          return interaction.editReply(
            'You are not currently eligible to use name reactions.'
          );
        }

        if (triggers.length === 0) {
          return interaction.editReply(
            `You don't have any name reactions yet.\n\n` +
            `You can use **${limit}** slot${limit === 1 ? '' : 's'}.`
          );
        }

        const lines =
          triggers.map(
            (item, index) =>
              `**${index + 1}.** \`${item.trigger}\` → ${item.emoji}`
          );

        return interaction.editReply(
          `**Your Name Reactions**\n\n` +
          `${lines.join('\n')}\n\n` +
          `**Slots:** ${triggers.length}/${limit}`
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
