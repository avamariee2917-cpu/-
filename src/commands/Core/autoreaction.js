import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from "discord.js";

import {
    loadAutoReactions,
    saveAutoReactions
} from "../../services/autoReactionService.js";

export default {

    data: new SlashCommandBuilder()

        .setName("autoreaction")

        .setDescription(
            "Manage automatic reaction triggers"
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild.toString()
        )

        // ====================================================
        // ADD
        // ====================================================

        .addSubcommand(subcommand =>
            subcommand

                .setName("add")

                .setDescription(
                    "Create a new automatic reaction"
                )

                .addStringOption(option =>
                    option
                        .setName("phrase")
                        .setDescription(
                            "The phrase that triggers the reactions"
                        )
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("emoji1")
                        .setDescription(
                            "First custom emoji ID"
                        )
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("emoji2")
                        .setDescription(
                            "Second custom emoji ID"
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel1")
                        .setDescription(
                            "First channel where it works"
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel2")
                        .setDescription(
                            "Second channel where it works"
                        )
                        .setRequired(false)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel3")
                        .setDescription(
                            "Third channel where it works"
                        )
                        .setRequired(false)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel4")
                        .setDescription(
                            "Fourth channel where it works"
                        )
                        .setRequired(false)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel5")
                        .setDescription(
                            "Fifth channel where it works"
                        )
                        .setRequired(false)
                )
        )

        // ====================================================
        // REMOVE
        // ====================================================

        .addSubcommand(subcommand =>
            subcommand

                .setName("remove")

                .setDescription(
                    "Remove an automatic reaction"
                )

                .addStringOption(option =>
                    option
                        .setName("phrase")
                        .setDescription(
                            "The phrase to remove"
                        )
                        .setRequired(true)
                )
        )

        // ====================================================
        // LIST
        // ====================================================

        .addSubcommand(subcommand =>
            subcommand

                .setName("list")

                .setDescription(
                    "View automatic reactions"
                )
        ),


    async execute(interaction) {

        try {

            const subcommand =
                interaction.options.getSubcommand();


            // ==================================================
            // LIST
            // ==================================================

            if (
                subcommand === "list"
            ) {

                const reactions =
                    loadAutoReactions();


                if (
                    reactions.length === 0
                ) {

                    return interaction.reply({
                        content:
                            "There are currently no automatic reactions configured.",
                        flags:
                            MessageFlags.Ephemeral
                    });

                }


                const lines =
                    reactions.map(
                        reaction => {

                            const channels =
                                Array.isArray(
                                    reaction.channels
                                )
                                    ? reaction.channels
                                        .map(
                                            id =>
                                                `<#${id}>`
                                        )
                                        .join(", ")
                                    : "None";


                            const status =
                                reaction.enabled === false
                                    ? "Disabled"
                                    : "Enabled";


                            return (
                                `**${reaction.phrase}**\n` +
                                `> Status: ${status}\n` +
                                `> Channels: ${channels}\n` +
                                `> Reactions: ${reaction.emojis.join(", ")}`
                            );

                        }
                    );


                return interaction.reply({
                    content:
                        lines.join("\n\n"),
                    flags:
                        MessageFlags.Ephemeral
                });

            }


            // ==================================================
            // ADD
            // ==================================================

            if (
                subcommand === "add"
            ) {

                const phrase =
                    interaction.options
                        .getString("phrase")
                        .trim();


                const emoji1 =
                    interaction.options
                        .getString("emoji1")
                        .trim();


                const emoji2 =
                    interaction.options
                        .getString("emoji2")
                        .trim();


                const channelOptions = [
                    "channel1",
                    "channel2",
                    "channel3",
                    "channel4",
                    "channel5"
                ];


                const channels =
                    channelOptions
                        .map(
                            optionName =>
                                interaction.options
                                    .getChannel(optionName)
                        )
                        .filter(Boolean)
                        .map(
                            channel =>
                                channel.id
                        );


                const reactions =
                    loadAutoReactions();


                const existingIndex =
                    reactions.findIndex(
                        reaction =>
                            String(
                                reaction.phrase
                            )
                            .toLowerCase() ===
                            phrase.toLowerCase()
                    );


                const newReaction = {

                    phrase,

                    emojis: [
                        emoji1,
                        emoji2
                    ],

                    channels,

                    enabled: true

                };


                if (
                    existingIndex !== -1
                ) {

                    reactions[
                        existingIndex
                    ] =
                        newReaction;

                } else {

                    reactions.push(
                        newReaction
                    );

                }


                const saved =
                    saveAutoReactions(
                        reactions
                    );


                if (!saved) {

                    return interaction.reply({
                        content:
                            "I couldn't save the automatic reaction.",
                        flags:
                            MessageFlags.Ephemeral
                    });

                }


                return interaction.reply({
                    content:
                        `Automatic reaction created for **${phrase}**.\n` +
                        `Channels: ${channels.map(id => `<#${id}>`).join(", ")}`,
                    flags:
                        MessageFlags.Ephemeral
                });

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
                        .trim();


                const reactions =
                    loadAutoReactions();


                const filtered =
                    reactions.filter(
                        reaction =>
                            String(
                                reaction.phrase
                            )
                            .toLowerCase() !==
                            phrase.toLowerCase()
                    );


                if (
                    filtered.length ===
                    reactions.length
                ) {

                    return interaction.reply({
                        content:
                            `I couldn't find an automatic reaction for **${phrase}**.`,
                        flags:
                            MessageFlags.Ephemeral
                    });

                }


                saveAutoReactions(
                    filtered
                );


                return interaction.reply({
                    content:
                        `Removed the automatic reaction for **${phrase}**.`,
                    flags:
                        MessageFlags.Ephemeral
                });

            }

        } catch (error) {

            console.error(
                "Auto reaction command error:",
                error
            );


            if (
                interaction.replied ||
                interaction.deferred
            ) {

                return interaction.followUp({
                    content:
                        "Something went wrong while managing the automatic reaction.",
                    flags:
                        MessageFlags.Ephemeral
                });

            }


            return interaction.reply({
                content:
                    "Something went wrong while managing the automatic reaction.",
                flags:
                    MessageFlags.Ephemeral
            });

        }

    }

};
