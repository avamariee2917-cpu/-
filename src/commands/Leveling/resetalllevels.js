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
    .setDescription(
      'Reset every member in the server back to Level 1 and 0 XP.'
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guild.id;

      // Make sure leveling data exists
      if (!interaction.client.levelingData) {
        interaction.client.levelingData = {};
      }

      /*
       * Completely erase this server's leveling data.
       *
       * This means:
       * - Everyone goes back to Level 1
       * - Everyone goes back to 0 XP
       * - Members will begin earning XP normally again
       */
      interaction.client.levelingData[guildId] = {};

      // Save the reset immediately
      if (
        typeof interaction.client.saveLevelingData === 'function'
      ) {
        interaction.client.saveLevelingData();
      }

      /*
       * Fetch every member in the server so we can
       * remove their leveling roles.
       */
      const members =
        await interaction.guild.members.fetch();

      const levelingRoleIds =
        Object.values(LEVEL_ROLES);

      let membersReset = 0;
      let rolesRemoved = 0;

      /*
       * Go through every member.
       */
      for (const [, member] of members) {
        // Never modify bots
        if (member.user.bot) {
          continue;
        }

        /*
         * Find all leveling roles currently on
         * this member.
         */
        const rolesToRemove =
          member.roles.cache.filter(role =>
            levelingRoleIds.includes(role.id)
          );

        if (rolesToRemove.size === 0) {
          continue;
        }

        membersReset++;

        /*
         * Remove each leveling role.
         */
        for (const [, role] of rolesToRemove) {
          try {
            await member.roles.remove(
              role,
              'Server leveling system reset'
            );

            rolesRemoved++;

          } catch (error) {
            console.error(
              `Could not remove leveling role ${role.name} from ${member.user.tag}:`,
              error
            );
          }
        }
      }

      /*
       * Save one more time after the role reset.
       */
      if (
        typeof interaction.client.saveLevelingData === 'function'
      ) {
        interaction.client.saveLevelingData();
      }

      await interaction.editReply(
        `## Leveling System Reset\n\n` +
        `All leveling data has been completely reset.\n\n` +
        `**Level:** 1\n` +
        `**XP:** 0\n` +
        `**Members with leveling roles removed:** ${membersReset}\n` +
        `**Leveling roles removed:** ${rolesRemoved}\n\n` +
        `Everyone can now start leveling from the beginning.`
      );

    } catch (error) {
      console.error(
        'Reset all levels command error:',
        error
      );

      await interaction.editReply(
        'I could not reset the leveling system. Check the bot permissions and try again.'
      );
    }
  },
};
