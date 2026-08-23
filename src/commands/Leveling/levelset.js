import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const LEVEL_ROLES = {
  5: '1532968053120307301',
  10: '1532969032557396018',
  20: '1532969099918053456',
  30: '1532969151419650099',
  40: '1532969195266904115',
  50: '1532969253005951117',
  60: '1532969414205509714',
  70: '1532969466353160232',
  80: '1532969543100793002',
  90: '1532969608452116601',
  100: '1532974501900451890',
};

const MAX_LEVEL = 100;

export default {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Set a member to a specific leveling level.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose level you want to change.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level to set the member to.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_LEVEL)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    /*
     * Defer immediately.
     *
     * This prevents Discord from showing:
     * "The application did not respond."
     */
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser('user');
      const newLevel = interaction.options.getInteger('level');

      if (!interaction.guild) {
        return interaction.editReply(
          'This command can only be used inside a server.'
        );
      }

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!member) {
        return interaction.editReply(
          'I could not find that member in this server.'
        );
      }

      /*
       * Find the bot's highest role.
       *
       * Discord cannot give/remove roles that are above
       * the bot's highest role.
       */
      const botMember = interaction.guild.members.me;

      if (!botMember) {
        return interaction.editReply(
          'I could not determine my bot permissions.'
        );
      }

      /*
       * Store leveling data.
       *
       * This uses the leveling data already loaded by src/app.js.
       */
      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (!interaction.client.levelingData[interaction.guild.id]) {
        interaction.client.levelingData[interaction.guild.id] = {};
      }

      if (
        !interaction.client.levelingData[interaction.guild.id][targetUser.id]
      ) {
        interaction.client.levelingData[interaction.guild.id][targetUser.id] = {
          xp: 0,
          level: newLevel,
        };
      }

      const userData =
        interaction.client.levelingData[interaction.guild.id][targetUser.id];

      /*
       * Keep XP consistent with the level.
       *
       * Level 1 = 0 XP
       * Level 2 = 100 XP
       * Level 10 = 900 XP
       * Level 54 = 5300 XP
       *
       * The user can continue earning XP normally afterward.
       */
      userData.level = newLevel;
      userData.xp = (newLevel - 1) * 100;

      /*
       * Sort role levels from lowest to highest.
       */
      const roleLevels = Object.keys(LEVEL_ROLES)
        .map(Number)
        .sort((a, b) => a - b);

      /*
       * Determine which roles the member SHOULD have.
       *
       * Example:
       * Level 54:
       * 5, 10, 20, 30, 40, 50
       *
       * Level 1:
       * none
       *
       * Level 100:
       * 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
       */
      const qualifyingLevels = roleLevels.filter(
        roleLevel => roleLevel <= newLevel
      );

      const qualifyingRoleIds = new Set(
        qualifyingLevels.map(level => LEVEL_ROLES[level])
      );

      /*
       * First remove every leveling role that the member
       * should NOT have.
       */
      for (const roleLevel of roleLevels) {
        const roleId = LEVEL_ROLES[roleLevel];

        if (
          !qualifyingRoleIds.has(roleId) &&
          member.roles.cache.has(roleId)
        ) {
          const role = interaction.guild.roles.cache.get(roleId);

          /*
           * Make sure the bot is capable of removing the role.
           */
          if (!role) {
            continue;
          }

          if (role.position >= botMember.roles.highest.position) {
            continue;
          }

          try {
            await member.roles.remove(
              role,
              `Level set to ${newLevel}`
            );
          } catch (error) {
            console.error(
              `Failed to remove level ${roleLevel} role from ${targetUser.tag}:`,
              error
            );
          }
        }
      }

      /*
       * Now give every role the member qualifies for.
       */
      for (const roleLevel of qualifyingLevels) {
        const roleId = LEVEL_ROLES[roleLevel];
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
          continue;
        }

        /*
         * If the bot cannot manage the role, don't crash
         * the entire command.
         */
        if (role.position >= botMember.roles.highest.position) {
          continue;
        }

        if (!member.roles.cache.has(roleId)) {
          try {
            await member.roles.add(
              role,
              `Level set to ${newLevel}`
            );
          } catch (error) {
            console.error(
              `Failed to add level ${roleLevel} role to ${targetUser.tag}:`,
              error
            );
          }
        }
      }

      /*
       * Save leveling data if the save function exists
       * on the bot.
       */
      if (typeof interaction.client.saveLevelingData === 'function') {
        interaction.client.saveLevelingData();
      }

      /*
       * If src/app.js exposes the data file saver differently,
       * this fallback keeps the command functional as long
       * as levelingData is already being persisted elsewhere.
       */
      const roleNames = qualifyingLevels.length
        ? qualifyingLevels.join(', ')
        : 'none';

      await interaction.editReply(
        `Successfully set ${targetUser} to level **${newLevel}**.\n\n` +
        `Leveling roles: ${roleNames}`
      );

    } catch (error) {
      console.error('Error executing setlevel command:', error);

      /*
       * Because the interaction was deferred, editReply is
       * the correct way to respond here.
       */
      try {
        await interaction.editReply(
          'There was an error while setting that member\'s level.'
        );
      } catch (replyError) {
        console.error(
          'Could not send setlevel error response:',
          replyError
        );
      }
    }
  },
};
