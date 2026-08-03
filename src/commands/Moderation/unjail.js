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



export default {

data:new SlashCommandBuilder()

.setName("unjail")

.setDescription("Remove a member from jail")

.addUserOption(option=>
option
.setName("user")
.setDescription("Member to unjail")
.setRequired(true)
)

.setDefaultMemberPermissions(
PermissionFlagsBits.ModerateMembers
),



category:"Moderation",



async execute(interaction){


const target =
interaction.options.getMember("user");


const jailedUsers =
loadJailedUsers();



const roles =
jailedUsers[target.id];



if(!roles){

return interaction.reply({

content:"That member is not jailed.",

ephemeral:true

});

}



// remove jail role

await target.roles.remove(
JAIL_ROLE_ID
);



// restore roles

await target.roles.add(
roles
).catch(()=>{});



delete jailedUsers[target.id];

saveJailedUsers(jailedUsers);



// DM

await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been unjailed")

.setDescription(
`You have been released from jail in **${interaction.guild.name}**.\n\n`+
`**Staff:** ${interaction.user}`
)

.setColor("Green")

]

}).catch(()=>{});



// reply

await interaction.reply({

content:`${target} has been unjailed.`

});



// log

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
`**Member:** ${target}\n`+
`**Unjailed By:** ${interaction.user}`
)

.setColor("Green")

.setTimestamp()

]

});

}


}

};
