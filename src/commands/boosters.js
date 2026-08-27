import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

const OWNER_ID =
  '1531440557954437273';

const STAFF_ROLE_ID =
  '1532221464839848016';

const BOOSTER_ROLE_IDS =
  new Set([
    '1532269323584802836',
    '1533675708193177700',
  ]);

export default {

  data: new SlashCommandBuilder()

    .setName('boosters')

    .setDescription(
      'View the members currently boosting the server.'
    ),

  async execute(interaction) {

    const isOwner =
      interaction.user.id === OWNER_ID;

    const isStaff =
      interaction.member?.roles?.cache?.has(
        STAFF_ROLE_ID
      );

    if (
      !isOwner &&
      !isStaff
    ) {

      return interaction.reply({
        content:
          'You do not have permission to use this command.',
        ephemeral: true,
      });

    }

    await interaction.deferReply({
      ephemeral: true,
    });

    try {

      const members =
        await interaction.guild.members.fetch();

      const boosters =
        members.filter(member =>
          member.roles.cache.some(role =>
            BOOSTER_ROLE_IDS.has(
              role.id
            )
          )
        );

      if (boosters.size === 0) {

        return interaction.editReply(
          'There are currently no server boosters.'
        );

      }

      const list =
        [...boosters.values()]
          .map(
            (member, index) =>
              `**${index + 1}.** ${member} — \`${member.user.tag}\``
          )
          .join('\n');

      const embed =
        new EmbedBuilder()

          .setTitle(
            'Server Boosters'
          )

          .setDescription(
            list
          )

          .setFooter({
            text:
              `${boosters.size} current booster${boosters.size === 1 ? '' : 's'}`,
          });

      return interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {

      console.error(
        'Boosters command error:',
        error
      );

      return interaction.editReply(
        'I could not retrieve the server boosters.'
      );

    }

  },

};
