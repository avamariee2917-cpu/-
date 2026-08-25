import {
    SlashCommandBuilder,
    MessageFlags,
} from 'discord.js';

import fs from 'fs';
import path from 'path';

import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';


// ============================================================
// FILE
// ============================================================

const DATA_DIRECTORY = path.join(
    process.cwd(),
    'data'
);

const AUTO_REACTION_FILE = path.join(
    DATA_DIRECTORY,
    'autoReactions.json'
);


// ============================================================
// ALLOWED CHANNELS
// ============================================================

const AUTO_REACTION_CHANNEL_IDS = new Set([
    '1541254619999637624',
    '1541678571091660911',
    '1541679032234680350',
    '1541678933118816267',
    '1541679251940712498',
]);


// ============================================================
// DEFAULT EMOJIS
// ============================================================

const DEFAULT_EMOJIS = [
    '1532299228452356106',
    '1532299246278283325',
];


// ============================================================
// LOAD DATA
// ============================================================

function loadAutoReactions() {

    try {

        if (!fs.existsSync(DATA_DIRECTORY)) {

            fs.mkdirSync(
                DATA_DIRECTORY,
                {
                    recursive: true,
                }
            );

        }


        if (!fs.existsSync(AUTO_REACTION_FILE)) {

            fs.writeFileSync(
                AUTO_REACTION_FILE,
                JSON.stringify(
                    {},
                    null,
                    2
                ),
                'utf8'
            );

        }


        const raw =
            fs.readFileSync(
                AUTO_REACTION_FILE,
                'utf8'
            );


        if (!raw.trim()) {
            return {};
        }


        const data =
            JSON.parse(raw);


        if (
            typeof data !== 'object' ||
            data === null ||
            Array.isArray(data)
        ) {

            return {};

        }


        return data;

    } catch (error) {

        logger.error(
            'Failed to load auto reactions:',
            error
        );

        return {};

    }

}


// ============================================================
// SAVE DATA
// ============================================================

function saveAutoReactions(data) {

    try {

        if (!fs.existsSync(DATA_DIRECTORY)) {

            fs.mkdirSync(
                DATA_DIRECTORY,
                {
                    recursive: true,
                }
            );

        }


        fs.writeFileSync(
            AUTO_REACTION_FILE,
            JSON.stringify(
                data,
                null,
                2
            ),
            'utf8'
        );


        return true;

    } catch (error) {

        logger.error(
            'Failed to save auto reactions:',
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

        .setName('autoreact')

        .setDescription(
            'Manage automatic reactions'
        )

        .setDefaultMemberPermissions(
            '8'
        )

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('add')

                    .setDescription(
                        'Create an automatic reaction trigger'
                    )

                    .addStringOption(
                        option =>
                            option
                                .setName('trigger')
                                .setDescription(
                                    'The word or phrase that should trigger the reactions'
                                )
                                .setRequired(true)
                    )

        )

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('remove')

                    .setDescription(
                        'Remove an automatic reaction trigger'
                    )

                    .addStringOption(
                        option =>
                            option
                                .setName('trigger')
                                .setDescription(
                                    'The word or phrase to remove'
                                )
                                .setRequired(true)
                    )

        )

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('list')

                    .setDescription(
                        'Show all automatic reaction triggers'
                    )
        ),


    // ========================================================
    // PREFIX COMMAND
    // ========================================================

    async prefixExecute(interaction) {

        return this.execute(interaction);

    },


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        const deferSuccess =
            await InteractionHelper.safeDefer(
                interaction,
                {
                    ephemeral: true,
                }
            );


        if (!deferSuccess) {

            logger.warn(
                'AutoReact interaction defer failed',
                {
                    userId:
                        interaction.user.id,

                    guildId:
                        interaction.guildId,
                }
            );

            return;

        }


        try {

            if (!interaction.guild) {

                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title: 'Auto Reaction',
                                description:
                                    'This command can only be used inside a server.',
                                color: 'error',
                            }),
                        ],
                    }
                );

            }


            const subcommand =
                interaction.options.getSubcommand();


            const reactions =
                loadAutoReactions();


            // ==================================================
            // ADD
            // ==================================================

            if (
                subcommand === 'add'
            ) {

                const trigger =
                    interaction.options
                        .getString(
                            'trigger',
                            true
                        )
                        .trim()
                        .toLowerCase();


                if (!trigger) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title: 'Auto Reaction',
                                    description:
                                        'You need to provide a trigger word or phrase.',
                                    color: 'error',
                                }),
                            ],
                        }
                    );

                }


                reactions[trigger] = {

                    emojis:
                        DEFAULT_EMOJIS,

                    channels:
                        Array.from(
                            AUTO_REACTION_CHANNEL_IDS
                        ),

                    createdBy:
                        interaction.user.id,

                    createdAt:
                        new Date().toISOString(),

                };


                const saved =
                    saveAutoReactions(
                        reactions
                    );


                if (!saved) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title: 'Auto Reaction',
                                    description:
                                        'I could not save the automatic reaction.',
                                    color: 'error',
                                }),
                            ],
                        }
                    );

                }


                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title: 'Auto Reaction Created',
                                description:
                                    `The trigger **${trigger}** has been created.\n\n` +
                                    `It will react with both selected emotes in the configured channels.`,
                            }),
                        ],
                    }
                );

            }


            // ==================================================
            // REMOVE
            // ==================================================

            if (
                subcommand === 'remove'
            ) {

                const trigger =
                    interaction.options
                        .getString(
                            'trigger',
                            true
                        )
                        .trim()
                        .toLowerCase();


                if (
                    !reactions[trigger]
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title: 'Auto Reaction',
                                    description:
                                        `There is no automatic reaction for **${trigger}**.`,
                                    color: 'error',
                                }),
                            ],
                        }
                    );

                }


                delete reactions[trigger];


                const saved =
                    saveAutoReactions(
                        reactions
                    );


                if (!saved) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title: 'Auto Reaction',
                                    description:
                                        'I could not save the changes.',
                                    color: 'error',
                                }),
                            ],
                        }
                    );

                }


                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title: 'Auto Reaction Removed',
                                description:
                                    `The automatic reaction **${trigger}** has been removed.`,
                            }),
                        ],
                    }
                );

            }


            // ==================================================
            // LIST
            // ==================================================

            if (
                subcommand === 'list'
            ) {

                const triggers =
                    Object.keys(
                        reactions
                    );


                if (
                    triggers.length === 0
                ) {

                    return InteractionHelper.safeEditReply(
                        interaction,
                        {
                            embeds: [
                                createEmbed({
                                    title: 'Auto Reactions',
                                    description:
                                        'There are currently no automatic reactions configured.',
                                }),
                            ],
                        }
                    );

                }


                const description =
                    triggers
                        .map(
                            trigger =>
                                `> **${trigger}**`
                        )
                        .join('\n');


                return InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title: 'Auto Reactions',
                                description,
                            }),
                        ],
                    }
                );

            }

        } catch (error) {

            logger.error(
                'AutoReact command error:',
                error
            );


            try {

                await InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [
                            createEmbed({
                                title: 'System Error',
                                description:
                                    'Something went wrong while managing the automatic reactions.',
                                color: 'error',
                            }),
                        ],
                    }
                );

            } catch (replyError) {

                logger.error(
                    'Failed to send AutoReact error:',
                    replyError
                );

            }

        }

    },

};
