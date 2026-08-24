import { logger } from "../utils/logger.js";

// ============================================================
// .DIV AUTORESPONDER CONFIGURATION
// ============================================================

const DIV_ALLOWED_CHANNELS = new Set([
  '1532187710108860587',
  '1532187753557524581',
  '1531889348323180586',
  '1531889304245243904',
  '1533649909839040592',
  '1531527600718221363',
]);

const DIV_REQUIRED_ROLES = new Set([
  '1531889895474335764',
  '1532221464839848016',
]);

const DIV_GIF_URL = 'https://cdn.discordapp.com/attachments/1155344789152206868/1357924444906983495/217979.gif?ex=6a8d1030&is=6a8bbeb0&hm=bbbdf0b5884e94c088009312d4119487b708a2d6462870d3dcc5e575905470fc';


// ============================================================
// HANDLE .DIV AUTORESPONDER
// ============================================================

export async function handleDivAutoresponder(message) {

  try {

    // --------------------------------------------------
    // CHECK MESSAGE CONTENT (EXACT MATCH)
    // --------------------------------------------------

    if (message.content !== '.div') {
      return;
    }

    logger.debug(`[.div] Detected .div message from ${message.author.tag} in channel ${message.channel.id}`);


    // --------------------------------------------------
    // CHECK CHANNEL AUTHORIZATION
    // --------------------------------------------------

    if (!DIV_ALLOWED_CHANNELS.has(message.channel.id)) {
      logger.debug(`[.div] Channel ${message.channel.id} not in allowed list. Ignoring.`);
      return;
    }

    logger.debug(`[.div] Channel ${message.channel.id} is allowed.`);


    // --------------------------------------------------
    // CHECK ROLE AUTHORIZATION
    // --------------------------------------------------

    const member = message.member;

    if (!member) {
      logger.warn(`[.div] Could not get member object for ${message.author.tag}`);
      return;
    }

    const hasRequiredRole = Array.from(DIV_REQUIRED_ROLES).some(
      roleId => member.roles.cache.has(roleId)
    );

    if (!hasRequiredRole) {
      logger.debug(`[.div] User ${message.author.tag} does not have required roles. Ignoring.`);
      return;
    }

    logger.debug(`[.div] User ${message.author.tag} has required role. Proceeding.`);


    // --------------------------------------------------
    // DELETE USER'S .DIV MESSAGE
    // --------------------------------------------------

    try {

      await message.delete();
      logger.info(`[.div] Deleted .div message from ${message.author.tag}`);

    } catch (error) {

      logger.warn(
        `[.div] Failed to delete .div message from ${message.author.tag}: ${error.message}`
      );

    }


    // --------------------------------------------------
    // SEND GIF RESPONSE
    // --------------------------------------------------

    try {

      await message.channel.send(DIV_GIF_URL);
      logger.info(`[.div] Sent GIF to channel ${message.channel.id}`);

    } catch (error) {

      logger.warn(
        `[.div] Failed to send .div GIF in channel ${message.channel.id}: ${error.message}`
      );

    }

  } catch (error) {

    logger.error(
      "[.div] Autoresponder error:",
      error
    );

  }

}

export default {
  handleDivAutoresponder,
};
