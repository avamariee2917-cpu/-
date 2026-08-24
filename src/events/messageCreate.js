import { Events } from "discord.js";
import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";

const nameReactionFile = path.join(
    process.cwd(),
    "data",
    "nameReactions.json"
);


// ============================================================
// .DIV AUTORESPONDER CONFIGURATION
// ============================================================

const DIV_ALLOWED_CHANNELS = new Set([
  '1532187710108860587',
  '1532187753557524581',
  '1531889348323180586',
  '1531889304245243904',
  '1533649909839040592',
  '1531527600718221363',
]);

const DIV_REQUIRED_ROLES = new Set([
  '1531889895474335764',
  '1532221464839848016',
]);

const DIV_GIF_URL = 'https://cdn.discordapp.com/attachments/1155344789152206868/1357924444906983495/217979.gif?ex=6a8d1030&is=6a8bbeb0&hm=bbbdf0b5884e94c088009312d4119487b708a2d6462870d3dcc5e575905470fc';


/*
 * Load saved name reactions
 */
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


/*
 * Get the Discord emoji ID from:
 *
 * <a:blackdiamond:1532143696957669476>
 *
 * or:
 *
 * <:sparkle:123456789>
 *
 * or just:
 *
 * 123456789
 */
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


/*
 * Handle Name Reactions
 */
async function handleNameReact(message) {

    try {

        const reactions = loadNameReactions();

        const content = message.content.toLowerCase();


        for (const name in reactions) {

            const reaction = reactions[name];

            if (
                !reaction ||
                !reaction.emojis ||
                reaction.emojis.length === 0
            ) {
                continue;
            }


            /*
             * Check whether the custom trigger name
             * was used as a complete word.
             *
             * Example:
             *
             * "aeris is here"     -> YES
             * "AERIS is here"     -> YES
             * "aeris!"            -> YES
             * "aeris123"          -> NO
             */
            const escapedName = name
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const nameRegex = new RegExp(
                `(^|\\s)${escapedName}(?=\\s|$|[.,!?;:'"()\\[\\]{}])`,
                "i"
            );

            const nameWasUsed = nameRegex.test(
                message.content
            );


            /*
             * Check whether the member who created
             * this Name Reaction was mentioned.
             */
            let memberWasMentioned = false;

            if (reaction.createdBy) {

                memberWasMentioned =
                    message.mentions.users.has(
                        reaction.createdBy
                    );
            }


            /*
             * Either the custom name OR the owner
             * being mentioned can trigger it.
             */
            if (
                !nameWasUsed &&
                !memberWasMentioned
            ) {
                continue;
            }


            /*
             * React with every saved emoji.
             */
            for (const emoji of reaction.emojis) {

                const emojiId =
                    getEmojiId(emoji);

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


            /*
             * We found the matching Name Reaction,
             * so stop checking the remaining ones.
             */
            break;
        }

    } catch (error) {

        logger.error(
            "Name reaction error:",
            error
        );
    }
}


/*
 * Handle .div autoresponder
 */
async function handleDivAutoresponder(message) {

    try {

        // --------------------------------------------------
        // CHECK MESSAGE CONTENT (EXACT MATCH)
        // --------------------------------------------------

        if (message.content !== '.div') {
            return;
        }


        // --------------------------------------------------
        // CHECK CHANNEL AUTHORIZATION
        // --------------------------------------------------

        if (!DIV_ALLOWED_CHANNELS.has(message.channel.id)) {
            return;
        }


        // --------------------------------------------------
        // CHECK ROLE AUTHORIZATION
        // --------------------------------------------------

        const member = message.member;

        if (!member) {
            return;
        }

        const hasRequiredRole = Array.from(DIV_REQUIRED_ROLES).some(
            roleId => member.roles.cache.has(roleId)
        );

        if (!hasRequiredRole) {
            return;
        }


        // --------------------------------------------------
        // DELETE USER'S .DIV MESSAGE
        // --------------------------------------------------

        try {

            await message.delete();

        } catch (error) {

            logger.warn(
                `Failed to delete .div message from ${message.author.tag}:`,
                error.message
            );

        }


        // --------------------------------------------------
        // SEND GIF RESPONSE
        // --------------------------------------------------

        try {

            await message.channel.send(DIV_GIF_URL);

        } catch (error) {

            logger.warn(
                `Failed to send .div GIF in channel ${message.channel.id}:`,
                error.message
            );

        }

    } catch (error) {

        logger.error(
            ".div autoresponder error:",
            error
        );

    }

}


/*
 * Discord messageCreate event
 */
export default {

    name: Events.MessageCreate,

    async execute(message, client) {

        try {

            /*
             * Ignore bots and DMs.
             */
            if (
                message.author.bot ||
                !message.guild
            ) {
                return;
            }


            logger.debug(
                `Message received from ${message.author.tag}: ${message.content}`
            );


            /*
             * .DIV AUTORESPONDER
             */
            await handleDivAutoresponder(
                message
            );


            /*
             * NAME REACTIONS
             */
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
