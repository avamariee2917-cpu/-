import { SlashCommandBuilder, MessageFlags } from "discord.js";

import {
    loadAutoReactions,
    saveAutoReactions
} from "../../services/autoReactionService.js";

import { logger } from "../../utils/logger.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";


// ============================================================
// AUTO REACTION COMMAND
// ============================================================

export default {

    data: new SlashCommandBuilder()

        .setName("autoreaction")

        .setDescription(
            "Manage automatic reactions for messages."
        )


        // ----------------------------------------------------
        // ADD
        // ----------------------------------------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription(
                    "Create an automatic reaction phrase."
                )

                .addStringOption(option =>
                    option
                        .setName("phrase")
                        .setDescription(
                            "The phrase that will trigger the reactions."
                        )
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("emoji1")
                        .setDescription(
                            "First custom emoji ID."
                        )
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("emoji2")
                        .setDescription(
                            "Second custom emoji ID."
                        )
                        .setRequired(true)
                )
        )


        // ----------------------------------------------------
        // REMOVE
        // ----------------------------------------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription(
                    "Remove an automatic reaction phrase."
                )

                .addStringOption(option =>
                    option
                        .setName("phrase")
                        .setDescription(
                            "The phrase to remove."
                        )
                        .setRequired(true)
                )
        )


        // ----------------------------------------------------
        // LIST
        // ----------------------------------------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription(
                    "View all automatic reaction phrases."
                )
        ),


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        const deferSuccess =
            await InteractionHelper.safeDefer(
                interaction
            );


        if (!deferSuccess) {

            logger.warn(
                "AutoReaction interaction defer failed."
            );

            return;

        }


        try {

            const subcommand =
                interaction.options.getSubcommand();


            const reactions =
                loadAutoReactions();


            // ==================================================
            // ADD
            // ==================================================

            if (
                subcommand === "add"
            ) {

                const phrase =
                    interaction.options
                        .getString("phrase")
                        .trim()
                        .toLowerCase();


                const emoji1 =
                    interaction.options
                        .getString("emoji1")
                        .trim();


                const emoji2 =
                    interaction.options
                        .getString("emoji2")
                        .trim();


                if (!phrase) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                "You must provide a phrase."
                        }
                    );

                }


                // ----------------------------------------------
                // CHECK FOR EXISTING PHRASE
                // ----------------------------------------------

                const existing =
                    reactions.find(
                        reaction =>
                            reaction.phrase
                                ?.toLowerCase() ===
                            phrase
                    );


                if (existing) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                `❌ An auto reaction for **${phrase}** already exists.`
                        }
                    );

                }


                // ----------------------------------------------
                // CREATE REACTION
                // ----------------------------------------------

                reactions.push({

                    phrase,

                    emojis: [
                        emoji1,
                        emoji2
                    ],

                    channels: [
                        "1541254619999637624",
                        "1541678571091660911",
                        "1541679032234680350",
                        "1541678933118816267",
                        "1541679251940712498"
                    ],

                    enabled: true

                });


                saveAutoReactions(
                    reactions
                );


                return InteractionHelper.safeEditReply(
                    interaction,
                    {

                        content:
                            `♱ ⋆˙ Auto reaction created!\n\n` +
                            `> **Phrase:** \`${phrase}\`\n` +
                            `> **Emoji 1:** ${emoji1}\n` +
                            `> **Emoji 2:** ${emoji2}\n\n` +
                            `The reaction will work in the configured channels.`

                    }
                );

            }


            // ==================================================
            // REMOVE
            // ==================================================

            if (
                subcommand === "remove"
            ) {

                const phrase =
                    interaction.options
                        .getString("phrase")
                        .trim()
                        .toLowerCase();


                const index =
                    reactions.findIndex(
                        reaction =>
                            reaction.phrase
                                ?.toLowerCase() ===
                            phrase
                    );


                if (
                    index === -1
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {

                            content:
                                `I couldn't find an auto reaction for **${phrase}**.`

                        }
                    );

                }


                reactions.splice(
                    index,
                    1
                );


                saveAutoReactions(
                    reactions
                );


                return InteractionHelper.safeEditReply(
                    interaction,
                    {

                        content:
                            `♱ ⋆˙ Removed the auto reaction for **${phrase}**.`

                    }
                );

            }


            // ==================================================
            // LIST
            // ==================================================

            if (
                subcommand === "list"
            ) {

                if (
                    reactions.length === 0
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {

                            content:
                                "There are currently no automatic reactions."

                        }
                    );

                }


                const list =
                    reactions
                        .map(
                            (reaction, index) =>
                                `**${index + 1}.** \`${reaction.phrase}\` → ${reaction.emojis.join(" ")}`
                        )
                        .join("\n");


                return InteractionHelper.safeEditReply(
                    interaction,
                    {

                        content:
                            `♱ ⋆˙ **Automatic Reactions**\n\n${list}`

                    }
                );

            }

        } catch (error) {

            logger.error(
                "Auto reaction command error:",
                error
            );


            return InteractionHelper.safeEditReply(
                interaction,
                {

                    content:
                        "An error occurred while managing the auto reaction."

                }
            );

        }

    }

};
