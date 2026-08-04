import { Events } from "discord.js";
import fs from "fs";
import path from "path";

import { logger } from "../utils/logger.js";
import { parsePrefixCommand } from "../utils/prefixParser.js";

import {
    supportsPrefixExecution,
    executePrefixCommand,
    resolvePrefixAccessKey,
} from "../utils/messageAdapter.js";

import {
    resolveCommandAlias,
    resolveSubcommandAlias,
} from "../config/commands/commandAliases.js";

import { getPrefixRestriction } from "../config/commands/prefixRestrictions.js";
import { getGuildConfig } from "../services/config/guildConfig.js";

import {
    getPrefixCommand,
    getBotMessage,
    isBotOwner,
    isCommandCategoryEnabled,
    isMaintenanceMode,
} from "../config/bot.js";

import {
    enforceAbuseProtection,
    formatCooldownDuration,
} from "../utils/abuseProtection.js";

import { createEmbed } from "../utils/embeds.js";
import { isCommandEnabled } from "../services/commandAccessService.js";

import {
    getCountingGameConfig,
    saveCountingGameConfig,
    isValidCountingMessage,
    recordCorrectCount,
} from "../services/countingGameService.js";



const nameReactionFile = path.join(
    process.cwd(),
    "data",
    "nameReactions.json"
);



function loadNameReactions(){

    try{

        if(!fs.existsSync(nameReactionFile)){

            fs.mkdirSync(
                path.dirname(nameReactionFile),
                {
                    recursive:true
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


    }catch(error){

        logger.error(
            "Failed loading name reactions:",
            error
        );

        return {};

    }

}




async function handleNameReact(message){


    try{


        const reactions =
        loadNameReactions();



        const content =
        message.content.toLowerCase();



        for(
            const name in reactions
        ){


            const reaction =
            reactions[name];



            if(
                !reaction.emojis ||
                reaction.emojis.length === 0
            ){

                continue;

            }



            const words =
            content.split(/\s+/);



            if(
                words.includes(
                    name.toLowerCase()
                )
            ){


                for(
                    const emoji of reaction.emojis
                ){

                    await message.react(
                        emoji
                    )
                    .catch(error=>{

                        logger.warn(
                            `Failed reacting with ${emoji}`,
                            error
                        );

                    });

                }


                break;

            }


            if(
                message.mentions.users.size > 0 &&
                content.includes(name.toLowerCase())
            ){


                for(
                    const emoji of reaction.emojis
                ){

                    await message.react(
                        emoji
                    )
                    .catch(()=>{});

                }


                break;

            }


        }


    }catch(error){


        logger.error(
            "Name reaction error:",
            error
        );


    }


}





export default {

    name: Events.MessageCreate,


    async execute(message, client){


        try{


            if(
                message.author.bot ||
                !message.guild
            ){

                return;

            }



            logger.debug(
                `Message received from ${message.author.tag}: ${message.content}`
            );



            await handleNameReact(
                message
            );



            const countingProcessed =
            await handleCountingGame(
                message,
                client
            );



            if(countingProcessed){

                return;

            }



            await handlePrefixCommand(
                message,
                client
            );



        }catch(error){


            logger.error(
                "Error in messageCreate event:",
                error
            );


        }


    }


};
