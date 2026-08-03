import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';



const MOD_LOG_CHANNEL = "1533730276965089390";



async function sendMassKickLog(guild, data){

    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Masskick log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Mass Kick Log")

    .setDescription(

        `**Staff:** ${data.staff}\n\n`+

        `**Users Kicked:**\n${data.users}\n\n`+

        `**Reason:** ${data.reason}\n\n`+

        `**Total:** ${data.total}`

    )

    .setColor("Orange")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send masskick log:",
            error
        );

    });

}





export default {


data: new SlashCommandBuilder()

.setName("masskick")

.setDescription("Kick multiple users from the server at once")



.addStringOption(option =>

    option

    .setName("users")

    .setDescription("User IDs or mentions separated by spaces or commas")

    .setRequired(true)

)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for the mass kick")

    .setRequired(false)

)



.setDefaultMemberPermissions(
    PermissionFlagsBits.KickMembers
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
"Masskick interaction defer failed",
{
userId:interaction.user.id,
guildId:interaction.guildId,
commandName:"masskick"
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






const userIds =

usersInput

.replace(/<@!?(\d+)>/g,'$1')

.split(/[\s,]+/)

.filter(id =>

id && /^\d+$/.test(id)

)

.slice(0,20);






if(userIds.length === 0){

return replyUserError(

interaction,

{

type:ErrorTypes.VALIDATION,

message:
"Please provide valid user IDs or mentions. Maximum 20 users at once."

}

);

}






if(userIds.includes(interaction.user.id)){

return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:
"You cannot include yourself in a mass kick."

}

);

}






if(userIds.includes(client.user.id)){

return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:
"You cannot include the bot in a mass kick."

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


const member =

await interaction.guild.members.fetch(
    userId
)

.catch(()=>null);





if(!member){

results.failed.push({

userId,

reason:"User not in server"

});

continue;

}






const modCheck =

ModerationService.validateHierarchy(

interaction.member,

member,

"kick"

);





if(!modCheck.valid){

results.skipped.push({

user:member.user.tag,

userId,

reason:

ModerationService.buildHierarchySkipReason(

interaction.member,

member,

"kick"

)

});


continue;

}







const botCheck =

ModerationService.validateBotHierarchy(

member,

"kick"

);





if(!botCheck.valid){

results.skipped.push({

user:member.user.tag,

userId,

reason:"Bot role is too low."

});


continue;

}







if(!member.kickable){

results.skipped.push({

user:member.user.tag,

userId,

reason:"Member cannot be kicked."

});


continue;

}







await member.kick(reason);






results.successful.push({

user:member.user.tag,

userId

});





}

catch(error){


logger.error(
`Failed to kick user ${userId}:`,
error
);



results.failed.push({

userId,

reason:
error instanceof TitanBotError

? error.userMessage || error.message

: error.message || "Unknown error"

});


}



}







let description =
"Mass kick completed.\n\n";






if(results.successful.length){

description +=

`Successfully kicked (${results.successful.length}):\n`+

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







await sendMassKickLog(

interaction.guild,

{

staff:interaction.user,

users:

results.successful

.map(x=>`${x.user} (${x.userId})`)

.join("\n")
||
"No users kicked",

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

"Mass Kick Completed",

description

)

]

}

);



}


};
