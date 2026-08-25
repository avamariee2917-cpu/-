import { Events } from "discord.js";
import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";
import { handleDivAutoresponder } from "../services/divAutoresponder.js";
import { handleAutoReaction } from "../services/autoReactionService.js";

// ============================================================
// NAME REACTIONS
// ============================================================

const nameReactionFile = path.join(
    process.cwd(),
    "data",
    "nameReactions.json"
);


// ============================================================
// UPLOADER AUTO-MESSAGE
// ============================================================

const UPLOADER_CHANNEL_IDS = new Set([
    "1532187710108860587",
    "1532187753557524581",
    "1531889348323180586",
    "1531889304245243904",
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
// HANDLE NAME REACTIONS
// ============================================================

async function handleNameReact(message) {

    try {

        const reactions =
            loadNameReactions();

        const content =
            message.content.toLowerCase();


        for (
            const name
            in reactions
        ) {

            const reaction =
                reactions[name];


            if (
                !reaction ||
                !reaction.emojis ||
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
                    getEmojiId(
                        emoji
                    );


                if (!emojiId) {

                    logger.warn(
                        `Could not understand Name Reaction emoji: ${emoji}`
                    );

                    continue;

                }


                try {

                    await message.react(
                        emojiId
                    );

                } catch (error) {

                    logger.warn(
                        `Failed to react with emoji ${emojiId} for Name Reaction "${name}"`,
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
        // ONLY RUN IN SPECIFIC CHANNELS
        // ------------------------------------------------------

        if (
            !UPLOADER_CHANNEL_IDS.has(
                message.channel.id
            )
        ) {
            return;
        }


        // ------------------------------------------------------
        // FIND PREVIOUS BOT UPLOADER MESSAGE
        // ------------------------------------------------------

        const messages =
            await message.channel.messages.fetch({
                limit: 20
            });


        const previousUploaderMessage =
            messages.find(
                msg =>
                    msg.author.id ===
                        message.client.user.id &&
                    msg.content ===
                        UPLOADER_MESSAGE
            );


        // ------------------------------------------------------
        // DELETE PREVIOUS MESSAGE
        // ------------------------------------------------------

        if (
            previousUploaderMessage
        ) {

            try {

                await previousUploaderMessage.delete();

            } catch (error) {

                logger.warn(
                    "Could not delete previous uploader message:",
                    error
                );

            }

        }


        // ------------------------------------------------------
        // SEND NEW MESSAGE
        // ------------------------------------------------------

        await message.channel.send(
            UPLOADER_MESSAGE
        );


    } catch (error) {

        logger.error(
            "Uploader automatic message error:",
            error
        );

    }

}


// ============================================================
// DISCORD MESSAGE CREATE EVENT
// ============================================================

export default {

    name: Events.MessageCreate,


    async execute(
        message,
        client
    ) {

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


            // --------------------------------------------------
            // UPLOADER AUTO-MESSAGE
            // --------------------------------------------------

            await handleUploaderMessage(
                message
            );


            // --------------------------------------------------
            // .DIV AUTORESPONDER
            // --------------------------------------------------

            await handleDivAutoresponder(
                message
            );


            // --------------------------------------------------
            // NAME REACTIONS
            // --------------------------------------------------

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

import { Events } from "discord.js";
import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";
import { handleDivAutoresponder } from "../services/divAutoresponder.js";

const nameReactionFile = path.join(
    process.cwd(),
    "data",
    "nameReactions.json"
);


// ============================================================
// AUTO REACTION SETTINGS
// ============================================================

const AUTO_REACTION_CHANNELS = new Set([
    "1541254619999637624",
    "1541679032234680350",
    "1541678933118816267",
    "1541679251940712498"
]);


// TYPE YOUR TRIGGER WORD/PHRASE HERE
const AUTO_REACTION_PHRASE = "1 or 2";


// PUT YOUR TWO EMOTE IDS HERE
const AUTO_REACTION_EMOJIS = [
    "1532299228452356106",
    "1532299246278283325"
];


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
// NAME REACTIONS
// ============================================================

async function handleNameReact(message) {

    try {

        const reactions =
            loadNameReactions();

        for (
            const name in reactions
        ) {

            const reaction =
                reactions[name];

            if (
                !reaction ||
                !reaction.emojis ||
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
// AUTO REACTION
// ============================================================

async function handleAutoReaction(message) {

    try {

        if (
            !message ||
            !message.guild ||
            message.author.bot
        ) {
            return;
        }


        // ONLY WORK IN THE SPECIFIED CHANNELS

        if (
            !AUTO_REACTION_CHANNELS.has(
                message.channel.id
            )
        ) {
            return;
        }


        const phrase =
            AUTO_REACTION_PHRASE
                .trim();


        if (!phrase) {
            return;
        }


        // Match the phrase regardless of capitalization

        const escapedPhrase =
            phrase.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );


        const phraseRegex =
            new RegExp(
                `(^|\\s)${escapedPhrase}(?=\\s|$|[.,!?;:'"()\\[\\]{}])`,
                "i"
            );


        if (
            !phraseRegex.test(
                message.content
            )
        ) {
            return;
        }


        // REACT WITH BOTH EMOTES

        for (
            const emojiId
            of AUTO_REACTION_EMOJIS
        ) {

            try {

                await message.react(
                    emojiId
                );

            } catch (error) {

                logger.warn(
                    `Could not add auto reaction ${emojiId}:`,
                    error.message
                );

            }

        }

    } catch (error) {

        logger.error(
            "Auto reaction error:",
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

            // Ignore bots and DMs

            if (
                message.author.bot ||
                !message.guild
            ) {
                return;
            }


            // ==================================================
            // YOUR EXISTING DIV AUTORESPONDER
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


            // ==================================================
            // NEW AUTO REACTION
            // ==================================================

            await handleAutoReaction(
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
