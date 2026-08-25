import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";


// ============================================================
// AUTO REACTION SETTINGS
// ============================================================

const AUTO_REACTION_FILE = path.join(
    process.cwd(),
    "data",
    "autoReactions.json"
);


// ============================================================
// DEFAULT AUTO REACTION
// ============================================================

const DEFAULT_AUTO_REACTIONS = [
    {
        phrase: "this or that",

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
    }
];


// ============================================================
// ENSURE DATA FILE
// ============================================================

function ensureAutoReactionFile() {

    try {

        const directory =
            path.dirname(
                AUTO_REACTION_FILE
            );


        if (
            !fs.existsSync(
                directory
            )
        ) {

            fs.mkdirSync(
                directory,
                {
                    recursive: true
                }
            );

        }


        if (
            !fs.existsSync(
                AUTO_REACTION_FILE
            )
        ) {

            fs.writeFileSync(
                AUTO_REACTION_FILE,
                JSON.stringify(
                    DEFAULT_AUTO_REACTIONS,
                    null,
                    2
                ),
                "utf8"
            );

        }

    } catch (error) {

        logger.error(
            "Failed to create auto reaction file:",
            error
        );

    }

}


// ============================================================
// LOAD AUTO REACTIONS
// ============================================================

function loadAutoReactions() {

    ensureAutoReactionFile();

    try {

        const rawData =
            fs.readFileSync(
                AUTO_REACTION_FILE,
                "utf8"
            );


        if (
            !rawData.trim()
        ) {

            return DEFAULT_AUTO_REACTIONS;

        }


        const data =
            JSON.parse(
                rawData
            );


        if (
            !Array.isArray(data)
        ) {

            logger.warn(
                "Invalid auto reaction data. Using defaults."
            );

            return DEFAULT_AUTO_REACTIONS;

        }


        return data;

    } catch (error) {

        logger.error(
            "Failed to load auto reactions:",
            error
        );

        return DEFAULT_AUTO_REACTIONS;

    }

}


// ============================================================
// SAVE AUTO REACTIONS
// ============================================================

function saveAutoReactions(
    reactions
) {

    ensureAutoReactionFile();

    try {

        fs.writeFileSync(
            AUTO_REACTION_FILE,
            JSON.stringify(
                reactions,
                null,
                2
            ),
            "utf8"
        );


        return true;

    } catch (error) {

        logger.error(
            "Failed to save auto reactions:",
            error
        );

        return false;

    }

}


// ============================================================
// CHECK AUTO REACTIONS
// ============================================================

export async function handleAutoReaction(
    message
) {

    try {

        if (
            !message ||
            !message.guild ||
            message.author?.bot
        ) {

            return;

        }


        const reactions =
            loadAutoReactions();


        if (
            reactions.length === 0
        ) {

            return;

        }


        const messageContent =
            String(
                message.content || ""
            ).toLowerCase();


        if (
            !messageContent
        ) {

            return;

        }


        for (
            const reaction
            of reactions
        ) {

            if (
                !reaction ||
                reaction.enabled === false
            ) {

                continue;

            }


            if (
                !reaction.phrase ||
                !Array.isArray(
                    reaction.channels
                ) ||
                !Array.isArray(
                    reaction.emojis
                )
            ) {

                continue;

            }


            // ------------------------------------------------
            // CHANNEL CHECK
            // ------------------------------------------------

            if (
                !reaction.channels.includes(
                    message.channel.id
                )
            ) {

                continue;

            }


            // ------------------------------------------------
            // PHRASE CHECK
            // ------------------------------------------------

            const phrase =
                String(
                    reaction.phrase
                )
                .trim()
                .toLowerCase();


            if (
                !phrase
            ) {

                continue;

            }


            /*
             * Match the phrase as a complete phrase.
             *
             * "this or that"      -> triggers
             * "THIS OR THAT"      -> triggers
             * "this or that?"     -> triggers
             * "this or that!!!"   -> triggers
             *
             * "this or thats"     -> does not trigger
             */

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

                continue;

            }


            // ------------------------------------------------
            // ADD REACTIONS
            // ------------------------------------------------

            for (
                const emojiId
                of reaction.emojis
            ) {

                try {

                    await message.react(
                        emojiId
                    );


                } catch (error) {

                    logger.warn(
                        `Failed to add auto reaction ${emojiId}:`,
                        error
                    );

                }

            }


            /*
             * Stop after the first matching
             * auto reaction.
             */

            break;

        }

    } catch (error) {

        logger.error(
            "Auto reaction handler error:",
            error
        );

    }

}


// ============================================================
// EXPORT SETTINGS FUNCTIONS
// ============================================================

export {
    loadAutoReactions,
    saveAutoReactions
};
