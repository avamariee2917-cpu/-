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
    .setName('resetalllevels')
    .setDescription('Reset all leveling data in this server.')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      interaction.client.levelingData[
        interaction.guild.id
      ] = {};

      /*
       * Remove all leveling roles from members.
       */
      const members =
        await interaction.guild.members.fetch();

      const roleIds =
        Object.values(LEVEL_ROLES);

      for (const [, member] of members) {
        if (member.user.bot) {
          continue;
        }

        const rolesToRemove =
          member.roles.cache.filter(role =>
            roleIds.includes(role.id)
          );

        for (const [, role] of rolesToRemove) {
          try {
            await member.roles.remove(
              role,
              'Server leveling reset'
            );
          } catch (error) {
            console.error(
              `Could not remove leveling role from ${member.user.tag}:`,
              error
            );
          }
        }
      }

      if (typeof interaction.client.saveLevelingData === 'function') {
        interaction.client.saveLevelingData();
      }

      await interaction.editReply(
        'All leveling data has been reset. All leveling roles have also been removed.'
      );

    } catch (error) {
      console.error(
        'Reset all levels command error:',
        error
      );

      await interaction.editReply(
        'I could not reset the server leveling system.'
      );
    }
  },
};
