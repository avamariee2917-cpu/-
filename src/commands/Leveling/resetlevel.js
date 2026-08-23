import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

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

export default {
  data: new SlashCommandBuilder()
    .setName('resetlevel')
    .setDescription('Reset a member back to level 1.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member whose level you want to reset.')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser =
        interaction.options.getUser('user');

      const member =
        await interaction.guild.members.fetch(targetUser.id);

      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      if (!interaction.client.levelingData[interaction.guild.id]) {
        interaction.client.levelingData[interaction.guild.id] = {};
      }

      /*
       * Reset the member to level 1 with 0 XP.
       */
      interaction.client.levelingData[
        interaction.guild.id
      ][targetUser.id] = {
        xp: 0,
        level: 1,
      };

      /*
       * Remove every leveling role from the member.
       */
      for (const roleId of Object.values(LEVEL_ROLES)) {
        if (!member.roles.cache.has(roleId)) {
          continue;
        }

        const role =
          interaction.guild.roles.cache.get(roleId);

        if (!role) {
          continue;
        }

        try {
          await member.roles.remove(
            role,
            'Member level reset to level 1'
          );
        } catch (error) {
          console.error(
            `Could not remove leveling role ${roleId} from ${member.user.tag}:`,
            error
          );
        }
      }

      /*
       * Save the leveling data.
       */
      if (
        typeof interaction.client.saveLevelingData === 'function'
      ) {
        interaction.client.saveLevelingData();
      }

      await interaction.editReply(
        `Successfully reset <@${targetUser.id}> to level **1** with **0 XP**.\n\nAll leveling roles have been removed.`
      );

    } catch (error) {
      console.error(
        'ResetLevel command error:',
        error
      );

      await interaction.editReply(
        'I could not reset that member\'s level. Check that I have permission to manage their leveling roles.'
      );
    }
  },
};
