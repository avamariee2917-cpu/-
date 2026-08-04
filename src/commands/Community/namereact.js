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



function getData(){

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



function hasAccess(member){

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
        "Create or update a name reaction"
    )


    .addStringOption(option =>

        option

        .setName("name")

        .setDescription(
            "The custom name to react to"
        )

        .setRequired(true)

    )


    .addStringOption(option =>

        option

        .setName("emojis")

        .setDescription(
            "Up to 3 emojis separated by spaces"
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


    if(!hasAccess(interaction.member)){

        return interaction.reply({

            content:
            "You do not have permission to use this command.",

            ephemeral:true

        });

    }



    const data = getData();



    const sub =
    interaction.options.getSubcommand();



    const name =
    interaction.options.getString("name")
    .trim()
    .toLowerCase();



    if(sub === "set"){


        const emojiInput =
        interaction.options.getString("emojis");



        const emojis =
        emojiInput
        .split(/\s+/)
        .filter(Boolean)
        .slice(0,3);



        if(emojis.length === 0){

            return interaction.reply({

                content:
                "You must provide at least one emoji.",

                ephemeral:true

            });

        }



        data[name] = {

            displayName:
            interaction.options.getString("name"),

            emojis,

            createdBy:
            interaction.user.id

        };



        saveData(data);



        return interaction.reply({

            content:
            `Name reaction created for **${interaction.options.getString("name")}**.\n\nReactions: ${emojis.join(" ")}`,

            ephemeral:true

        });


    }



    if(sub === "remove"){


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
            `Removed the name reaction for **${interaction.options.getString("name")}**.`,

            ephemeral:true

        });


    }


}


};
