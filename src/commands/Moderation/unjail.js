import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from "discord.js";

import fs from "fs";
import path from "path";


const JAIL_ROLE_ID = "1532199532916375773";
const LOG_CHANNEL_ID = "1533730276965089390";


const filePath = path.join(
    process.cwd(),
    "data",
    "jailedUsers.json"
);



function getData(){

    if(!fs.existsSync(filePath)){

        return {};

    }


    return JSON.parse(
        fs.readFileSync(filePath,"utf8")
    );

}



function saveData(data){

    fs.writeFileSync(
        filePath,
        JSON.stringify(data,null,4)
    );

}



async function findUser(input, interaction){

    const guild = interaction.guild;


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



    await guild.members.fetch()
    .catch(()=>{});



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

.setName("unjail")

.setDescription("Remove a member from jail")

.addStringOption(option =>

    option

    .setName("user")

    .setDescription("ID, username, or mention")

    .setRequired(true)

)

.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for unjail")

    .setRequired(false)

)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers
),



category:"Moderation",




async execute(interaction){



const target =
await findUser(
    interaction.options.getString("user"),
    interaction
);




if(!target){

return interaction.reply({

content:"I could not find that user.",

ephemeral:true

});

}





const data = getData();





if(!data[target.id]){

return interaction.reply({

content:"This member is not jailed.",

ephemeral:true

});

}





const reason =
interaction.options.getString("reason")
||
"No reason provided";






// Remove jail role

await target.roles.remove(
    JAIL_ROLE_ID
)
.catch(()=>{});






// Restore previous roles

await target.roles.add(
    data[target.id].roles
)
.catch(()=>{});







delete data[target.id];

saveData(data);








// DM Member

await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been unjailed")

.setDescription(

`You have been released from jail in **${interaction.guild.name}**.\n\n`+

`Staff member: ${interaction.user}\n`+

`Reason: ${reason}`

)

.setColor("Green")

.setTimestamp()

]

}).catch(()=>{});









// Staff response

await interaction.reply({

embeds:[

new EmbedBuilder()

.setTitle("Member Unjailed")

.setDescription(

`${target} has been released from jail.\n\n`+

`Reason: ${reason}`

)

.setColor("Green")

]

});








// Logs

const logs =
interaction.guild.channels.cache.get(
    LOG_CHANNEL_ID
);




if(logs){

await logs.send({

embeds:[

new EmbedBuilder()

.setTitle("Unjail Log")

.setDescription(

`Member: ${target}\n\n`+

`Staff: ${interaction.user}\n`+

`Reason: ${reason}`

)

.setColor("Green")

.setTimestamp()

]

});

}



}


};
