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



function loadData(){

    if(!fs.existsSync(filePath)){

        fs.mkdirSync(
            path.dirname(filePath),
            {
                recursive:true
            }
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



function saveData(data){

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}



function hasPermission(member){


    return (

        member.roles.cache.has(STAFF_ROLE_ID)

        ||

        member.roles.cache.has(OWNER_ROLE_ID)

        ||

        member.roles.cache.has(
            PermissionFlagsBits.Administrator
        )

        ||

        member.premiumSince

    );


}





export default {


    data:

    new SlashCommandBuilder()

    .setName("namereact")

    .setDescription(
        "Create custom name reactions"
    )



    .addSubcommand(sub =>

        sub

        .setName("set")

        .setDescription(
            "Create or edit a name reaction"
        )


        .addStringOption(option =>

            option

            .setName("name")

            .setDescription(
                "The word that activates the reactions"
            )

            .setRequired(true)

        )


        .addStringOption(option =>

            option

            .setName("emote1")

            .setDescription(
                "First reaction emoji"
            )

            .setRequired(true)

        )


        .addStringOption(option =>

            option

            .setName("emote2")

            .setDescription(
                "Second reaction emoji (optional)"
            )

            .setRequired(false)

        )


        .addStringOption(option =>

            option

            .setName("emote3")

            .setDescription(
                "Third reaction emoji (optional)"
            )

            .setRequired(false)

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



        if(!hasPermission(interaction.member)){


            return interaction.reply({

                content:
                "You do not have permission to use this command.",

                ephemeral:true

            });


        }





        const data =
        loadData();



        const action =
        interaction.options.getSubcommand();




        const name =
        interaction.options
        .getString("name")
        .trim()
        .toLowerCase();






        if(action === "set"){



            const emojis = [

                interaction.options.getString("emote1"),

                interaction.options.getString("emote2"),

                interaction.options.getString("emote3")

            ]

            .filter(Boolean)

            .slice(0,3);





            data[name] = {


                trigger:name,


                emojis:emojis,


                createdBy:
                interaction.user.id


            };





            saveData(data);





            return interaction.reply({

                content:

                `Created name reaction:\n\n**Name:** ${name}\n**Reactions:** ${emojis.join(" ")}`,

                ephemeral:true

            });



        }





        if(action === "remove"){



            if(!data[name]){


                return interaction.reply({

                    content:
                    "That name reaction does not exist.",

                    ephemeral:true

                });


            }





            delete data[name];



            saveData(data);




            return interaction.reply({

                content:

                `Removed name reaction for **${name}**.`,

                ephemeral:true

            });



        }



    }



};
