import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

const XP_PER_LEVEL = 100;
const MAX_LEVEL = 100;

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

const ROLE_LEVELS = Object.keys(LEVEL_ROLES)
  .map(Number)
  .sort((a, b) => a - b);

export default {
  data: new SlashCommandBuilder()
    .setName('levelset')
    .setDescription('Set a member to a specific level.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose level you want to change.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level to set.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_LEVEL)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      const targetUser =
        interaction.options.getUser('user');

      const newLevel =
        interaction.options.getInteger('level');

      const guild =
        interaction.guild;

      const member =
        await guild.members.fetch(
          targetUser.id
        );

      // --------------------------------------------------
      // Make sure leveling data exists
      // --------------------------------------------------

      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (
        !interaction.client.levelingData[guild.id]
      ) {
        interaction.client.levelingData[guild.id] = {};
      }

      // --------------------------------------------------
      // Calculate XP for the selected level
      // --------------------------------------------------

      const newXP =
        (newLevel - 1) * XP_PER_LEVEL;

      // --------------------------------------------------
      // Save the member's new level
      // --------------------------------------------------

      interaction.client.levelingData[guild.id][
        targetUser.id
      ] = {
        xp: newXP,
        level: newLevel,
      };

      // --------------------------------------------------
      // Get the bot's highest role
      // --------------------------------------------------

      const botMember =
        guild.members.me ||
        await guild.members.fetchMe();

      if (!botMember) {
        throw new Error(
          'Could not find the bot member.'
        );
      }

      // --------------------------------------------------
      // Determine which roles the member qualifies for
      // --------------------------------------------------

      const qualifyingRoleIds =
        new Set(
          ROLE_LEVELS
            .filter(
              roleLevel =>
                roleLevel <= newLevel
            )
            .map(
              roleLevel =>
                LEVEL_ROLES[roleLevel]
            )
        );

      // --------------------------------------------------
      // REMOVE LEVELING ROLES ABOVE CURRENT LEVEL
      // --------------------------------------------------

      for (
        const roleLevel of ROLE_LEVELS
      ) {
        const roleId =
          LEVEL_ROLES[roleLevel];

        if (
          qualifyingRoleIds.has(roleId)
        ) {
          continue;
        }

        if (
          !member.roles.cache.has(roleId)
        ) {
          continue;
        }

        const role =
          guild.roles.cache.get(roleId);

        if (!role) {
          continue;
        }

        // Discord does not allow the bot to manage
        // roles equal to or higher than its highest role.
        if (
          role.position >=
          botMember.roles.highest.position
        ) {
          console.warn(
            `Cannot remove ${role.name}; it is above the bot's highest role.`
          );

          continue;
        }

        try {
          await member.roles.remove(
            role,
            `Level set to ${newLevel}`
          );
        } catch (error) {
          console.error(
            `Could not remove level ${roleLevel} role:`,
            error
          );
        }
      }

      // --------------------------------------------------
      // ADD ALL QUALIFYING LEVELING ROLES
      // --------------------------------------------------

      const rolesAdded = [];

      for (
        const roleLevel of ROLE_LEVELS
      ) {
        const roleId =
          LEVEL_ROLES[roleLevel];

        if (
          !qualifyingRoleIds.has(roleId)
        ) {
          continue;
        }

        const role =
          guild.roles.cache.get(roleId);

        if (!role) {
          console.warn(
            `Level ${roleLevel} role ${roleId} was not found.`
          );

          continue;
        }

        if (
          role.position >=
          botMember.roles.highest.position
        ) {
          console.warn(
            `Cannot add ${role.name}; it is above the bot's highest role.`
          );

          continue;
        }

        if (
          member.roles.cache.has(roleId)
        ) {
          continue;
        }

        try {
          await member.roles.add(
            role,
            `Level set to ${newLevel}`
          );

          rolesAdded.push(
            role.name
          );
        } catch (error) {
          console.error(
            `Could not add level ${roleLevel} role:`,
            error
          );
        }
      }

      // --------------------------------------------------
      // SAVE LEVELING DATA
      // --------------------------------------------------

      if (
        typeof interaction.client.saveLevelingData ===
        'function'
      ) {
        interaction.client.saveLevelingData();
      }

      // --------------------------------------------------
      // RESPONSE
      // --------------------------------------------------

      const qualifyingLevels =
        ROLE_LEVELS.filter(
          roleLevel =>
            roleLevel <= newLevel
        );

      const roleText =
        qualifyingLevels.length > 0
          ? qualifyingLevels
              .map(
                level =>
                  `Level ${level}`
              )
              .join(', ')
          : 'None';

      await interaction.editReply(
        `Successfully set <@${targetUser.id}> to **Level ${newLevel}**.\n\n` +
        `**XP:** ${newXP.toLocaleString()}\n` +
        `**Leveling roles:** ${roleText}`
      );

    } catch (error) {
      console.error(
        'Levelset command error:',
        error
      );

      await interaction.editReply(
        'I could not change that member\'s level. Make sure I have permission to manage the leveling roles.'
      );
    }
  },
};
