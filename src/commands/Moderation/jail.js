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
        fs.writeFileSync(storageFile, "{}");
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

    const mention = input.match(/^<@!?(\d+)>$/);

    if(mention){
        return await client.users.fetch(mention[1]).catch(()=>null);
    }


    if(/^\d{17,20}$/.test(input)){
        return await client.users.fetch(input).catch(()=>null);
    }


    await guild.members.fetch().catch(()=>{});


    const member = guild.members.cache.find(
        m =>
        m.user.username.toLowerCase() === input.toLowerCase() ||
        m.displayName.toLowerCase() === input.toLowerCase()
    );


    return member?.user || null;

}



export default {

data: new SlashCommandBuilder()

.setName("jail")
.setDescription("Jail a member")

.addStringOption(option =>
    option
    .setName("user")
    .setDescription("Mention, ID, or username")
    .setRequired(true)
)

.addStringOption(option =>
    option
    .setName("reason")
    .setDescription("Reason for jail")
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
content:"I could not find that user.",
ephemeral:true
});

}



const target =
await interaction.guild.members.fetch(user.id)
.catch(()=>null);



if(!target){

return interaction.reply({
content:"That user is not in this server.",
ephemeral:true
});

}



const jailRole =
interaction.guild.roles.cache.get(
JAIL_ROLE_ID
);



if(!jailRole){

return interaction.reply({
content:"Jail role not found.",
ephemeral:true
});

}



const jailedUsers =
loadJailedUsers();



if(jailedUsers[target.id]){

return interaction.reply({
content:"That member is already jailed.",
ephemeral:true
});

}



// Save roles

const roles =
target.roles.cache
.filter(role => role.id !== interaction.guild.id)
.filter(role => !role.managed)
.map(role => role.id);



jailedUsers[target.id] = roles;

saveJailedUsers(jailedUsers);



// Remove roles

await target.roles.remove(roles).catch(()=>{});


// Add jail role

await target.roles.add(jailRole);



// DM

await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been jailed")

.setDescription(
`You were jailed in **${interaction.guild.name}**.\n\n`+
`**Staff:** ${interaction.user}\n`+
`**Reason:** ${reason}`
)

.setColor("Red")

.setTimestamp()

]

}).catch(()=>{});



// Reply

await interaction.reply({

embeds:[

new EmbedBuilder()

.setTitle("Member Jailed")

.setDescription(
`**Member:** ${target}\n`+
`**Reason:** ${reason}`
)

.setColor("Red")

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

.setTitle("🔒 Member Jailed")

.setDescription(
`**Member:** ${target}\n\n`+
`**Jailed By:** ${interaction.user}\n`+
`**Reason:** ${reason}`
)

.setColor("Red")

.setTimestamp()

]

});

}


}

};
