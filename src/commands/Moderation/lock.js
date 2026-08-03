import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';



const MOD_LOG_CHANNEL = "1533730276965089390";



async function sendLockLog(guild, data){

    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Lock log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Channel Lock Log")

    .setDescription(

        `**Channel:** ${data.channel}\n\n`+

        `**Staff:** ${data.staff}\n`+

        `**Reason:** ${data.reason}`

    )

    .setColor("Red")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        console.log(
            "Failed to send lock log:",
            error
        );

    });

}




export default {


data:

new SlashCommandBuilder()

.setName("lock")

.setDescription(
    "Locks the current channel."
)


.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for locking the channel")

    .setRequired(false)

)


.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels
),



category:"moderation",





async execute(interaction, config, client){



const deferSuccess =
await InteractionHelper.safeDefer(
    interaction
);



if(!deferSuccess){

logger.warn(
"Lock interaction defer failed",
{
userId:interaction.user.id,
guildId:interaction.guildId,
commandName:"lock"
}
);

return;

}






const channel =
interaction.channel;



const everyoneRole =
interaction.guild.roles.everyone;



const reason =
interaction.options.getString("reason")
||
"No reason provided";






try{



const currentPermissions =
channel.permissionsFor(
    everyoneRole
);





if(
currentPermissions.has(
    PermissionFlagsBits.SendMessages
) === false
){


return replyUserError(

interaction,

{

type:ErrorTypes.UNKNOWN,

message:
`${channel} is already locked.`

}

);


}






await channel.permissionOverwrites.edit(

everyoneRole,

{

SendMessages:false

},

{

type:0,

reason:
`Channel locked by ${interaction.user.tag}`

}

);







await sendLockLog(

interaction.guild,

{

channel,

staff:interaction.user,

reason

}

);







await InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"Channel Locked",

`${channel} is now locked.\n\nReason: ${reason}`

)

]

}

);





}

catch(error){



logger.error(
"Lock command error:",
error
);



await replyUserError(

interaction,

{

type:ErrorTypes.PERMISSION,

message:
"An error occurred while locking the channel. Check my permissions."

}

);


}



}



};
