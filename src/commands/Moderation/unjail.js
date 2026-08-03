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



await guild.members.fetch();



return guild.members.cache.find(

m =>
m.user.username.toLowerCase()
===
input.toLowerCase()
||
m.displayName.toLowerCase()
===
input.toLowerCase()

);



}




export default {


data:

new SlashCommandBuilder()

.setName("unjail")

.setDescription("Unjail a member")

.addStringOption(option=>

option

.setName("user")

.setDescription("Mention, ID, or username")

.setRequired(true)

)

.addStringOption(option=>

option

.setName("reason")

.setDescription("Reason")

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





await target.roles.remove(
JAIL_ROLE_ID
).catch(()=>{});



await target.roles.add(
data[target.id].roles
).catch(()=>{});





delete data[target.id];

saveData(data);






await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been unjailed")

.setDescription(

`Server: **${interaction.guild.name}**\n\n`+

`Staff: ${interaction.user}\n`+

`Reason: ${reason}`

)

.setColor("Green")

]

}).catch(()=>{});





await interaction.reply({

content:`🔓 ${target} has been unjailed.\nReason: ${reason}`

});





const logs =
interaction.guild.channels.cache.get(
LOG_CHANNEL_ID
);



if(logs){

logs.send({

embeds:[

new EmbedBuilder()

.setTitle("🔓 Unjail Log")

.setDescription(

`Member: ${target}\n`+

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
