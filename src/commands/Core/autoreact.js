import {
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";

import fs from "fs";
import path from "path";

import { createEmbed } from "../../utils/embeds.js";
import { logger } from "../../utils/logger.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";


// ============================================================
// FILE
// ============================================================

const AUTO_REACTION_FILE = path.join(
    process.cwd(),
    "data",
    "autoReactions.json"
);


// ============================================================
// SETTINGS
// ============================================================

const AUTO_REACTION_EMOJIS = [
    "1532299228452356106",
    "1532299246278283325"
];


const AUTO_REACTION_CHANNELS = [
    "1541254619999637624",
    "1541678571091660911",
    "1541679032234680350",
    "1541678933118816267",
    "1541679251940712498"
];


// ============================================================
// LOAD
// ============================================================

function loadAutoReactions() {

    try {

        if (
            !fs.existsSync(
                AUTO_REACTION_FILE
            )
        ) {

            return [];

        }


        const rawData =
            fs.readFileSync(
                AUTO_REACTION_FILE,
                "utf8"
            );


        if (
            !rawData.trim()
        ) {

            return [];

        }


        const data =
            JSON.parse(
                rawData
            );


        if (
            !Array.isArray(data)
        ) {

            return [];

        }


        return data;

    } catch (error) {

        logger.error(
            "Failed to load auto reactions:",
            error
        );

        return [];

    }

}


// ============================================================
// SAVE
// ============================================================

function saveAutoReactions(
    reactions
) {

    try {

        const directory =
            path.dirname(
                AUTO_REACTION_FILE
            );


        if (
            !fs.existsSync(directory)
        ) {

            fs.mkdirSync(
                directory,
                {
                    recursive: true
                }
            );

        }


        fs.writeFileSync(
            AUTO_REACTION_FILE,
            JSON.stringify(
                reactions,
                null,
                2
            ),
            "utf8"
        );


        return true;

    } catch (error) {

        logger.error(
            "Failed to save auto reactions:",
            error
        );

        return false;

    }

}


// ============================================================
// COMMAND
// ============================================================

export default {

    data: new SlashCommandBuilder()

        .setName("autoreact")

        .setDescription(
            "Manage automatic reactions"
        )

        .setDefaultMemberPermissions(
            "8"
        )


        // ----------------------------------------------------
        // ADD
        // ----------------------------------------------------

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName("add")

                    .setDescription(
                        "Create an automatic reaction"
                    )

                    .addStringOption(
                        option =>
                            option

                                .setName("trigger")

                                .setDescription(
                                    "The word or phrase that triggers the reactions"
                                )

                                .setRequired(true)
                    )
        )


        // ----------------------------------------------------
        // REMOVE
        // ----------------------------------------------------

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName("remove")

                    .setDescription(
                        "Remove an automatic reaction"
                    )

                    .addStringOption(
                        option =>
                            option

                                .setName("trigger")

                                .setDescription(
                                    "The trigger to remove"
                                )

                                .setRequired(true)
                    )
        )


        // ----------------------------------------------------
        // LIST
        // ----------------------------------------------------

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName("list")

                    .setDescription(
                        "List automatic reactions"
                    )
        ),


    // ========================================================
    // PREFIX
    // ========================================================

    async prefixExecute(
        interaction
    ) {

        return this.execute(
            interaction
        );

    },


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(
        interaction
    ) {

        const deferSuccess =
            await InteractionHelper.safeDefer(
                interaction,
                {
                    ephemeral: true
                }
            );


        if (
            !deferSuccess
        ) {

            logger.warn(
                "AutoReact interaction defer failed"
            );

            return;

        }


        try {

            // ------------------------------------------------
            // SERVER CHECK
            // ------------------------------------------------

            if (
                !interaction.guild
            ) {

                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title:
                                    "Auto Reaction",

                                description:
                                    "This command can only be used inside a server.",

                                color:
                                    "error"
                            })
                        ]
                    }
                );

            }


            const subcommand =
                interaction.options.getSubcommand();


            const reactions =
                loadAutoReactions();


            // =================================================
            // ADD
            // =================================================

            if (
                subcommand === "add"
            ) {

                const trigger =
                    interaction.options
                        .getString(
                            "trigger",
                            true
                        )
                        .trim()
                        .toLowerCase();


                if (
                    !trigger
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title:
                                        "Auto Reaction",

                                    description:
                                        "You must provide a trigger phrase.",

                                    color:
                                        "error"
                                })
                            ]
                        }
                    );

                }


                // ---------------------------------------------
                // CHECK DUPLICATE
                // ---------------------------------------------

                const existing =
                    reactions.find(
                        reaction =>
                            String(
                                reaction?.phrase || ""
                            )
                            .toLowerCase() ===
                            trigger
                    );


                if (
                    existing
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title:
                                        "Auto Reaction",

                                    description:
                                        `The trigger **${trigger}** already exists.`,

                                    color:
                                        "error"
                                })
                            ]
                        }
                    );

                }


                // ---------------------------------------------
                // CREATE
                // ---------------------------------------------

                reactions.push({

                    phrase:
                        trigger,

                    emojis:
                        AUTO_REACTION_EMOJIS,

                    channels:
                        AUTO_REACTION_CHANNELS,

                    enabled:
                        true,

                    createdBy:
                        interaction.user.id,

                    createdAt:
                        new Date().toISOString()

                });


                const saved =
                    saveAutoReactions(
                        reactions
                    );


                if (
                    !saved
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title:
                                        "Auto Reaction",

                                    description:
                                        "I could not save the automatic reaction.",

                                    color:
                                        "error"
                                })
                            ]
                        }
                    );

                }


                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title:
                                    "Auto Reaction Created",

                                description:
                                    `The trigger **${trigger}** is now active.\n\n` +
                                    "The bot will react with both selected emotes when the phrase is used in the configured channels."
                            })
                        ]
                    }
                );

            }


            // =================================================
            // REMOVE
            // =================================================

            if (
                subcommand === "remove"
            ) {

                const trigger =
                    interaction.options
                        .getString(
                            "trigger",
                            true
                        )
                        .trim()
                        .toLowerCase();


                const index =
                    reactions.findIndex(
                        reaction =>
                            String(
                                reaction?.phrase || ""
                            )
                            .toLowerCase() ===
                            trigger
                    );


                if (
                    index === -1
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title:
                                        "Auto Reaction",

                                    description:
                                        `No automatic reaction exists for **${trigger}**.`,

                                    color:
                                        "error"
                                })
                            ]
                        }
                    );

                }


                reactions.splice(
                    index,
                    1
                );


                const saved =
                    saveAutoReactions(
                        reactions
                    );


                if (
                    !saved
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title:
                                        "Auto Reaction",

                                    description:
                                        "I could not save the changes.",

                                    color:
                                        "error"
                                })
                            ]
                        }
                    );

                }


                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title:
                                    "Auto Reaction Removed",

                                description:
                                    `The trigger **${trigger}** has been removed.`
                            })
                        ]
                    }
                );

            }


            // =================================================
            // LIST
            // =================================================

            if (
                subcommand === "list"
            ) {

                if (
                    reactions.length === 0
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title:
                                        "Auto Reactions",

                                    description:
                                        "There are currently no automatic reactions configured."
                                })
                            ]
                        }
                    );

                }


                const list =
                    reactions
                        .map(
                            reaction =>
                                `> **${reaction.phrase}**`
                        )
                        .join("\n");


                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title:
                                    "Auto Reactions",

                                description:
                                    list
                            })
                        ]
                    }
                );

            }

        } catch (error) {

            logger.error(
                "AutoReact command error:",
                error
            );


            try {

                await InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title:
                                    "System Error",

                                description:
                                    "Something went wrong while managing automatic reactions.",

                                color:
                                    "error"
                            })
                        ]
                    }
                );

            } catch (replyError) {

                logger.error(
                    "Failed to send AutoReact error reply:",
                    replyError
                );

            }

        }

    }

};
