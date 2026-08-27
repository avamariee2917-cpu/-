import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

import {
  getAllBoosterRoles,
  getBoosterHistory,
  recordBooster,
} from '../utils/boosterRoles.js';

const OWNER_ID = '1531440557954437273';

const STAFF_ROLE_ID = '1532221464839848016';

const BOOSTER_ROLE_IDS = [
  '1532269323584802836',
  '1533675708193177700',
];

function isStaff(interaction) {
  return (
    interaction.user.id === OWNER_ID ||
    interaction.guild?.ownerId === interaction.user.id ||
    interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)
  );
}

function isCurrentlyBoosting(member) {
  return (
    member?.premiumSince != null ||
    BOOSTER_ROLE_IDS.some(roleId =>
      member?.roles?.cache?.has(roleId)
    )
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('boosters')
    .setDescription(
      'View current and past server boosters.'
    ),

  async execute(
    interaction,
    guildConfig,
    client
  ) {

    if (!isStaff(interaction)) {
      return interaction.reply({
        content:
          'Only staff and the server owner can use this command.',
        ephemeral: true,
      });
    }

    // Acknowledge immediately so database/member fetches
    // cannot cause "The application did not respond."
    await interaction.deferReply();

    // --------------------------------------------------------
    // Fetch members
    // --------------------------------------------------------

    const members =
      await interaction.guild.members.fetch();

    // --------------------------------------------------------
    // Load booster history
    // --------------------------------------------------------

    const history =
      await getBoosterHistory(
        client,
        interaction.guild.id
      );

    // --------------------------------------------------------
    // Detect currently boosting members and make sure their
    // history exists.
    // --------------------------------------------------------

    for (
      const member
      of members.values()
    ) {

      if (
        !isCurrentlyBoosting(member)
      ) {
        continue;
      }

      const historyRecord =
        history[member.id];

      if (
        !historyRecord ||
        !historyRecord.currentlyBoosting
      ) {

        await recordBooster(
          client,
          interaction.guild.id,
          member.user
        );

      }
    }

    // Reload after recording currently active boosters.
    const updatedHistory =
      await getBoosterHistory(
        client,
        interaction.guild.id
      );

    const customRoles =
      await getAllBoosterRoles(
        client,
        interaction.guild.id
      );

    const entries =
      Object.values(updatedHistory);

    if (
      entries.length === 0
    ) {

      return interaction.editReply({
        content:
          'No current or past boosters have been recorded yet.',
      });

    }

    // --------------------------------------------------------
    // Sort:
    // current boosters first, then newest booster activity.
    // --------------------------------------------------------

    entries.sort(
      (a, b) => {

        if (
          a.currentlyBoosting &&
          !b.currentlyBoosting
        ) {
          return -1;
        }

        if (
          !a.currentlyBoosting &&
          b.currentlyBoosting
        ) {
          return 1;
        }

        return (
          Number(b.lastBoostAt || 0) -
          Number(a.lastBoostAt || 0)
        );
      }
    );

    const lines = [];

    for (
      const booster
      of entries
    ) {

      const member =
        members.get(
          booster.userId
        );

      const currentlyBoosting =
        member
          ? isCurrentlyBoosting(member)
          : Boolean(
              booster.currentlyBoosting
            );

      const record =
        customRoles[
          booster.userId
        ];

      let roleText =
        'No custom role';

      if (
        currentlyBoosting &&
        record?.roleId
      ) {

        const role =
          interaction.guild.roles.cache.get(
            record.roleId
          );

        if (role) {
          roleText =
            `<@&${role.id}>`;
        }
      }

      const status =
        currentlyBoosting
          ? 'Currently Boosting'
          : 'Past Booster';

      const userMention =
        member
          ? `${member}`
          : `<@${booster.userId}>`;

      lines.push(
        `• ${userMention} — **${status}** — ${roleText}`
      );
    }

    // Discord embed descriptions have a character limit,
    // so split into pages when necessary.
    const chunks = [];

    let currentChunk = [];

    let currentLength = 0;

    for (
      const line
      of lines
    ) {

      if (
        currentLength +
        line.length +
        1 >
        3800
      ) {

        chunks.push(
          currentChunk.join('\n')
        );

        currentChunk = [];

        currentLength = 0;
      }

      currentChunk.push(
        line
      );

      currentLength +=
        line.length +
        1;
    }

    if (
      currentChunk.length > 0
    ) {

      chunks.push(
        currentChunk.join('\n')
      );
    }

    const totalCurrentBoosters =
      entries.filter(
        booster => {

          const member =
            members.get(
              booster.userId
            );

          return member
            ? isCurrentlyBoosting(member)
            : Boolean(
                booster.currentlyBoosting
              );
        }
      ).length;

    const totalPastBoosters =
      entries.length -
      totalCurrentBoosters;

    const firstEmbed =
      new EmbedBuilder()
        .setTitle(
          '✦ Server Boosters'
        )
        .setDescription(
          chunks[0]
        )
        .setColor(
          '#999999'
        )
        .setFooter({
          text:
            `${totalCurrentBoosters} current • ${totalPastBoosters} past • ${entries.length} total`,
        });

    await interaction.editReply({
      embeds: [
        firstEmbed,
      ],
    });

    // --------------------------------------------------------
    // Additional pages
    // --------------------------------------------------------

    if (
      chunks.length > 1
    ) {

      for (
        let index = 1;
        index < chunks.length;
        index++
      ) {

        const pageEmbed =
          new EmbedBuilder()
            .setTitle(
              `✦ Server Boosters — Page ${index + 1}`
            )
            .setDescription(
              chunks[index]
            )
            .setColor(
              '#999999'
            );

        await interaction.followUp({
          embeds: [
            pageEmbed,
          ],
        });
      }
    }
  },
};
