import {
    SlashCommandBuilder,
    PermissionFlagsBits,
} from "discord.js";

import fs from "fs";
import path from "path";


const OWNER_ROLE_ID = "1531440557954437273";
const STAFF_ROLE_ID = "1532221464839848016";


const filePath = path.join(
    process.cwd(),
    "data",
    "nameReacts.json"
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
        fs.readFileSync(filePath, "utf8")
    );

}



function saveData(data){

    fs.writeFileSync(
        filePath,
        JSON.stringify(data,null,4)
    );

}



function hasAccess(interaction){

    const member = interaction.member;


    if(
        interaction.guild.ownerId === interaction.user.id
    ){

        return true;

    }



    if(
        member.roles.cache.has(OWNER_ROLE_ID)
    ){

        return true;

    }



    if(
        member.roles.cache.has(STAFF_ROLE_ID)
    ){

        return true;

    }



    if(
        member.roles.cache.has(
            interaction.guild.roles.premiumSubscriberRole?.id
        )
    ){

        return true;

    }



    return false;

}



async function findUser(input, guild){

    const mention =
    input.match(/^<@!?(\d+)>$/);


    if(mention){

        return await guild.members.fetch(
            mention[1]
        ).catch(()=>null);

    }



    if(/^\d+$/.test(input)){

        return await guild.members.fetch(
            input
        ).catch(()=>null);

    }



    await guild.members.fetch();



    return guild.members.cache.find(
        member =>
            member.user.username.toLowerCase()
            === input.toLowerCase()
            ||
            member.displayName.toLowerCase()
            === input.toLowerCase()
    );

}



export default {


data:

new SlashCommandBuilder()

.setName("namereact")

.setDescription(
    "Manage name reactions"
)


.addSubcommand(sub =>

    sub

    .setName("set")

    .setDescription(
        "Add name reactions to a user"
    )


    .addStringOption(option =>

        option

        .setName("user")

        .setDescription(
            "User ID, mention, or username"
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
        "Remove name reactions"
    )


    .addStringOption(option =>

        option

        .setName("user")

        .setDescription(
            "User ID, mention, or username"
        )

        .setRequired(true)

    )

)



.addSubcommand(sub =>

    sub

    .setName("list")

    .setDescription(
        "View saved name reactions"
    )

)



.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages
),



category:"community",



async execute(interaction){


    if(!hasAccess(interaction)){

        return interaction.reply({

            content:
            "You do not have permission to use this command.",

            ephemeral:true

        });

    }




    const data = getData();



    const sub =
    interaction.options.getSubcommand();




    if(sub === "set"){


        const userInput =
        interaction.options.getString("user");



        const emojis =
        interaction.options.getString("emojis")
        .split(/\s+/)
        .filter(Boolean);



        if(emojis.length > 3){

            return interaction.reply({

                content:
                "You can only add up to 3 emojis.",

                ephemeral:true

            });

        }




        const member =
        await findUser(
            userInput,
            interaction.guild
        );



        if(!member){

            return interaction.reply({

                content:
                "I could not find that user.",

                ephemeral:true

            });

        }




        data[member.id] = {

            username:
            member.user.username,

            emojis

        };



        saveData(data);



        return interaction.reply({

            content:
            `Name reactions saved for ${member}.`,

            ephemeral:true

        });



    }




    if(sub === "remove"){


        const userInput =
        interaction.options.getString("user");



        const member =
        await findUser(
            userInput,
            interaction.guild
        );



        if(!member){

            return interaction.reply({

                content:
                "I could not find that user.",

                ephemeral:true

            });

        }



        delete data[member.id];

        saveData(data);



        return interaction.reply({

            content:
            `Name reactions removed for ${member}.`,

            ephemeral:true

        });


    }




    if(sub === "list"){


        const entries =
        Object.entries(data);



        if(entries.length === 0){

            return interaction.reply({

                content:
                "No name reactions have been added.",

                ephemeral:true

            });

        }



        let text = "";



        for(const [id,value] of entries){

            text +=
            `<@${id}> — ${value.emojis.join(" ")}\n`;

        }



        return interaction.reply({

            content:text,

            ephemeral:true

        });


    }


}


};
