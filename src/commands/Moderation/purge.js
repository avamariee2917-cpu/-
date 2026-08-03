import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';



const MOD_LOG_CHANNEL = "1533730276965089390";



async function sendPurgeLog(guild, data){

    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Purge log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Purge Log")

    .setDescription(

        `**Staff:** ${data.staff}\n\n`+

        `**Channel:** ${data.channel}\n\n`+

        `**Messages Deleted:** ${data.amount}\n\n`+

        `**Reason:** ${data.reason}`

    )

    .setColor("Red")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send purge log:",
            error
        );

    });

}




export default {


data:

new SlashCommandBuilder()

.setName("purge")

.setDescription("Delete a specific amount of messages")



.addIntegerOption(option =>

    option

    .setName("amount")

    .setDescription("Number of messages (1-100)")

    .setRequired(true)

)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for deleting messages")

    .setRequired(false)

)



.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages
),



category:"moderation",



abuseProtection:{
    maxAttempts:5,
    windowMs:60000
},





async execute(interaction, config, client){



const deferSuccess =

await InteractionHelper.safeDefer(

    interaction,

    {
        flags: MessageFlags.Ephemeral
    }

);





if(!deferSuccess){

logger.warn(

"Purge interaction defer failed",

{

userId:interaction.user.id,

guildId:interaction.guildId,

commandName:"purge"

}

);


return;

}






const amount =

interaction.options.getInteger(
    "amount"
);



const reason =

interaction.options.getString(
    "reason"
)

||

"No reason provided";





const channel =

interaction.channel;






if(amount < 1 || amount > 100){

return replyUserError(

interaction,

{

type:ErrorTypes.VALIDATION,

message:
"Please specify a number between 1 and 100."

}

);

}






try{



const fetched =

await channel.messages.fetch({

limit:amount

});





const deleted =

await channel.bulkDelete(

fetched,

true

);





const deletedCount =

deleted.size;







await sendPurgeLog(

interaction.guild,

{

staff:interaction.user,

channel,

amount:deletedCount,

reason

}

);







await InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"Messages Purged",

`Deleted ${deletedCount} messages in ${channel}.`

)

],

flags:MessageFlags.Ephemeral

}

);







setTimeout(()=>{

interaction.deleteReply()

.catch(()=>{});

},3000);






}

catch(error){



logger.error(

"Purge command error:",

error

);





await replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:
"An error occurred while deleting messages. Messages older than 14 days cannot be bulk deleted."

}

);



}



}



};
