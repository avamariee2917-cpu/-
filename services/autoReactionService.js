import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";


// ============================================================
// FILE
// ============================================================

const AUTO_REACTION_FILE = path.join(
    process.cwd(),
    "data",
    "autoReactions.json"
);


// ============================================================
// YOUR DEFAULT AUTO REACTION
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
// ENSURE FILE
// ============================================================

function ensureAutoReactionFile() {

    try {

        const directory =
            path.dirname(
                AUTO_REACTION_FILE
            );


        if (
            !fs.existsSync(directory)
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
// LOAD
// ============================================================

export function loadAutoReactions() {

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

            return [];

        }


        const data =
            JSON.parse(
                rawData
            );


        if (
            !Array.isArray(data)
        ) {

            logger.warn(
                "Auto reaction data is invalid."
            );

            return [];

        }


        return data;

    } catch (error) {

        logger.error(
            "Failed to load auto reactions:",
            error
        );

        return [];

    }

}


// ============================================================
// SAVE
// ============================================================

export function saveAutoReactions(
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
// HANDLE MESSAGE
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


        const content =
            String(
                message.content || ""
            );


        if (
            !content.trim()
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
            // CHANNEL
            // ------------------------------------------------

            if (
                !reaction.channels.includes(
                    message.channel.id
                )
            ) {

                continue;

            }


            // ------------------------------------------------
            // PHRASE
            // ------------------------------------------------

            const phrase =
                String(
                    reaction.phrase
                )
                .trim()
                .toLowerCase();


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
                    content
                )
            ) {

                continue;

            }


            // ------------------------------------------------
            // REACT
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
                        `Failed to react with ${emojiId}:`,
                        error.message
                    );

                }

            }


            break;

        }

    } catch (error) {

        logger.error(
            "Auto reaction handler error:",
            error
        );

    }

}
