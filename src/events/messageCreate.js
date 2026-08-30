import {
    Events,
    EmbedBuilder
} from "discord.js";

import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";
import { handleDivAutoresponder } from "../services/divAutoresponder.js";


// ============================================================
// NAME REACTIONS
// ============================================================

const nameReactionFile = path.join(
    process.cwd(),
    "data",
    "nameReactions.json"
);


// ============================================================
// AFK
// ============================================================

const afkFile = path.join(
    process.cwd(),
    "data",
    "afk.json"
);


// ============================================================
// UPLOADER CHANNELS
// ============================================================

const UPLOADER_CHANNEL_IDS = new Set([
    "1532187710108860587",
    "1532187753557524581",
    "1531889348323180586",
    "1531889304245243904"
]);


// ============================================================
// UPLOADER MESSAGE
// ============================================================

const UPLOADER_MESSAGE =
`·:*¨༺ ♱✮♱ ༻¨*:·
> <:bling:1532144020921389176> ﹒  **become a uploader**
> <:bling:1532144020921389176> ﹒ **open a ticket here *:* <#1532195996052754523>**
·:*¨༺ ♱✮♱ ༻¨*:·`;


// ============================================================
// LOAD NAME REACTIONS
// ============================================================

function loadNameReactions() {

    try {

        if (!fs.existsSync(nameReactionFile)) {

            fs.mkdirSync(
                path.dirname(nameReactionFile),
                {
                    recursive: true
                }
            );

            fs.writeFileSync(
                nameReactionFile,
                "{}"
            );
        }

        return JSON.parse(
            fs.readFileSync(
                nameReactionFile,
                "utf8"
            )
        );

    } catch (error) {

        logger.error(
            "Failed loading name reactions:",
            error
        );

        return {};

    }
}


// ============================================================
// GET EMOJI ID
// ============================================================

function getEmojiId(emoji) {

    if (!emoji) {
        return null;
    }

    const text =
        String(emoji).trim();

    const match =
        text.match(
            /<a?:\w+:(\d+)>/
        );

    if (match) {
        return match[1];
    }

    if (/^\d+$/.test(text)) {
        return text;
    }

    return null;
}


// ============================================================
// NAME REACTION HANDLER
// ============================================================

async function handleNameReact(message) {

    try {

        const reactions =
            loadNameReactions();

        for (const name in reactions) {

            const reaction =
                reactions[name];

            if (
                !reaction ||
                !Array.isArray(reaction.emojis) ||
                reaction.emojis.length === 0
            ) {
                continue;
            }

            const escapedName =
                name.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

            const nameRegex =
                new RegExp(
                    `(^|\\s)${escapedName}(?=\\s|$|[.,!?;:'"()\\[\\]{}])`,
                    "i"
                );

            const nameWasUsed =
                nameRegex.test(
                    message.content
                );

            let memberWasMentioned =
                false;

            if (reaction.createdBy) {

                memberWasMentioned =
                    message.mentions.users.has(
                        reaction.createdBy
                    );
            }

            if (
                !nameWasUsed &&
                !memberWasMentioned
            ) {
                continue;
            }

            for (
                const emoji
                of reaction.emojis
            ) {

                const emojiId =
                    getEmojiId(emoji);

                if (!emojiId) {
                    continue;
                }

                try {

                    await message.react(
                        emojiId
                    );

                } catch (error) {

                    logger.warn(
                        `Failed to react with emoji ${emojiId}:`,
                        error
                    );

                }
            }

            break;
        }

    } catch (error) {

        logger.error(
            "Name reaction error:",
            error
        );

    }
}


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

        logger.error(
            "Failed loading AFK data:",
            error
        );

        return {};

    }
}


// ============================================================
// SAVE AFK DATA
// ============================================================

function saveAfkData(data) {

    try {

        fs.writeFileSync(
            afkFile,
            JSON.stringify(
                data,
                null,
                4
            )
        );

    } catch (error) {

        logger.error(
            "Failed saving AFK data:",
            error
        );

    }
}


// ============================================================
// FORMAT AFK TIME
// ============================================================

function formatAfkTime(milliseconds) {

    let seconds =
        Math.floor(
            milliseconds / 1000
        );

    const days =
        Math.floor(
            seconds / 86400
        );

    seconds %= 86400;

    const hours =
        Math.floor(
            seconds / 3600
        );

    seconds %= 3600;

    const minutes =
        Math.floor(
            seconds / 60
        );

    seconds %= 60;


    const parts = [];


    if (days > 0) {
        parts.push(
            `${days} ${days === 1 ? "day" : "days"}`
        );
    }

    if (hours > 0) {
        parts.push(
            `${hours} ${hours === 1 ? "hour" : "hours"}`
        );
    }

    if (minutes > 0) {
        parts.push(
            `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
        );
    }

    if (
        seconds > 0 &&
        parts.length === 0
    ) {
        parts.push(
            `${seconds} ${seconds === 1 ? "second" : "seconds"}`
        );
    }


    if (parts.length === 0) {
        return "less than a minute";
    }


    return parts.join(", ");
}


// ============================================================
// AFK RETURN HANDLER
// ============================================================

async function handleAfkReturn(message) {

    try {

        const data =
            loadAfkData();

        const afk =
            data[message.author.id];


        if (!afk) {
            return;
        }


        const duration =
            Date.now() - afk.timestamp;


        delete data[message.author.id];

        saveAfkData(data);


        const embed =
            new EmbedBuilder()

                .setDescription(
                    `.⋆♱ Welcome back, <@${message.author.id}>.`
                )

                .addFields(
                    {
                        name: "AFK Duration",
                        value: formatAfkTime(duration),
                        inline: true
                    },
                    {
                        name: "Reason",
                        value: afk.reason,
                        inline: true
                    }
                )

                .setColor(0x808080);


        await message.channel.send({
            embeds: [embed]
        });


    } catch (error) {

        logger.error(
            "AFK return error:",
            error
        );

    }
}


// ============================================================
// AFK MENTION HANDLER
// ============================================================

async function handleAfkMention(message) {

    try {

        const data =
            loadAfkData();


        if (
            !message.mentions ||
            message.mentions.users.size === 0
        ) {
            return;
        }


        for (
            const mentionedUser
            of message.mentions.users.values()
        ) {

            const afk =
                data[mentionedUser.id];


            if (!afk) {
                continue;
            }


            const duration =
                Date.now() - afk.timestamp;


            const embed =
                new EmbedBuilder()

                    .setDescription(
                        `.⋆♱ <@${mentionedUser.id}> is currently AFK.`
                    )

                    .addFields(
                        {
                            name: "Reason",
                            value: afk.reason,
                            inline: true
                        },
                        {
                            name: "AFK For",
                            value: formatAfkTime(duration),
                            inline: true
                        }
                    )

                    .setColor(0x808080);


            await message.channel.send({
                embeds: [embed]
            });

        }

    } catch (error) {

        logger.error(
            "AFK mention error:",
            error
        );

    }
}


// ============================================================
// UPLOADER AUTO MESSAGE
// ============================================================

async function handleUploaderMessage(message) {

    try {

        if (
            !UPLOADER_CHANNEL_IDS.has(
                message.channel.id
            )
        ) {
            return;
        }

        logger.info(
            `Uploader channel detected: ${message.channel.id}`
        );


        const messages =
            await message.channel.messages.fetch({
                limit: 100
            });


        const oldUploaderMessages =
            messages.filter(
                msg =>
                    msg.author.id ===
                        message.client.user.id &&
                    msg.content ===
                        UPLOADER_MESSAGE
            );


        for (
            const oldMessage
            of oldUploaderMessages.values()
        ) {

            try {

                await oldMessage.delete();

                logger.info(
                    `Deleted old uploader message in ${message.channel.id}`
                );

            } catch (error) {

                logger.error(
                    "FAILED TO DELETE OLD UPLOADER MESSAGE:",
                    error
                );

            }
        }


        const newMessage =
            await message.channel.send({
                content: UPLOADER_MESSAGE
            });


        logger.info(
            `NEW UPLOADER MESSAGE SENT: ${newMessage.id}`
        );


    } catch (error) {

        logger.error(
            "UPLOADER AUTO MESSAGE FAILED:",
            error
        );

    }
}


// ============================================================
// MESSAGE CREATE
// ============================================================

export default {

    name: Events.MessageCreate,

    async execute(message, client) {

        try {

            // ------------------------------------------------
            // IGNORE BOTS
            // ------------------------------------------------

            if (message.author.bot) {
                return;
            }


            // ------------------------------------------------
            // IGNORE DMs
            // ------------------------------------------------

            if (!message.guild) {
                return;
            }


            logger.debug(
                `Message received from ${message.author.tag} in channel ${message.channel.id}: ${message.content}`
            );


            // =================================================
            // AFK RETURN
            // =================================================

            await handleAfkReturn(
                message
            );


            // =================================================
            // AFK MENTIONS
            // =================================================

            await handleAfkMention(
                message
            );


            // =================================================
            // UPLOADER AUTO MESSAGE
            // =================================================

            await handleUploaderMessage(
                message
            );


            // =================================================
            // .DIV AUTORESPONDER
            // =================================================

            await handleDivAutoresponder(
                message
            );


            // =================================================
            // NAME REACTIONS
            // =================================================

            await handleNameReact(
                message
            );


        } catch (error) {

            logger.error(
                "Error in messageCreate event:",
                error
            );

        }

    }

};
