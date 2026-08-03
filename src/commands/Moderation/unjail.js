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
        fs.mkdirSync(path.dirname(storageFile), {recursive:true});
        fs.writeFileSync(storageFile,"{}");
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



async function resolveUser(input, client, guild){

    const mention =
    input.match(/^<@!?(\d+)>$/);


    if(mention){

        return await client.users
        .fetch(mention[1])
        .catch(()=>null);

    }



    if(/^\d{17,20}$/.test(input)){

        return await client.users
        .fetch(input)
        .catch(()=>null);

    }



    await guild.members.fetch()
    .catch(()=>{});



    const member =
    guild.members.cache.find(
        m =>
        m.user.username.toLowerCase()
        === input.toLowerCase()
        ||
        m.displayName.toLowerCase()
        === input.toLowerCase()
    );



    return member?.user || null;

}




export default {


data:

new SlashCommandBuilder()

.setName("unjail")

.setDescription("Remove a member from jail")



.addStringOption(option =>

    option

    .setName("user")

    .setDescription("Mention, ID, or username")

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



const input =
interaction.options.getString("user");



const reason =
interaction.options.getString("reason")
|| "No reason provided";



const user =
await resolveUser(

input,

interaction.client,

interaction.guild

);



if(!user){

return interaction.reply({

content:
"I could not find that user.",

ephemeral:true

});

}




const member =
await interaction.guild.members
.fetch(user.id)
.catch(()=>null);



if(!member){

return interaction.reply({

content:
"That user is not in this server.",

ephemeral:true

});

}





const jailedUsers =
loadJailedUsers();



if(!jailedUsers[member.id]){

return interaction.reply({

content:
"This member is not jailed.",

ephemeral:true

});

}




const oldRoles =
jailedUsers[member.id];




// Remove jail role

await member.roles
.remove(JAIL_ROLE_ID)
.catch(()=>{});




// Restore old roles

await member.roles
.add(oldRoles)
.catch(()=>{});




// Remove saved data

delete jailedUsers[member.id];

saveJailedUsers(jailedUsers);





// DM Member

await member.send({

embeds:[

new EmbedBuilder()

.setTitle(
"You have been unjailed"
)

.setDescription(

`You have been released from jail in **${interaction.guild.name}**.\n\n`+

`**Staff:** ${interaction.user}\n`+

`**Reason:** ${reason}`

)

.setColor("Green")

.setTimestamp()

]

}).catch(()=>{});







// Staff reply

await interaction.reply({

embeds:[

new EmbedBuilder()

.setTitle(
"Member Unjailed"
)

.setDescription(

`**Member:** ${member}\n\n`+

`**Reason:** ${reason}`

)

.setColor("Green")

]

});







// Logs

const logChannel =
interaction.guild.channels.cache.get(
LOG_CHANNEL_ID
);



if(logChannel){


await logChannel.send({

embeds:[

new EmbedBuilder()

.setTitle(
"🔓 Member Unjailed"
)

.setDescription(

`**Member:** ${member}\n\n`+

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
