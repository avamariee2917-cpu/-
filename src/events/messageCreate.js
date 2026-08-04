import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import {
  supportsPrefixExecution,
  executePrefixCommand,
  resolvePrefixAccessKey,
} from '../utils/messageAdapter.js';
import {
  resolveCommandAlias,
  resolveSubcommandAlias,
} from '../config/commands/commandAliases.js';
import { getPrefixRestriction } from '../config/commands/prefixRestrictions.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import {
  getPrefixCommand,
  getBotMessage,
  isBotOwner,
  isCommandCategoryEnabled,
  isMaintenanceMode,
} from '../config/bot.js';
import {
  enforceAbuseProtection,
  formatCooldownDuration,
} from '../utils/abuseProtection.js';
import { createEmbed } from '../utils/embeds.js';
import { isCommandEnabled } from '../services/commandAccessService.js';

import fs from "fs";
import path from "path";

import {
  getCountingGameConfig,
  saveCountingGameConfig,
  isValidCountingMessage,
  recordCorrectCount,
} from '../services/countingGameService.js';



export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    try {

      if (message.author.bot || !message.guild) return;


      await handleNameReacts(message);


      logger.debug(
        `Message received from ${message.author.tag}: ${message.content}`
      );


      const countingProcessed = await handleCountingGame(message, client);

      if (countingProcessed) {
        return;
      }


      await handlePrefixCommand(message, client);


    } catch (error) {

      logger.error(
        'Error in messageCreate event:',
        error
      );

    }
  },
};



async function handlePrefixCommand(message, client) {

  try {

    const guildConfig = await getGuildConfig(
      client,
      message.guild.id
    );


    const prefix = getPrefixCommand();


    const parsed = parsePrefixCommand(
      message.content,
      prefix
    );


    if (!parsed) return;


    let {
      commandName,
      args
    } = parsed;



    const musicShortcut =
      commandName.toLowerCase();



    const MUSIC_PREFIX_SHORTCUTS = new Set([
      'leave',
      'pause',
      'resume',
      'skip',
      'stop',
      'volume',
    ]);



    if (MUSIC_PREFIX_SHORTCUTS.has(musicShortcut)) {

      commandName = 'music';

      args = [
        musicShortcut,
        ...args
      ];

    }



    const resolvedCommandName =
      resolveCommandAlias(commandName);



    const command =
      client.commands.get(resolvedCommandName);



    if (!command) {

      logger.warn(
        `Command not found: ${resolvedCommandName}`
      );

      return;

    }
        if (
      isMaintenanceMode() &&
      !isBotOwner(message.author.id)
    ) {

      await message.channel.send({

        embeds: [

          createEmbed({

            title: 'Maintenance Mode',

            description:
              getBotMessage('maintenanceMode'),

            color: 'warning',

          }),

        ],

      });


      return;

    }




    if (
      !isCommandCategoryEnabled(command.category)
    ) {


      await message.channel.send({

        embeds: [

          createEmbed({

            title: 'Feature Disabled',

            description:
              getBotMessage('commandDisabled'),

            color: 'error',

          }),

        ],

      });


      return;

    }




    const restriction =
      getPrefixRestriction(
        command,
        args,
        resolveSubcommandAlias
      );



    if (
      !supportsPrefixExecution(command) ||
      restriction.blocked
    ) {



      if (
        restriction.blocked &&
        restriction.reason
      ) {


        await message.channel.send({

          embeds: [

            createEmbed({

              title: 'Slash Command Only',

              description:
                `${restriction.reason}\nUse \`/${resolvedCommandName}\` instead.`,

              color: 'info',

            }),

          ],

        });


      }


      return;

    }





    const enabled =
      await isCommandEnabled(

        client,

        message.guild.id,

        resolvePrefixAccessKey(
          command.data,
          args
        ),

        command.category

      );



    if (!enabled) {


      await message.channel.send({

        embeds: [

          createEmbed({

            title: 'Command Disabled',

            description:
              'This command has been disabled for this server.',

            color: 'error',

          }),

        ],

      });


      return;

    }





    const protection =
      await enforceAbuseProtection(

        {

          guildId:
            message.guild.id,

          user:
            message.author,

        },

        command,

        resolvedCommandName

      );




    if (!protection.allowed) {


      await message.channel.send({

        embeds: [

          createEmbed({

            title: 'Command Cooldown',

            description:
              `Please wait ${formatCooldownDuration(protection.remainingMs)} before trying again.`,

            color: 'error',

          }),

        ],

      });


      return;

    }





    logger.info(

      `Executing prefix command ${prefix}${commandName} by ${message.author.tag}`

    );




    await executePrefixCommand(

      command,

      message,

      args,

      client,

      prefix,

      guildConfig

    );




  } catch(error) {


    logger.error(

      'Error handling prefix command:',

      error

    );

  }

}





async function handleCountingGame(message, client) {


  try {


    const config =
      await getCountingGameConfig(

        client,

        message.guild.id

      );



    if (

      !config.enabled ||

      !config.channelId ||

      message.channel.id !== config.channelId

    ) {

      return false;

    }




    const content =
      message.content.trim();




    const validCount =
      isValidCountingMessage(

        content,

        config

      );




    const invalidAttempt =

      !validCount ||

      message.author.id === config.lastUserId;




    if (invalidAttempt) {



      await message.delete()

        .catch(() => {});




      await saveCountingGameConfig(

        client,

        message.guild.id,

        {

          ...config,

          nextNumber: 1,

          lastUserId: null,

          currentStreak: 0,

        }

      );





      const resetMessage =

        await message.channel.send(

          `Count broken by <@${message.author.id}>. The sequence has been reset to **1**.`

        );





      setTimeout(() => {


        resetMessage.delete()

          .catch(() => {});


      }, 10000);




      return true;


    }





    await recordCorrectCount(

      client,

      message.guild.id,

      message.author.id

    );




    return true;




  } catch(error) {


    logger.error(

      'Error handling counting game:',

      error

    );



    return false;

  }

}





async function handleNameReacts(message) {


  try {


    const filePath = path.join(

      process.cwd(),

      "data",

      "nameReacts.json"

    );



    if (!fs.existsSync(filePath)) return;



    const data = JSON.parse(

      fs.readFileSync(

        filePath,

        "utf8"

      )

    );




    const content =

      message.content.toLowerCase();





    for (const userId in data) {



      const reactData =
        data[userId];




      const member =

        await message.guild.members.fetch(userId)

        .catch(() => null);




      if (!member) continue;




      const names = [


        member.user.username.toLowerCase(),


        member.displayName.toLowerCase(),


        reactData.name.toLowerCase()


      ];





      const mentioned =

        message.mentions.users.has(userId);





      const foundName =

        names.some(name =>

          content.includes(name)

        );





      if (

        mentioned ||

        foundName

      ) {



        for (

          const emoji of reactData.emojis

        ) {



          await message.react(emoji)

            .catch(error => {


              logger.warn(

                `Failed reacting with ${emoji}: ${error.message}`

              );


            });


        }




        break;

      }


    }




  } catch(error) {


    logger.error(

      "Name react error:",

      error

    );


  }


}
