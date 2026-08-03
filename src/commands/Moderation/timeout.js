import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';



const MOD_LOG_CHANNEL = "1533730276965089390";



const durationChoices = [
    { name: "5 minutes", value: 5 },
    { name: "10 minutes", value: 10 },
    { name: "30 minutes", value: 30 },
    { name: "1 hour", value: 60 },
    { name: "6 hours", value: 360 },
    { name: "1 day", value: 1440 },
    { name: "1 week", value: 10080 },
];





async function sendTimeoutLog(guild, data){


    const channel =
        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Timeout log channel not found."
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle("Timeout Log")

    .setDescription(

        `**Member:** ${data.member}\n\n`+

        `**Staff:** ${data.staff}\n\n`+

        `**Duration:** ${data.duration}\n\n`+

        `**Reason:** ${data.reason}\n\n`+

        `**Case ID:** #${data.caseId}`

    )

    .setColor("Orange")

    .setTimestamp();



    await channel.send({

        embeds:[embed]

    }).catch(()=>{});


}





async function sendTimeoutDM(user, guild, staff, duration, reason){


    await user.send({

        embeds:[

            new EmbedBuilder()

            .setTitle("You have been timed out")

            .setDescription(

                `You have received a timeout in **${guild.name}**.\n\n`+

                `**Staff:** ${staff}\n\n`+

                `**Duration:** ${duration}\n\n`+

                `**Reason:** ${reason}`

            )

            .setColor("Orange")

            .setTimestamp()

        ]

    }).catch(()=>{});


}







export default {


data:

new SlashCommandBuilder()

.setName("timeout")

.setDescription("Timeout a user for a specific duration.")



.addUserOption(option =>

    option

    .setName("target")

    .setDescription("User to timeout")

    .setRequired(true)

)



.addIntegerOption(option =>

    option

    .setName("duration")

    .setDescription("Duration of the timeout")

    .setRequired(true)

    .addChoices(
        ...durationChoices
    )

)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for the timeout")

    .setRequired(false)

)



.setDefaultMemberPermissions(

    PermissionFlagsBits.ModerateMembers

),



category:"moderation",





async execute(interaction, config, client){



const deferSuccess =

await InteractionHelper.safeDefer(

    interaction

);





if(!deferSuccess){

logger.warn(

"Timeout interaction defer failed",

{

userId:interaction.user.id,

guildId:interaction.guildId,

commandName:"timeout"

}

);


return;

}







const targetUser =

interaction.options.getUser(
    "target"
);



const member =

interaction.options.getMember(
    "target"
);



const durationMinutes =

interaction.options.getInteger(
    "duration"
);



const reason =

interaction.options.getString(
    "reason"
)

||

"No reason provided";







if(!targetUser){

throw new TitanBotError(

"Missing target user",

ErrorTypes.USER_INPUT,

"You must specify a user to timeout."

);

}







if(targetUser.id === interaction.user.id){

throw new TitanBotError(

"Cannot timeout self",

ErrorTypes.VALIDATION,

"You cannot timeout yourself."

);

}







if(targetUser.id === client.user.id){

throw new TitanBotError(

"Cannot timeout bot",

ErrorTypes.VALIDATION,

"You cannot timeout the bot."

);

}







if(!member){

throw new TitanBotError(

"Target not found",

ErrorTypes.USER_INPUT,

"The target user is not currently in this server."

);

}







const durationMs =

durationMinutes * 60 * 1000;






const result =

await ModerationService.timeoutUser({

guild:interaction.guild,

member,

moderator:interaction.member,

durationMs,

reason

});







const durationDisplay =

durationChoices.find(

c => c.value === durationMinutes

)?.name

||

`${durationMinutes} minutes`;








await sendTimeoutDM(

targetUser,

interaction.guild,

interaction.user,

durationDisplay,

reason

);







await sendTimeoutLog(

interaction.guild,

{

member:targetUser,

staff:interaction.user,

duration:durationDisplay,

reason,

caseId:result.caseId

}

);







await InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"User Timed Out",

`${targetUser.tag} has been timed out for ${durationDisplay}.\n\nReason: ${reason}\nCase ID: #${result.caseId}`

)

]

}

);



}



};
