import { Events } from "discord.js";
import { logger } from "../utils/logger.js";

// ============================================================
// AUTO REACTION SETTINGS
// ============================================================

const AUTO_REACTION_PHRASE = "1 or 2";

const AUTO_REACTION_EMOJIS = [
    "1532299228452356106",
    "1532299246278283325"
];

const AUTO_REACTION_CHANNELS = new Set([
    "1541254619999637624",
    "1541679032234680350",
    "1541678933118816267",
    "1541679251940712498"
]);


// ============================================================
// AUTO REACTION EVENT
// ============================================================

export default {

    name: Events.MessageCreate,

    async execute(message, client) {

        try {

            // Ignore bots
            if (message.author.bot) {
                return;
            }

            // Ignore DMs
            if (!message.guild) {
                return;
            }

            // Only specified channels
            if (
                !AUTO_REACTION_CHANNELS.has(
                    message.channel.id
                )
            ) {
                return;
            }

            // Check message content
            const content =
                String(message.content || "").toLowerCase();

            const phrase =
                AUTO_REACTION_PHRASE.toLowerCase();

            // React if phrase appears anywhere
            if (!content.includes(phrase)) {
                return;
            }

            // Add both reactions
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
                "Auto reaction event error:",
                error
            );

        }

    }

};
