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

const STAFF_ROLE = '1532221464839848016';
const OWNER_ROLE = '1531440557954437273';

// ============================================================
// DATA FUNCTIONS
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
// INTERACTION
// ============================================================

export default {
  name: 'nameReactionRemove',

  async execute(interaction) {
    try {
      // ------------------------------------------------------
      // ONLY GUILD
      // ------------------------------------------------------

      if (!interaction.guild) {
        return interaction.reply({
          content:
            'This interaction can only be used inside a server.',
          ephemeral: true,
        });
      }

      // ------------------------------------------------------
      // STAFF / OWNER CHECK
      // ------------------------------------------------------

      const member = await interaction.guild.members.fetch(
        interaction.user.id
      );

      const isStaff =
        member.roles.cache.has(STAFF_ROLE);

      const isOwner =
        member.roles.cache.has(OWNER_ROLE);

      if (!isStaff && !isOwner) {
        return interaction.reply({
          content:
            'You do not have permission to manage other members\' name reactions.',
          ephemeral: true,
        });
      }

      // ------------------------------------------------------
      // GET SELECTED VALUE
      // ------------------------------------------------------

      const selectedValue =
        interaction.values?.[0];

      if (!selectedValue) {
        return interaction.reply({
          content:
            'No name reaction was selected.',
          ephemeral: true,
        });
      }

      /*
       * Format:
       *
       * userId::reactionIndex
       *
       * Example:
       *
       * 123456789::0
       */

      const separatorIndex =
        selectedValue.indexOf('::');

      if (separatorIndex === -1) {
        return interaction.reply({
          content:
            'Invalid name reaction selection.',
          ephemeral: true,
        });
      }

      const userId =
        selectedValue.slice(
          0,
          separatorIndex
        );

      const reactionIndex =
        Number(
          selectedValue.slice(
            separatorIndex + 2
          )
        );

      if (
        !userId ||
        !Number.isInteger(reactionIndex) ||
        reactionIndex < 0
      ) {
        return interaction.reply({
          content:
            'Invalid name reaction selection.',
          ephemeral: true,
        });
      }

      // ------------------------------------------------------
      // LOAD DATA
      // ------------------------------------------------------

      const data = loadData();

      const userData =
        data[userId];

      if (
        !userData ||
        !Array.isArray(userData.reactions)
      ) {
        return interaction.reply({
          content:
            'That member no longer has any name reactions.',
          ephemeral: true,
        });
      }

      // ------------------------------------------------------
      // GET REACTION
      // ------------------------------------------------------

      const reaction =
        userData.reactions[reactionIndex];

      if (!reaction) {
        return interaction.reply({
          content:
            'That name reaction no longer exists.',
          ephemeral: true,
        });
      }

      // ------------------------------------------------------
      // REMOVE
      // ------------------------------------------------------

      userData.reactions.splice(
        reactionIndex,
        1
      );

      // Remove empty user entry
      if (
        userData.reactions.length === 0
      ) {
        delete data[userId];
      }

      saveData(data);

      // ------------------------------------------------------
      // MEMBER NAME
      // ------------------------------------------------------

      let memberName = userId;

      try {
        const targetMember =
          await interaction.guild.members.fetch(
            userId
          );

        memberName =
          targetMember.displayName;
      } catch {
        // Member may have left the server.
      }

      // ------------------------------------------------------
      // CONFIRMATION
      // ------------------------------------------------------

      return interaction.update({
        content:
          `**Name reaction removed.**\n\n` +
          `Member: **${memberName}**\n` +
          `Trigger: \`${reaction.trigger}\`\n` +
          `Reaction: ${reaction.emoji}`,

        components: [],
      });

    } catch (error) {
      console.error(
        'Name reaction removal interaction error:',
        error
      );

      if (interaction.replied) {
        return interaction.followUp({
          content:
            'Something went wrong while removing that name reaction.',
          ephemeral: true,
        });
      }

      return interaction.reply({
        content:
          'Something went wrong while removing that name reaction.',
        ephemeral: true,
      });
    }
  },
};
