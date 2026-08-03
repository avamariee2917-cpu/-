import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from "discord.js";

import fs from "fs";
import path from "path";


const JAIL_ROLE_ID = "1532199532916375773";
const LOG_CHANNEL_ID = "1533730276965089390";


const storageFile = path.join(
process.cwd(),
"data",
"jailedUsers.json"
);



function loadJailedUsers(){

if(!fs.existsSync(storageFile)){
return {};
}

return JSON.parse(
fs.readFileSync(storageFile,"utf8")
);

}



function saveJailedUsers(data){

fs.writeFileSync(
storageFile,
JSON.stringify(data,null,4)
);

}



async function resolveUser(input,client){

const mention =
input.match(/^<@!?(\d+)>$/);


if(mention){

return await client.users.fetch(
mention[1]
).catch(()=>null);

}


if(/^\d{17,20}$/.test(input)){

return await client.users.fetch(
input
).catch(()=>null);

}



const found =
client.users.cache.find(
user =>
user.username.toLowerCase()
===
input.toLowerCase()
);


return found || null;

}



export default {


data:new SlashCommandBuilder()

.setName("unjail")

.setDescription("Remove a member from jail")

.addStringOption(option=>

option

.setName("user")

.setDescription("Mention, ID, or username")

.setRequired(true)

)


.addStringOption(option=>

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


const input =
interaction.options.getString("user");


const reason =
interaction.options.getString("reason")
||
"No reason provided";



const user =
await resolveUser(
input,
interaction.client
);



if(!user){

return interaction.reply({

content:"I could not find that user.",

ephemeral:true

});

}



const target =
await interaction.guild.members.fetch(
user.id
).catch(()=>null);



if(!target){

return interaction.reply({

content:"User is not in this server.",

ephemeral:true

});

}



const jailedUsers =
loadJailedUsers();



const savedRoles =
jailedUsers[target.id];



if(!savedRoles){

return interaction.reply({

content:"That member is not jailed.",

ephemeral:true

});

}



// Remove jail role

await target.roles.remove(
JAIL_ROLE_ID
);



// Restore roles

await target.roles.add(
savedRoles
).catch(()=>{});



delete jailedUsers[target.id];

saveJailedUsers(
jailedUsers
);



// DM

await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been unjailed")

.setDescription(

`You have been released from jail in **${interaction.guild.name}**.\n\n`+

`**Staff:** ${interaction.user}\n`+

`**Reason:** ${reason}`

)

.setColor("Green")

]

}).catch(()=>{});



// Reply

await interaction.reply({

embeds:[

new EmbedBuilder()

.setTitle("Member Unjailed")

.setDescription(

`**Member:** ${target}\n`+

`**Reason:** ${reason}`

)

.setColor("Green")

]

});



// Log

const logChannel =
interaction.guild.channels.cache.get(
LOG_CHANNEL_ID
);



if(logChannel){

await logChannel.send({

embeds:[

new EmbedBuilder()

.setTitle("🔓 Member Unjailed")

.setDescription(

`**Member:** ${target}\n\n`+

`**Unjailed By:** ${interaction.user}\n`+

`**Reason:** ${reason}`

)

.setColor("Green")

.setTimestamp()

]

});

}


}

};
