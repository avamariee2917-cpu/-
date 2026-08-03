import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from "discord.js";

import fs from "fs";
import path from "path";


const JAIL_ROLE_ID = "1532199532916375773";
const LOG_CHANNEL_ID = "1533730276965089390";
const JAIL_CHANNEL_ID = "1532200353238482954";


const filePath = path.join(
    process.cwd(),
    "data",
    "jailedUsers.json"
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
        JSON.stringify(data, null, 4)
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
            member.user.username.toLowerCase() === input.toLowerCase()
            ||
            member.displayName.toLowerCase() === input.toLowerCase()
    );

}




export default {

data:

new SlashCommandBuilder()

.setName("jail")

.setDescription("Jail a member")

.addStringOption(option =>

    option

    .setName("user")

    .setDescription("ID, username, or mention")

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



const reason =
interaction.options.getString("reason")
||
"No reason provided";



const data = getData();



if(data[target.id]){

return interaction.reply({

content:"That member is already jailed.",

ephemeral:true

});

}



const savedRoles =
target.roles.cache

.filter(role =>
    role.id !== interaction.guild.id
)

.filter(role =>
    !role.managed
)

.map(role =>
    role.id
);





data[target.id] = {

roles:savedRoles,

jailedBy:interaction.user.id,

date:Date.now()

};



saveData(data);




await target.roles.remove(savedRoles)
.catch(()=>{});



await target.roles.add(JAIL_ROLE_ID)
.catch(()=>{});






// DM Member

await target.send({

embeds:[

new EmbedBuilder()

.setTitle("You have been jailed")

.setDescription(

`You have been jailed in **${interaction.guild.name}**.\n\n`+

`Staff member: ${interaction.user}\n`+

`Reason: ${reason}`

)

.setColor("Red")

.setTimestamp()

]

}).catch(()=>{});







// Staff response

await interaction.reply({

embeds:[

new EmbedBuilder()

.setTitle("Member Jailed")

.setDescription(

`${target} has been placed in jail.\n\n`+

`Reason: ${reason}`

)

.setColor("Red")

]

});







// Jail channel message

const jailChannel =
interaction.guild.channels.cache.get(
    JAIL_CHANNEL_ID
);



if(jailChannel){

await jailChannel.send({

content:`${target}`,

embeds:[

new EmbedBuilder()

.setTitle("Jail Notice")

.setDescription(

`${target}, you have been jailed.\n\n`+

`Reason: **${reason}**\n\n`+

`Please wait for a staff member to assist you and discuss your jail.`

)

.setColor("Red")

.setTimestamp()

]

});

}






// Logs

const logs =
interaction.guild.channels.cache.get(
    LOG_CHANNEL_ID
);



if(logs){

await logs.send({

embeds:[

new EmbedBuilder()

.setTitle("Jail Log")

.setDescription(

`Member: ${target}\n\n`+

`Staff: ${interaction.user}\n`+

`Reason: ${reason}`

)

.setColor("Red")

.setTimestamp()

]

});

}



}


};
