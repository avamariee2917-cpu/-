import {
    SlashCommandBuilder,
    EmbedBuilder
} from "discord.js";

import {
    getModerationCases
} from "../../utils/moderation.js";


// ============================================================
// STAFF / OWNER ROLES
// ============================================================

const STAFF_ROLE_ID = "1532221464839848016";
const OWNER_ROLE_ID = "1531440557954437273";


// ============================================================
// GRAY EMBED COLOR
// ============================================================

const GRAY = 0x808080;


// ============================================================
// CHECK PERMISSION
// ============================================================

function hasHistoryPermission(member) {

    if (!member) {
        return false;
    }

    return (
        member.roles.cache.has(STAFF_ROLE_ID) ||
        member.roles.cache.has(OWNER_ROLE_ID)
    );

}


// ============================================================
// COMMAND
// ============================================================

export default {

    data: new SlashCommandBuilder()

        .setName("history")

        .setDescription(
            "View a member's moderation history"
        )

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "The member whose history you want to view"
                )
                .setRequired(true)
        ),

    category: "moderation",


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        // ----------------------------------------------------
        // PERMISSION CHECK
        // ----------------------------------------------------

        if (!hasHistoryPermission(interaction.member)) {

            return interaction.reply({
                content:
                    "You do not have permission to use this command.",
                ephemeral: true
            });

        }


        // ----------------------------------------------------
        // GET TARGET
        // ----------------------------------------------------

        const user =
            interaction.options.getUser("user");


        if (!user) {

            return interaction.reply({
                content:
                    "You must select a member.",
                ephemeral: true
            });

        }


        // ----------------------------------------------------
        // GET MODERATION HISTORY
        // ----------------------------------------------------

        const cases =
            await getModerationCases(
                interaction.guild.id,
                {
                    userId: user.id,
                    limit: 100
                }
            );


        // ====================================================
        // NO HISTORY
        // ====================================================

        if (!cases || cases.length === 0) {

            const embed =
                new EmbedBuilder()

                    .setColor(GRAY)

                    .setTitle(
                        `Moderation History — ${user.tag}`
                    )

                    .setDescription(
                        `No violations found for ${user}.\n\n` +
                        `This member has no recorded warnings, kicks, bans, timeouts, or other moderation actions.`
                    )

                    .setThumbnail(
                        user.displayAvatarURL({
                            size: 256
                        })
                    )

                    .setFooter({
                        text: `User ID: ${user.id}`
                    })

                    .setTimestamp();


            return interaction.reply({
                embeds: [embed]
            });

        }


        // ====================================================
        // COUNT ACTIONS
        // ====================================================

        const counts = {

            warnings: 0,
            bans: 0,
            kicks: 0,
            timeouts: 0,
            untimeouts: 0,
            unbans: 0,
            other: 0

        };


        for (const caseData of cases) {

            const action =
                String(
                    caseData.action || ""
                ).toLowerCase();


            if (action.includes("warn")) {

                counts.warnings++;

            } else if (action.includes("ban")) {

                if (action.includes("unban")) {

                    counts.unbans++;

                } else {

                    counts.bans++;

                }

            } else if (action.includes("kick")) {

                counts.kicks++;

            } else if (action.includes("timeout")) {

                if (action.includes("untimeout")) {

                    counts.untimeouts++;

                } else {

                    counts.timeouts++;

                }

            } else {

                counts.other++;

            }

        }


        // ====================================================
        // BUILD HISTORY
        // ====================================================

        let historyText = "";


        for (
            const caseData
            of cases.slice(0, 15)
        ) {

            const caseNumber =
                caseData.caseId
                    ? `#${caseData.caseId}`
                    : "Unknown";


            const action =
                caseData.action ||
                "Moderation Action";


            const reason =
                caseData.reason ||
                "No reason provided";


            const moderator =
                caseData.executor ||
                "Unknown moderator";


            let date = "Unknown date";


            if (caseData.createdAt) {

                const timestamp =
                    Math.floor(
                        new Date(
                            caseData.createdAt
                        ).getTime() / 1000
                    );


                if (!isNaN(timestamp)) {

                    date =
                        `<t:${timestamp}:R>`;

                }

            }


            historyText +=
                `**Case ${caseNumber} — ${action}**\n` +
                `> **Reason:** ${reason}\n` +
                `> **Moderator:** ${moderator}\n` +
                `> **Date:** ${date}\n\n`;

        }


        // ====================================================
        // IF MORE THAN 15 CASES
        // ====================================================

        if (cases.length > 15) {

            historyText +=
                `*Showing the 15 most recent cases out of ${cases.length} total.*`;

        }


        // ====================================================
        // CREATE EMBED
        // ====================================================

        const embed =
            new EmbedBuilder()

                .setColor(GRAY)

                .setTitle(
                    `Moderation History — ${user.tag}`
                )

                .setThumbnail(
                    user.displayAvatarURL({
                        size: 256
                    })
                )

                .addFields(

                    {
                        name: "Total Violations",
                        value:
                            `**${cases.length}**`,
                        inline: true
                    },

                    {
                        name: "Warnings",
                        value:
                            `**${counts.warnings}**`,
                        inline: true
                    },

                    {
                        name: "Bans",
                        value:
                            `**${counts.bans}**`,
                        inline: true
                    },

                    {
                        name: "Kicks",
                        value:
                            `**${counts.kicks}**`,
                        inline: true
                    },

                    {
                        name: "Timeouts",
                        value:
                            `**${counts.timeouts}**`,
                        inline: true
                    }

                )

                .addFields({

                    name: "Moderation History",
                    value:
                        historyText.length > 1024
                            ? historyText.substring(0, 1021) + "..."
                            : historyText

                })

                .setFooter({
                    text: `User ID: ${user.id}`
                })

                .setTimestamp();


        // ====================================================
        // SEND
        // ====================================================

        return interaction.reply({
            embeds: [embed]
        });

    }

};
