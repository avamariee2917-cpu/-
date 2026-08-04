import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from "discord.js";

import fs from "fs";
import path from "path";


const STAFF_ROLE_ID = "1532221464839848016";
const OWNER_ROLE_ID = "1531440557954437273";


const filePath = path.join(
    process.cwd(),
    "data",
    "nameReactions.json"
);



function loadReactions(){

    if(!fs.existsSync(filePath)){

        fs.mkdirSync(
            path.dirname(filePath),
            { recursive:true }
        );


        fs.writeFileSync(
            filePath,
            "{}"
        );

    }


    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );

}



function saveReactions(data){

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}



function canUseCommand(member){

    return (

        member.roles.cache.has(STAFF_ROLE_ID)

        ||

        member.roles.cache.has(OWNER_ROLE_ID)

        ||

        member.permissions.has(
            PermissionFlagsBits.Administrator
        )

    );

}



export default {

    data:

    new SlashCommandBuilder()

    .setName("namereact")

    .setDescription(
        "Manage custom name reactions"
    )


    .addSubcommand(sub =>

        sub

        .setName("set")

        .setDescription(
            "Create a custom name reaction"
        )


        .addStringOption(option =>

            option

            .setName("name")

            .setDescription(
                "The word/name that triggers reactions"
            )

            .setRequired(true)

        )


        .addStringOption(option =>

            option

            .setName("emojis")

            .setDescription(
                "Maximum 3 emojis separated by spaces"
            )

            .setRequired(true)

        )

    )



    .addSubcommand(sub =>

        sub

        .setName("remove")

        .setDescription(
            "Remove a name reaction"
        )


        .addStringOption(option =>

            option

            .setName("name")

            .setDescription(
                "Name reaction to remove"
            )

            .setRequired(true)

        )

    ),



    category:"community",



    async execute(interaction){


        if(!canUseCommand(interaction.member)){


            return interaction.reply({

                content:
                "You do not have permission to use this command.",

                ephemeral:true

            });

        }



        const data =
        loadReactions();



        const action =
        interaction.options.getSubcommand();



        const name =
        interaction.options
        .getString("name")
        .trim();



        const key =
        name.toLowerCase();



        if(action === "set"){


            const emojiInput =
            interaction.options
            .getString("emojis");



            const emojis =
            emojiInput

            .split(/\s+/)

            .filter(Boolean)

            .slice(0,3);



            if(emojis.length === 0){


                return interaction.reply({

                    content:
                    "You need to provide emojis.",

                    ephemeral:true

                });


            }



            data[key] = {


                name:name,


                emojis:emojis,


                createdBy:
                interaction.user.id


            };



            saveReactions(data);



            return interaction.reply({

                content:

                `Created name reaction for **${name}**.\nReactions: ${emojis.join(" ")}`,

                ephemeral:true

            });


        }




        if(action === "remove"){


            if(!data[key]){


                return interaction.reply({

                    content:
                    "That name reaction does not exist.",

                    ephemeral:true

                });


            }



            delete data[key];


            saveReactions(data);



            return interaction.reply({

                content:
                `Removed name reaction for **${name}**.`,

                ephemeral:true

            });


        }


    }


};
