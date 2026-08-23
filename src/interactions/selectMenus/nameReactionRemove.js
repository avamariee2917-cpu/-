```js
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

      // ======================================================
      // SERVER ONLY
      // ======================================================

      if (!interaction.guild) {
        return interaction.reply({
          content:
            'This interaction can only be used inside a server.',
          ephemeral: true,
        });
      }

      // ======================================================
      // STAFF / OWNER CHECK
      // ======================================================

      const member =
        await interaction.guild.members.fetch(
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

      // ======================================================
      // GET SELECTED REACTION
      // ======================================================

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
       * Selection format:
       *
       * userId::reactionIndex
       *
       * Example:
       *
       * 123456789012345678::0
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

      // ======================================================
      // LOAD DATA
      // ======================================================

      const data =
        loadData();

      const userData =
        data[userId];

      if (
        !userData ||
        !Array.isArray(
          userData.reactions
        )
      ) {
        return interaction.update({
          content:
            'That member no longer has any saved name reactions.',
          components: [],
        });
      }

      // ======================================================
      // FIND REACTION
      // ======================================================

      const reaction =
        userData.reactions[
          reactionIndex
        ];

      if (!reaction) {
        return interaction.update({
          content:
            'That name reaction no longer exists.',
          components: [],
        });
      }

      // ======================================================
      // SAVE DETAILS BEFORE DELETING
      // ======================================================

      const removedTrigger =
        reaction.trigger;

      const removedEmoji =
        reaction.emoji;

      // ======================================================
      // REMOVE REACTION
      // ======================================================

      userData.reactions.splice(
        reactionIndex,
        1
      );

      // ======================================================
      // REMOVE EMPTY USER ENTRY
      // ======================================================

      if (
        userData.reactions.length === 0
      ) {
        delete data[userId];
      }

      // ======================================================
      // SAVE
      // ======================================================

      const saved =
        saveData(data);

      if (!saved) {
        return interaction.update({
          content:
            'The name reaction could not be removed because the data file could not be saved.',
          components: [],
        });
      }

      // ======================================================
      // GET MEMBER NAME
      // ======================================================

      let memberName =
        userId;

      try {

        const targetMember =
          await interaction.guild.members.fetch(
            userId
          );

        memberName =
          targetMember.displayName;

      } catch {
        /*
         * The member may have left the server.
         * We keep the Discord user ID instead.
         */
      }

      // ======================================================
      // CONFIRMATION
      // ======================================================

      return interaction.update({

        content:
          `**Name reaction removed.**\n\n` +
          `Member: **${memberName}**\n` +
          `Trigger: \`${removedTrigger}\`\n` +
          `Reaction: ${removedEmoji}`,

        components: [],

      });

    } catch (error) {

      console.error(
        'Name reaction removal interaction error:',
        error
      );

      // ======================================================
      // ERROR RESPONSE
      // ======================================================

      if (
        interaction.replied ||
        interaction.deferred
      ) {

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
```
