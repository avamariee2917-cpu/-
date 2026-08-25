import {
    SlashCommandBuilder,
    MessageFlags
} from "discord.js";

import {
    loadAutoReactions,
    saveAutoReactions
} from "../../services/autoReactionService.js";

import { createEmbed } from "../../utils/embeds.js";
import { logger } from "../../utils/logger.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";

export default {

    data: new SlashCommandBuilder()
        .setName("autoreaction")
        .setDescription("Manage automatic reactions")

        // ----------------------------------------------------
        // CREATE
        // ----------------------------------------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Create an automatic reaction")
                .addStringOption(option =>
                    option
                        .setName("phrase")
                        .setDescription("The phrase that triggers the reactions")
                        .setRequired(true)
                )
        )

        // ----------------------------------------------------
        // LIST
        // ----------------------------------------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("View all automatic reactions")
        )

        // ----------------------------------------------------
        // DELETE
        // ----------------------------------------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Delete an automatic reaction")
                .addStringOption(option =>
                    option
                        .setName("phrase")
                        .setDescription("The phrase to delete")
                        .setRequired(true)
                )
        ),

    async prefixExecute(interaction) {
        return this.execute(interaction);
    },

    async execute(interaction) {

        const deferSuccess =
            await InteractionHelper.safeDefer(
                interaction,
                {
                    flags: MessageFlags.Ephemeral
                }
            );

        if (!deferSuccess) {
            return;
        }

        try {

            const subcommand =
                interaction.options.getSubcommand();

            const reactions =
                loadAutoReactions();

            // =================================================
            // CREATE
            // =================================================

            if (subcommand === "create") {

                const phrase =
                    interaction.options
                        .getString("phrase")
                        .trim()
                        .toLowerCase();

                if (!phrase) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                "You must provide a phrase."
                        }
                    );

                }

                const alreadyExists =
                    reactions.some(
                        reaction =>
                            reaction.phrase?.toLowerCase() === phrase
                    );

                if (alreadyExists) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                `An auto reaction for **${phrase}** already exists.`
                        }
                    );

                }

                reactions.push({

                    phrase,

                    emojis: [
                        "1532299228452356106",
                        "1532299246278283325"
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
                            `♱ ⋆˙ Auto reaction created for **${phrase}**.\n\n` +
                            `It will react with the two configured emotes in the selected channels.`
                    }
                );

            }

            // =================================================
            // LIST
            // =================================================

            if (subcommand === "list") {

                if (reactions.length === 0) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                "There are no auto reactions configured."
                        }
                    );

                }

                const list =
                    reactions
                        .map(
                            (reaction, index) =>
                                `**${index + 1}.** \`${reaction.phrase}\` — ${
                                    reaction.enabled === false
                                        ? "Disabled"
                                        : "Enabled"
                                }`
                        )
                        .join("\n");

                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title: "Automatic Reactions",
                                description: list
                            })
                        ]
                    }
                );

            }

            // =================================================
            // DELETE
            // =================================================

            if (subcommand === "delete") {

                const phrase =
                    interaction.options
                        .getString("phrase")
                        .trim()
                        .toLowerCase();

                const index =
                    reactions.findIndex(
                        reaction =>
                            reaction.phrase?.toLowerCase() === phrase
                    );

                if (index === -1) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            content:
                                `No auto reaction was found for **${phrase}**.`
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
                            `♱ ⋆˙ Auto reaction **${phrase}** has been deleted.`
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
