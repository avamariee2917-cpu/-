import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { WarningService } from '../../services/moderation/warningService.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';



const MOD_LOG_CHANNEL = "1533730276965089390";





async function sendWarnDM(user, guild, staff, reason, totalCount){

    await user.send({

        embeds:[

            new EmbedBuilder()

            .setTitle("You have received a warning")

            .setDescription(

                `You have been warned in **${guild.name}**.\n\n`+

                `Staff: ${staff}\n\n`+

                `Reason: ${reason}\n\n`+

                `Total warnings: ${totalCount}`

            )

            .setColor("Orange")

            .setTimestamp()

        ]

    }).catch(()=>{});

}





async function sendWarnLog(guild, data){


    const channel =

        await guild.channels.fetch(
            MOD_LOG_CHANNEL
        ).catch(()=>null);



    if(!channel){

        console.log(
            "Warn log channel not found."
        );

        return;

    }





    const embed =

        new EmbedBuilder()

        .setTitle("Warning Log")

        .setDescription(

            `Member: ${data.member}\n\n`+

            `Staff: ${data.staff}\n\n`+

            `Reason: ${data.reason}\n\n`+

            `Total warnings: ${data.totalCount}\n\n`+

            `Warning ID: ${data.warningId}`

        )

        .setColor("Orange")

        .setTimestamp();





    await channel.send({

        embeds:[embed]

    }).catch(error=>{

        logger.error(
            "Failed to send warn log:",
            error
        );

    });


}





export default {


data:

new SlashCommandBuilder()

.setName("warn")

.setDescription("Warn a user")



.addUserOption(option =>

    option

    .setName("target")

    .setDescription("User to warn")

    .setRequired(true)

)



.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason for the warning")

    .setRequired(true)

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

"Warn interaction defer failed",

{

userId:interaction.user.id,

guildId:interaction.guildId,

commandName:"warn"

}

);


return;

}







const target =

interaction.options.getUser(
    "target"
);



const member =

interaction.options.getMember(
    "target"
);



const reason =

interaction.options.getString(
    "reason"
);



const moderator =

interaction.user;







if(!target){

throw new TitanBotError(

"Missing target user",

ErrorTypes.USER_INPUT,

"You must specify a user to warn."

);

}






if(!reason){

throw new TitanBotError(

"Missing warning reason",

ErrorTypes.VALIDATION,

"You must provide a reason."

);

}







if(!member){

throw new TitanBotError(

"Target not found",

ErrorTypes.USER_INPUT,

"The target user is not currently in this server."

);

}







ModerationService.assertModerationHierarchy(

interaction.member,

member,

"warn"

);







const { id, totalCount } =

await WarningService.addWarning({

guildId:interaction.guildId,

userId:target.id,

moderatorId:moderator.id,

reason,

timestamp:Date.now()

});







await sendWarnDM(

target,

interaction.guild,

moderator,

reason,

totalCount

);







await sendWarnLog(

interaction.guild,

{

member:target,

staff:moderator,

reason,

totalCount,

warningId:id

}

);







await InteractionHelper.safeEditReply(

interaction,

{

embeds:[

successEmbed(

"User Warned",

`${target.tag} has received a warning.\n\nReason: ${reason}\nTotal warnings: ${totalCount}`

)

]

}

);



}



};
