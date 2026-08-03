import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';


const MOD_LOG_CHANNEL = "1533730276965089390";



async function sendMassBanLog(guild, data){


    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Massban log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Mass Ban Log")

    .setDescription(

        `**Staff:** ${data.moderator}\n\n`+

        `**Users Banned:**\n${data.users}\n\n`+

        `**Reason:** ${data.reason}\n\n`+

        `**Total:** ${data.total}`

    )

    .setColor("Red")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send massban log:",
            error
        );

    });

}





export default {


data: new SlashCommandBuilder()

.setName("massban")

.setDescription("Ban multiple users from the server at once")



.addStringOption(option =>

    option

    .setName("users")

    .setDescription("User IDs or mentions separated by spaces or commas")

    .setRequired(true)

)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for the mass ban")

    .setRequired(false)

)



.addIntegerOption(option =>

    option

    .setName("delete_days")

    .setDescription("Number of days of messages to delete")

    .setMinValue(0)

    .setMaxValue(7)

    .setRequired(false)

)



.setDefaultMemberPermissions(
    PermissionFlagsBits.BanMembers
),




category:"moderation",



abuseProtection:{
    maxAttempts:3,
    windowMs:60000
},





async execute(interaction, config, client){



const deferSuccess =
await InteractionHelper.safeDefer(
    interaction
);



if(!deferSuccess){

logger.warn(
"Massban interaction defer failed",
{
userId:interaction.user.id,
guildId:interaction.guildId,
commandName:"massban"
}
);

return;

}





const usersInput =
interaction.options.getString("users");



const reason =
interaction.options.getString("reason")
||
"No reason provided";



const deleteDays =
interaction.options.getInteger("delete_days")
||
0;






const userIds =
usersInput

.replace(/<@!?(\d+)>/g,'$1')

.split(/[\s,]+/)

.filter(id =>
id &&
/^\d+$/.test(id)
)

.slice(0,20);






if(userIds.length === 0){

return replyUserError(
interaction,
{
type:ErrorTypes.VALIDATION,
message:
"Please provide valid user IDs or mentions."
}
);

}






if(userIds.includes(interaction.user.id)){

return replyUserError(
interaction,
{
type:ErrorTypes.UNKNOWN,
message:
"You cannot include yourself in a mass ban."
}
);

}





if(userIds.includes(client.user.id)){

return replyUserError(
interaction,
{
type:ErrorTypes.UNKNOWN,
message:
"You cannot include the bot in a mass ban."
}
);

}







const results = {

successful:[],

failed:[],

skipped:[]

};







for(const userId of userIds){


try{


const user =
await client.users.fetch(
userId
).catch(()=>null);




if(!user){

results.failed.push({

userId,

reason:"User not found"

});

continue;

}






const member =
await interaction.guild.members.fetch(
userId
).catch(()=>null);






if(member){



const modCheck =
ModerationService.validateHierarchy(

interaction.member,

member,

"ban"

);




if(!modCheck.valid){


results.skipped.push({

user:user.tag,

userId,

reason:
ModerationService.buildHierarchySkipReason(

interaction.member,

member,

"ban"

)

});


continue;


}






const botCheck =
ModerationService.validateBotHierarchy(

member,

"ban"

);





if(!botCheck.valid){


results.skipped.push({

user:user.tag,

userId,

reason:
"Bot role is too low."

});


continue;


}


}







await interaction.guild.members.ban(

userId,

{

reason,

deleteMessageSeconds:
deleteDays * 24 * 60 * 60

}

);







results.successful.push({

user:user.tag,

userId

});






}

catch(error){



logger.error(
`Failed to massban ${userId}:`,
error
);



results.failed.push({

userId,

reason:
error.message || "Unknown error"

});


}


}









let description =
"Mass ban completed.\n\n";





if(results.successful.length){

description +=

`Successfully banned (${results.successful.length}):\n`+

results.successful

.map(x=>`${x.user} (${x.userId})`)

.join("\n")

+

"\n\n";

}





if(results.skipped.length){

description +=

`Skipped (${results.skipped.length}):\n`+

results.skipped

.map(x=>`${x.user} - ${x.reason}`)

.join("\n")

+

"\n\n";

}







if(results.failed.length){

description +=

`Failed (${results.failed.length}):\n`+

results.failed

.map(x=>`${x.userId} - ${x.reason}`)

.join("\n");

}








await sendMassBanLog(

interaction.guild,

{

moderator:interaction.user,

users:

results.successful

.map(x=>`${x.user} (${x.userId})`)

.join("\n")
||
"No users banned",

reason,

total:
results.successful.length

}

);








const embedFunction =

results.successful.length > 0

? successEmbed

: warningEmbed;







return InteractionHelper.safeEditReply(

interaction,

{

embeds:[

embedFunction(

"Mass Ban Completed",

description

)

]

}

);



}


};
