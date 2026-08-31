import {
    SlashCommandBuilder,
    EmbedBuilder
} from "discord.js";

import fs from "fs";
import path from "path";


// ============================================================
// TIMEZONE DATA FILE
// ============================================================

const timezoneFile = path.join(
    process.cwd(),
    "data",
    "timezones.json"
);


// ============================================================
// GRAY EMBED COLOR
// ============================================================

const GRAY = 0x808080;


// ============================================================
// LOAD TIMEZONE DATA
// ============================================================

function loadTimezones() {

    try {

        if (!fs.existsSync(timezoneFile)) {

            fs.mkdirSync(
                path.dirname(timezoneFile),
                {
                    recursive: true
                }
            );

            fs.writeFileSync(
                timezoneFile,
                "{}"
            );

        }

        return JSON.parse(
            fs.readFileSync(
                timezoneFile,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "Failed to load timezone data:",
            error
        );

        return {};

    }

}


// ============================================================
// SAVE TIMEZONE DATA
// ============================================================

function saveTimezones(data) {

    fs.writeFileSync(
        timezoneFile,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}


// ============================================================
// CHECK IF TIMEZONE IS VALID
// ============================================================

function isValidTimezone(timezone) {

    try {

        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: timezone
            }
        );

        return true;

    } catch {

        return false;

    }

}


// ============================================================
// FORMAT TIMEZONE NAME
// ============================================================

function formatTimezone(timezone) {

    return timezone
        .replace(/_/g, " ")
        .replace(/\//g, " / ");

}


// ============================================================
// COMMAND
// ============================================================

export default {

    data: new SlashCommandBuilder()

        .setName("tz")

        .setDescription(
            "View or set your timezone"
        )

        // ====================================================
        // /tz
        // ====================================================

        .addSubcommand(subcommand =>

            subcommand

                .setName("view")

                .setDescription(
                    "View your current timezone and time"
                )

        )

        // ====================================================
        // /tz set
        // ====================================================

        .addSubcommand(subcommand =>

            subcommand

                .setName("set")

                .setDescription(
                    "Set your timezone"
                )

                .addStringOption(option =>

                    option

                        .setName("timezone")

                        .setDescription(
                            "Example: America/New_York"
                        )

                        .setRequired(true)

                )

        ),

    category: "community",


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        const data =
            loadTimezones();

        const action =
            interaction.options.getSubcommand();


        // ====================================================
        // SET TIMEZONE
        // ====================================================

        if (action === "set") {

            const timezone =
                interaction.options
                    .getString("timezone")
                    .trim();


            // ------------------------------------------------
            // CHECK TIMEZONE
            // ------------------------------------------------

            if (!isValidTimezone(timezone)) {

                return interaction.reply({

                    content:
                        "That is not a valid timezone.\n\n" +
                        "Use an IANA timezone such as `America/New_York`, `America/Chicago`, `America/Denver`, or `America/Los_Angeles`.",

                    ephemeral: true

                });

            }


            // ------------------------------------------------
            // SAVE TIMEZONE
            // ------------------------------------------------

            data[interaction.user.id] = {

                timezone,

                updatedAt:
                    Date.now()

            };


            saveTimezones(data);


            // ------------------------------------------------
            // CONFIRMATION EMBED
            // ------------------------------------------------

            const embed =
                new EmbedBuilder()

                    .setColor(GRAY)

                    .setTitle(
                        "⋆♱ Timezone Updated"
                    )

                    .setDescription(
                        `Your timezone has been set to **${formatTimezone(timezone)}**.`
                    )

                    .setFooter({
                        text:
                            "Only your timezone setting is stored."
                    })

                    .setTimestamp();


            return interaction.reply({

                embeds: [embed]

            });

        }


        // ====================================================
        // VIEW TIMEZONE
        // ====================================================

        const savedTimezone =
            data[interaction.user.id]?.timezone;


        // ----------------------------------------------------
        // NO TIMEZONE SET
        // ----------------------------------------------------

        if (!savedTimezone) {

            const embed =
                new EmbedBuilder()

                    .setColor(GRAY)

                    .setTitle(
                        "⋆♱ Timezone"
                    )

                    .setDescription(
                        "You haven't set a timezone yet.\n\n" +
                        "Use:\n" +
                        "`/tz set timezone:America/New_York`\n\n" +
                        "You can replace `America/New_York` with your own IANA timezone."
                    )

                    .setFooter({
                        text:
                            "Your timezone is only shown when you use this command."
                    });

            return interaction.reply({

                embeds: [embed]

            });

        }


        // ====================================================
        // CURRENT TIME
        // ====================================================

        const now =
            new Date();


        // ----------------------------------------------------
        // GET DATE
        // ----------------------------------------------------

        const dateFormatter =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone: savedTimezone,
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }
            );


        const date =
            dateFormatter.format(now);


        // ----------------------------------------------------
        // GET CLOCK
        // ----------------------------------------------------

        const timeFormatter =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone: savedTimezone,
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }
            );


        const time =
            timeFormatter.format(now);


        // ====================================================
        // TIMEZONE EMBED
        // ====================================================

        const embed =
            new EmbedBuilder()

                .setColor(GRAY)

                .setTitle(
                    "⋆♱ Timezone"
                )

                .addFields(

                    {
                        name: "Timezone",
                        value:
                            `\`${savedTimezone}\``,
                        inline: false
                    },

                    {
                        name: "Date",
                        value:
                            `**${date}**`,
                        inline: false
                    },

                    {
                        name: "Current Time",
                        value:
                            `**${time}**`,
                        inline: false
                    }

                )

                .setFooter({
                    text:
                        "Only your timezone setting is stored."
                })

                .setTimestamp();


        return interaction.reply({

            embeds: [embed]

        });

    }

};
