import { Events } from "discord.js";
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

    const text = String(emoji).trim();

    const match = text.match(
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

        const reactions = loadNameReactions();

        for (const name in reactions) {

            const reaction = reactions[name];

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
                nameRegex.test(message.content);

            let memberWasMentioned = false;

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

            for (const emoji of reaction.emojis) {

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
// UPLOADER AUTO MESSAGE
// ============================================================

async function handleUploaderMessage(message) {

    try {

        // Make absolutely sure this is one
        // of the uploader channels.

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

        // ----------------------------------------------------
        // FETCH RECENT MESSAGES
        // ----------------------------------------------------

        const messages =
            await message.channel.messages.fetch({
                limit: 100
            });

        // ----------------------------------------------------
        // FIND ALL OLD UPLOADER MESSAGES
        // ----------------------------------------------------

        const oldUploaderMessages =
            messages.filter(
                msg =>
                    msg.author.id ===
                        message.client.user.id &&
                    msg.content ===
                        UPLOADER_MESSAGE
            );

        // ----------------------------------------------------
        // DELETE OLD UPLOADER MESSAGES
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // SEND FRESH UPLOADER MESSAGE
        // ----------------------------------------------------

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
