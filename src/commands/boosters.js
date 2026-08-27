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

function isOwner(interaction) {
  return (
    interaction.user.id === OWNER_ID ||
    interaction.guild?.ownerId === interaction.user.id
  );
}

function isStaff(interaction) {
  return (
    isOwner(interaction) ||
    interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)
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

    // ========================================================
    // PERMISSION
    // ========================================================

    if (!isStaff(interaction)) {
      return interaction.reply({
        content:
          'Only staff and the server owner can use this command.',
        ephemeral: true,
      });
    }

    // ========================================================
    // ACKNOWLEDGE IMMEDIATELY
    // ========================================================

    await interaction.deferReply();

    // ========================================================
    // CURRENT BOOSTERS
    // ========================================================
    //
    // We intentionally do NOT call guild.members.fetch()
    // because that requests the entire member list.
    //
    // Instead, use the configured booster roles.
    // ========================================================

    const currentBoosterIds =
      new Set();

    for (
      const boosterRoleId
      of BOOSTER_ROLE_IDS
    ) {

      const boosterRole =
        interaction.guild.roles.cache.get(
          boosterRoleId
        );

      if (!boosterRole) {
        continue;
      }

      for (
        const [memberId, member]
        of boosterRole.members
      ) {

        currentBoosterIds.add(
          memberId
        );

        // Make sure this current booster is recorded
        // in permanent history.
        await recordBooster(
          client,
          interaction.guild.id,
          member.user
        ).catch(() => {});
      }
    }

    // ========================================================
    // LOAD PERMANENT BOOSTER HISTORY
    // ========================================================

    const history =
      await getBoosterHistory(
        client,
        interaction.guild.id
      );

    // ========================================================
    // LOAD CUSTOM BOOSTER ROLES
    // ========================================================

    const customRoles =
      await getAllBoosterRoles(
        client,
        interaction.guild.id
      );

    // ========================================================
    // RELOAD HISTORY AFTER RECORDING CURRENT BOOSTERS
    // ========================================================

    const updatedHistory =
      await getBoosterHistory(
        client,
        interaction.guild.id
      );

    const boosters =
      Object.values(
        updatedHistory
      );

    if (
      boosters.length === 0 &&
      currentBoosterIds.size === 0
    ) {

      return interaction.editReply({
        content:
          'No current or past boosters have been recorded yet.',
      });

    }

    // ========================================================
    // MAKE SURE CURRENT ROLE MEMBERS ARE INCLUDED
    // ========================================================

    for (
      const memberId
      of currentBoosterIds
    ) {

      if (
        updatedHistory[memberId]
      ) {
        continue;
      }

      const member =
        interaction.guild.members.cache.get(
          memberId
        );

      if (!member) {
        continue;
      }

      updatedHistory[memberId] = {
        userId:
          member.id,

        username:
          member.user.username,

        displayName:
          member.user.globalName ||
          member.user.username,

        firstBoostAt:
          Date.now(),

        lastBoostAt:
          Date.now(),

        totalBoostSessions:
          1,

        currentlyBoosting:
          true,
      };
    }

    const finalBoosters =
      Object.values(
        updatedHistory
      );

    // ========================================================
    // SORT CURRENT FIRST
    // ========================================================

    finalBoosters.sort(
      (a, b) => {

        const aCurrent =
          currentBoosterIds.has(
            a.userId
          );

        const bCurrent =
          currentBoosterIds.has(
            b.userId
          );

        if (
          aCurrent &&
          !bCurrent
        ) {
          return -1;
        }

        if (
          !aCurrent &&
          bCurrent
        ) {
          return 1;
        }

        return (
          Number(
            b.lastBoostAt || 0
          ) -
          Number(
            a.lastBoostAt || 0
          )
        );
      }
    );

    // ========================================================
    // BUILD LIST
    // ========================================================

    const lines = [];

    for (
      const booster
      of finalBoosters
    ) {

      const member =
        interaction.guild.members.cache.get(
          booster.userId
        );

      const currentlyBoosting =
        currentBoosterIds.has(
          booster.userId
        );

      const status =
        currentlyBoosting
          ? 'Currently Boosting'
          : 'Past Booster';

      const user =
        member
          ? `${member}`
          : `<@${booster.userId}>`;

      // ------------------------------------------------------
      // CUSTOM ROLE
      // ------------------------------------------------------

      let roleText =
        'No custom role';

      if (
        currentlyBoosting &&
        customRoles[
          booster.userId
        ]?.roleId
      ) {

        const role =
          interaction.guild.roles.cache.get(
            customRoles[
              booster.userId
            ].roleId
          );

        if (role) {
          roleText =
            `<@&${role.id}>`;
        }
      }

      lines.push(
        `• ${user} — **${status}** — ${roleText}`
      );
    }

    // ========================================================
    // PAGINATION
    // ========================================================

    const pages = [];

    let currentPage = [];

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

        pages.push(
          currentPage.join('\n')
        );

        currentPage = [];

        currentLength = 0;
      }

      currentPage.push(
        line
      );

      currentLength +=
        line.length +
        1;
    }

    if (
      currentPage.length > 0
    ) {

      pages.push(
        currentPage.join('\n')
      );
    }

    // ========================================================
    // COUNTS
    // ========================================================

    const currentCount =
      finalBoosters.filter(
        booster =>
          currentBoosterIds.has(
            booster.userId
          )
      ).length;

    const pastCount =
      finalBoosters.length -
      currentCount;

    // ========================================================
    // FIRST EMBED
    // ========================================================

    const embed =
      new EmbedBuilder()
        .setTitle(
          '✦ Server Boosters'
        )
        .setDescription(
          pages[0]
        )
        .setColor(
          '#999999'
        )
        .setFooter({
          text:
            `${currentCount} current • ${pastCount} past • ${finalBoosters.length} total`,
        });

    await interaction.editReply({
      embeds: [
        embed,
      ],
    });

    // ========================================================
    // ADDITIONAL PAGES
    // ========================================================

    if (
      pages.length > 1
    ) {

      for (
        let index = 1;
        index < pages.length;
        index++
      ) {

        const pageEmbed =
          new EmbedBuilder()
            .setTitle(
              `✦ Server Boosters — Page ${index + 1}`
            )
            .setDescription(
              pages[index]
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
