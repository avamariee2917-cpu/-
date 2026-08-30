import {
    SlashCommandBuilder,
    EmbedBuilder
} from "discord.js";

import fs from "fs";
import path from "path";


// ============================================================
// AFK DATA FILE
// ============================================================

const afkFile = path.join(
    process.cwd(),
    "data",
    "afk.json"
);


// ============================================================
// LOAD AFK DATA
// ============================================================

function loadAfkData() {

    try {

        if (!fs.existsSync(afkFile)) {

            fs.mkdirSync(
                path.dirname(afkFile),
                {
                    recursive: true
                }
            );

            fs.writeFileSync(
                afkFile,
                "{}"
            );
        }

        return JSON.parse(
            fs.readFileSync(
                afkFile,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "Failed to load AFK data:",
            error
        );

        return {};
    }
}


// ============================================================
// SAVE AFK DATA
// ============================================================

function saveAfkData(data) {

    fs.writeFileSync(
        afkFile,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}


// ============================================================
// COMMAND
// ============================================================

export default {

    data: new SlashCommandBuilder()

        .setName("afk")

        .setDescription(
            "Mark yourself as AFK"
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Why are you going AFK?"
                )
                .setRequired(true)
        ),

    category: "community",


    async execute(interaction) {

        const data =
            loadAfkData();

        const reason =
            interaction.options
                .getString("reason")
                .trim();


        // ----------------------------------------------------
        // SAVE AFK STATUS
        // ----------------------------------------------------

        data[interaction.user.id] = {

            userId:
                interaction.user.id,

            reason,

            timestamp:
                Date.now()

        };


        saveAfkData(data);


        // ----------------------------------------------------
        // AFK EMBED
        // ----------------------------------------------------

        const embed =
            new EmbedBuilder()

                .setDescription(
                    ".⋆♱ You are now marked as AFK."
                )

                .addFields({
                    name: "Reason",
                    value: reason
                })

                .setColor(0x808080);


        return interaction.reply({
            embeds: [embed]
        });

    }

};
