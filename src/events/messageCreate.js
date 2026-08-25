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
// UPLOADER AUTO-MESSAGE SETTINGS
// ============================================================

const UPLOADER_CHANNEL_IDS = new Set([
    "1532187710108860587",
    "1532187753557524581",
    "1531889348323180586",
    "1531889304245243904"
]);

const UPLOADER_MESSAGE =
`·:*¨༺ ♱✮♱ ༻¨*:·
> <:bling:1532144020921389176> ﹒  **become a uploader**
> <:bling:1532144020921389176> ﹒  **open a ticket here *:* <#1532195996052754523>**
·:*¨༺ ♱✮♱ ༻¨*:·`;


// ============================================================
// LOAD SAVED NAME REACTIONS
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
// GET DISCORD EMOJI ID
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
// HANDLE NAME REACTIONS
// ============================================================

async function handleNameReact(message) {

    try {

        const reactions = loadNameReactions();

        for (const name in reactions) {

            const reaction = reactions[name];

            if (
                !reaction ||
                !reaction.emojis ||
                reaction.emojis.length === 0
            ) {
                continue;
            }

            const escapedName = name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const nameRegex = new RegExp(
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

                const emojiId = getEmojiId(emoji);

                if (!emojiId) {
                    continue;
                }

                try {

                    await message.react(emojiId);

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
// HANDLE UPLOADER AUTO-MESSAGE
// ============================================================

async function handleUploaderMessage(message) {

    try {

        // ------------------------------------------------------
        // ONLY WATCH THE UPLOADER CHANNELS
        // ------------------------------------------------------

        if (
            !UPLOADER_CHANNEL_IDS.has(
                message.channel.id
            )
        ) {
            return;
        }
        

        // ------------------------------------------------------
        // FIND THE BOT'S OLD UPLOADER MESSAGE
        // ------------------------------------------------------

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


        // ------------------------------------------------------
        // DELETE ALL OLD UPLOADER MESSAGES
        // ------------------------------------------------------

        for (
            const oldMessage
            of oldUploaderMessages.values()
        ) {

            try {

                await oldMessage.delete();

            } catch (error) {

                logger.warn(
                    "Could not delete old uploader message:",
                    error.message
                );

            }

        }


        // ------------------------------------------------------
        // SEND A FRESH UPLOADER MESSAGE
        // ------------------------------------------------------

        await message.channel.send({
            content: UPLOADER_MESSAGE
        });


        logger.info(
            `Uploader message refreshed in #${message.channel.name}`
        );


    } catch (error) {

        logger.error(
            "Uploader automatic message error:",
            error
        );

    }

}


// ============================================================
// DISCORD MESSAGE CREATE
// ============================================================

export default {

    name: Events.MessageCreate,

    async execute(message, client) {

        try {

            // --------------------------------------------------
            // IGNORE BOTS
            // --------------------------------------------------

            if (
                message.author.bot
            ) {
                return;
            }


            // --------------------------------------------------
            // IGNORE DMS
            // --------------------------------------------------

            if (
                !message.guild
            ) {
                return;
            }


            logger.debug(
                `Message received from ${message.author.tag}: ${message.content}`
            );


            // ==================================================
            // UPLOADER AUTO-MESSAGE
            // ==================================================

            await handleUploaderMessage(
                message
            );


            // ==================================================
            // YOUR EXISTING .DIV AUTORESPONDER
            // ==================================================

            await handleDivAutoresponder(
                message
            );


            // ==================================================
            // YOUR EXISTING NAME REACTIONS
            // ==================================================

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
