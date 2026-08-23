import 'dotenv/config';

import {
  Client,
  Collection,
  GatewayIntentBits,
} from 'discord.js';

import { REST } from '@discordjs/rest';

import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/application.js';

import {
  initializeDatabase,
} from './utils/database.js';

import {
  getServerCounters,
  saveServerCounters,
  updateCounter,
} from './services/serverstatsService.js';

import {
  logger,
  startupLog,
  shutdownLog,
} from './utils/logger.js';

import {
  checkBirthdays,
} from './services/birthdayService.js';

import {
  checkGiveaways,
} from './services/giveawayService.js';

import {
  loadCommands,
  registerCommands as registerSlashCommands,
} from './handlers/loaders/commandLoader.js';

import {
  runSafeTask,
  handleTaskError,
  ErrorCodes,
} from './utils/errorHandler.js';

import {
  initializeMusic,
} from './services/music/riffySetup.js';

import {
  shutdownMusic,
} from './services/music/playerHandler.js';

import pkg from '../package.json' with { type: 'json' };

import {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_SCHEMA_LABEL,
} from './config/database/schemaVersion.js';


// ============================================================
// FILE PATHS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY =
  path.join(__dirname, '../data');

const LEVELING_FILE =
  path.join(DATA_DIRECTORY, 'leveling.json');


// ============================================================
// LEVELING CONFIGURATION
// ============================================================

const LEVEL_ROLES = {

  5: '1532968053120307301',

  10: '1532969032557396018',

  20: '1532969099918053456',

  30: '1532969151419650099',

  40: '1532969195266904115',

  50: '1532969253005951117',

  60: '1532969414205509714',

  70: '1532969466353160232',

  80: '1532969543100793002',

  90: '1532969608452116601',

  100: '1532974501900451890',

};

const ROLE_LEVELS =
  Object.keys(LEVEL_ROLES)
    .map(Number)
    .sort((a, b) => a - b);


// XP awarded per eligible message
const MIN_XP_PER_MESSAGE = 15;
const MAX_XP_PER_MESSAGE = 25;

// One XP reward every 30 seconds per member
const XP_COOLDOWN = 30 * 1000;

const MAX_LEVEL = 100;

const XP_PER_LEVEL = 100;


// Levels that announce publicly
const ANNOUNCEMENT_LEVELS = new Set([
  10,
  20,
  30,
  40,
  50,
  60,
  70,
  80,
  90,
  100,
]);


// ============================================================
// LEVELING FILE
// ============================================================

function ensureLevelingFile() {

  try {

    if (!fs.existsSync(DATA_DIRECTORY)) {

      fs.mkdirSync(
        DATA_DIRECTORY,
        {
          recursive: true,
        }
      );

    }

    if (!fs.existsSync(LEVELING_FILE)) {

      fs.writeFileSync(
        LEVELING_FILE,
        JSON.stringify({}, null, 2),
        'utf8'
      );

    }

  } catch (error) {

    logger.error(
      'Failed to create leveling file:',
      error
    );

  }

}


// ============================================================
// LOAD LEVELING DATA
// ============================================================

function loadLevelingData() {

  ensureLevelingFile();

  try {

    const rawData =
      fs.readFileSync(
        LEVELING_FILE,
        'utf8'
      );

    if (!rawData.trim()) {

      return {};

    }

    const data =
      JSON.parse(rawData);

    if (
      typeof data !== 'object' ||
      data === null ||
      Array.isArray(data)
    ) {

      logger.warn(
        'Invalid leveling data. Resetting to empty data.'
      );

      return {};

    }

    return data;

  } catch (error) {

    logger.error(
      'Failed to load leveling data:',
      error
    );

    return {};

  }

}


// ============================================================
// SAVE LEVELING DATA
// ============================================================

function saveLevelingDataToFile(data) {

  ensureLevelingFile();

  try {

    fs.writeFileSync(
      LEVELING_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return true;

  } catch (error) {

    logger.error(
      'Failed to save leveling data:',
      error
    );

    return false;

  }

}


// ============================================================
// LEVEL CALCULATIONS
// ============================================================

function calculateLevel(xp) {

  const safeXP =
    Math.max(
      0,
      Number(xp) || 0
    );

  return Math.min(
    MAX_LEVEL,
    Math.floor(
      safeXP / XP_PER_LEVEL
    ) + 1
  );

}


function calculateXPForLevel(level) {

  const safeLevel =
    Math.max(
      1,
      Math.min(
        MAX_LEVEL,
        Number(level) || 1
      )
    );

  return (
    safeLevel - 1
  ) * XP_PER_LEVEL;

}


function getRandomXP() {

  return Math.floor(
    Math.random() *
      (
        MAX_XP_PER_MESSAGE -
        MIN_XP_PER_MESSAGE +
        1
      )
  ) + MIN_XP_PER_MESSAGE;

}


// ============================================================
// BOT
// ============================================================

class TitanBot extends Client {

  constructor() {

    super({

      intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.GuildMessageReactions,

        GatewayIntentBits.MessageContent,

        GatewayIntentBits.DirectMessages,

        GatewayIntentBits.GuildVoiceStates,

        GatewayIntentBits.GuildBans,

      ],

    });


    this.config = config;

    this.commands = new Collection();

    this.events = new Collection();

    this.buttons = new Collection();

    this.selectMenus = new Collection();

    this.modals = new Collection();

    this.cooldowns = new Collection();

    this.db = null;


    this.rest =
      new REST({
        version: '10',
      }).setToken(
        config.bot.token
      );


    // ========================================================
    // LEVELING DATA
    // ========================================================

    this.levelingData =
      loadLevelingData();


    this.levelingCooldowns =
      new Map();


    // Make saving available to commands
    this.saveLevelingData = () => {

      return saveLevelingDataToFile(
        this.levelingData
      );

    };

  }


  // ==========================================================
  // START
  // ==========================================================

  async start() {

    try {

      startupLog(
        'Starting TitanBot...'
      );


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );


      // ------------------------------------------------------
      // DATABASE
      // ------------------------------------------------------

      startupLog(
        'Initializing database...'
      );


      const dbInstance =
        await initializeDatabase();


      this.db =
        dbInstance.db;


      const dbStatus =
        this.db.getStatus();


      if (dbStatus.isDegraded) {

        logger.warn(
          'DATABASE RUNNING IN DEGRADED MODE'
        );

        logger.warn(
          'Data persistence may be disabled.'
        );

      } else {

        startupLog(
          `Database Status: ${dbStatus.connectionType}`
        );

      }


      // ------------------------------------------------------
      // WEB SERVER
      // ------------------------------------------------------

      this.startWebServer();


      // ------------------------------------------------------
      // COMMANDS
      // ------------------------------------------------------

      startupLog(
        'Loading commands...'
      );


      await loadCommands(this);


      startupLog(
        `Commands loaded: ${this.commands.size}`
      );


      // ------------------------------------------------------
      // HANDLERS
      // ------------------------------------------------------

      await this.loadHandlers();


      // ------------------------------------------------------
      // MUSIC
      // ------------------------------------------------------

      initializeMusic(this);


      // ------------------------------------------------------
      // LEVELING
      // ------------------------------------------------------

      this.setupLevelingSystem();


      startupLog(
        'Leveling system loaded'
      );


      startupLog(
        `Level rewards: ${ROLE_LEVELS.length}`
      );


      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      startupLog(
        'Logging into Discord...'
      );


      await this.login(
        this.config.bot.token
      );


      startupLog(
        'Discord login successful'
      );


      // ------------------------------------------------------
      // REGISTER COMMANDS
      // ------------------------------------------------------

      startupLog(
        'Registering slash commands globally...'
      );


      await this.registerCommands();


      startupLog(
        'Slash command registration complete'
      );


      startupLog(
        `ONLINE | ${this.commands.size} commands loaded`
      );


      this.setupCronJobs();

    } catch (error) {

      logger.error(
        'Failed to start bot:',
        error
      );

      process.exit(1);

    }

  }


  // ==========================================================
  // LEVELING SYSTEM
  // ==========================================================

  setupLevelingSystem() {

    this.on(
      'messageCreate',
      async message => {

        try {

          // --------------------------------------------------
          // Ignore bots
          // --------------------------------------------------

          if (
            message.author.bot
          ) {

            return;

          }


          // --------------------------------------------------
          // Ignore DMs
          // --------------------------------------------------

          if (
            !message.guild
          ) {

            return;

          }


          // --------------------------------------------------
          // Make sure member exists
          // --------------------------------------------------

          const member =
            message.member;


          if (!member) {

            return;

          }


          // --------------------------------------------------
          // XP COOLDOWN
          // --------------------------------------------------

          const cooldownKey =
            `${message.guild.id}:${message.author.id}`;


          const now =
            Date.now();


          const lastXPTime =
            this.levelingCooldowns.get(
              cooldownKey
            );


          if (
            lastXPTime &&
            now - lastXPTime <
              XP_COOLDOWN
          ) {

            return;

          }


          // --------------------------------------------------
          // CREATE GUILD DATA
          // --------------------------------------------------

          if (
            !this.levelingData[
              message.guild.id
            ]
          ) {

            this.levelingData[
              message.guild.id
            ] = {};

          }


          // --------------------------------------------------
          // CREATE USER DATA
          // --------------------------------------------------

          if (
            !this.levelingData[
              message.guild.id
            ][message.author.id]
          ) {

            this.levelingData[
              message.guild.id
            ][message.author.id] = {

              xp: 0,

              level: 1,

            };

          }


          const userData =
            this.levelingData[
              message.guild.id
            ][message.author.id];


          const oldXP =
            Number(userData.xp) || 0;


          const oldLevel =
            Number(userData.level) || 1;


          // --------------------------------------------------
          // GIVE XP
          // --------------------------------------------------

          const gainedXP =
            getRandomXP();


          const newXP =
            oldXP + gainedXP;


          const newLevel =
            calculateLevel(newXP);


          userData.xp =
            newXP;


          userData.level =
            newLevel;


          // --------------------------------------------------
          // START COOLDOWN
          // --------------------------------------------------

          this.levelingCooldowns.set(
            cooldownKey,
            now
          );


          // --------------------------------------------------
          // SAVE
          // --------------------------------------------------

          this.saveLevelingData();


          logger.info(
            `${message.author.tag} earned ${gainedXP} XP. Total: ${newXP}. Level: ${newLevel}`
          );


          // --------------------------------------------------
          // LEVEL UP
          // --------------------------------------------------

          if (
            newLevel <= oldLevel
          ) {

            return;

          }


          // --------------------------------------------------
          // UPDATE ROLES
          // --------------------------------------------------

          await this.updateLevelRoles(
            member,
            newLevel
          );


          // --------------------------------------------------
          // ANNOUNCEMENT
          // --------------------------------------------------

          for (
            const milestone
            of ANNOUNCEMENT_LEVELS
          ) {

            if (
              newLevel >= milestone &&
              oldLevel < milestone
            ) {

              await message.channel.send(
                `.⋆♱ <@${message.author.id}> 𝚑𝚊𝚜 𝚛𝚎𝚊𝚌𝚑𝚎𝚍 𝚕𝚎𝚟𝚎𝚕 **${milestone}**.`
              );

            }

          }

        } catch (error) {

          logger.error(
            'Error processing leveling message:',
            error
          );

        }

      }
    );

  }


  // ==========================================================
  // LEVEL ROLE SYSTEM
  // ==========================================================

  async updateLevelRoles(
    member,
    level
  ) {

    try {

      const guild =
        member.guild;


      const botMember =
        guild.members.me ||
        await guild.members.fetchMe();


      if (!botMember) {

        return;

      }


      // Roles the member qualifies for
      const qualifyingRoles =
        ROLE_LEVELS
          .filter(
            roleLevel =>
              roleLevel <= level
          )
          .map(
            roleLevel =>
              LEVEL_ROLES[roleLevel]
          );


      // ------------------------------------------------------
      // REMOVE ROLES ABOVE LEVEL
      // ------------------------------------------------------

      for (
        const roleLevel
        of ROLE_LEVELS
      ) {

        const roleId =
          LEVEL_ROLES[roleLevel];


        if (
          roleLevel <= level
        ) {

          continue;

        }


        if (
          !member.roles.cache.has(
            roleId
          )
        ) {

          continue;

        }


        const role =
          guild.roles.cache.get(
            roleId
          );


        if (!role) {

          continue;

        }


        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          logger.warn(
            `Cannot remove ${role.name}; it is above the bot's highest role.`
          );

          continue;

        }


        try {

          await member.roles.remove(
            role,
            `Level is now ${level}`
          );

        } catch (error) {

          logger.warn(
            `Could not remove ${role.name}:`,
            error.message
          );

        }

      }


      // ------------------------------------------------------
      // ADD ALL QUALIFYING ROLES
      // ------------------------------------------------------

      for (
        const roleId
        of qualifyingRoles
      ) {

        if (
          member.roles.cache.has(
            roleId
          )
        ) {

          continue;

        }


        const role =
          guild.roles.cache.get(
            roleId
          );


        if (!role) {

          continue;

        }


        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          logger.warn(
            `Cannot add ${role.name}; it is above the bot's highest role.`
          );

          continue;

        }


        try {

          await member.roles.add(
            role,
            `Reached level ${level}`
          );

        } catch (error) {

          logger.warn(
            `Could not add ${role.name}:`,
            error.message
          );

        }

      }

    } catch (error) {

      logger.error(
        'Failed to update leveling roles:',
        error
      );

    }

  }


  // ==========================================================
  // WEB SERVER
  // ==========================================================

  startWebServer() {

    const app =
      express();


    const port =
      Number(
        this.config.api?.port ||
        process.env.PORT ||
        3000
      );


    const host =
      process.env.WEB_HOST ||
      '0.0.0.0';


    app.get(
      '/health',
      (req, res) => {

        res.status(200).json({

          status: 'healthy',

          timestamp:
            new Date().toISOString(),

          uptime:
            process.uptime(),

        });

      }
    );


    app.get(
      '/',
      (req, res) => {

        res.status(200).json({

          message:
            'TitanBot System Online',

          version:
            pkg.version,

          timestamp:
            new Date().toISOString(),

        });

      }
    );


    this.webServer =
      app.listen(
        port,
        host,
        () => {

          startupLog(
            `Web Server running on ${host}:${port}`
          );

        }
      );

  }


  // ==========================================================
  // CRON JOBS
  // ==========================================================

  setupCronJobs() {

    cron.schedule(
      '0 6 * * *',
      runSafeTask(
        'birthday_check',
        () =>
          checkBirthdays(this)
      )
    );


    cron.schedule(
      '* * * * *',
      runSafeTask(
        'giveaway_check',
        () =>
          checkGiveaways(this)
      )
    );


    cron.schedule(
      '*/15 * * * *',
      runSafeTask(
        'counter_update',
        () =>
          this.updateAllCounters()
      )
    );

  }


  // ==========================================================
  // COUNTERS
  // ==========================================================

  async updateAllCounters() {

    if (!this.db) {

      return;

    }


    for (
      const [guildId, guild]
      of this.guilds.cache
    ) {

      try {

        const counters =
          await getServerCounters(
            this,
            guildId
          );


        const validCounters = [];


        for (
          const counter
          of counters
        ) {

          if (
            !counter ||
            !counter.type ||
            !counter.channelId ||
            counter.enabled === false
          ) {

            continue;

          }


          const channel =
            guild.channels.cache.get(
              counter.channelId
            );


          if (!channel) {

            continue;

          }


          validCounters.push(
            counter
          );


          await updateCounter(
            this,
            guild,
            counter
          );

        }


        await saveServerCounters(
          this,
          guildId,
          validCounters
        );

      } catch (error) {

        logger.error(
          `Counter update error for guild ${guildId}:`,
          error
        );

      }

    }

  }


  // ==========================================================
  // HANDLERS
  // ==========================================================

  async loadHandlers() {

    const handlers = [

      {
        path: 'events',
        required: true,
      },

      {
        path: 'interactions',
        required: true,
      },

    ];


    for (
      const handler
      of handlers
    ) {

      try {

        const module =
          await import(
            `./handlers/loaders/${handler.path}.js`
          );


        const loader =
          module.default;


        if (
          typeof loader !==
          'function'
        ) {

          throw new Error(
            `Invalid loader for ${handler.path}`
          );

        }


        await loader(this);


      } catch (error) {

        if (
          handler.required
        ) {

          logger.error(
            `Failed to load ${handler.path}:`,
            error
          );

          throw error;

        }

      }

    }

  }


  // ==========================================================
  // REGISTER COMMANDS
  // ==========================================================

  async registerCommands() {

    try {

      await registerSlashCommands(
        this,
        {
          clientId:
            this.config.bot.clientId,
        }
      );

    } catch (error) {

      logger.error(
        'Error registering commands:',
        error
      );

    }

  }


  // ==========================================================
  // SHUTDOWN
  // ==========================================================

  async shutdown(
    reason = 'UNKNOWN'
  ) {

    shutdownLog(
      `Bot shutting down (${reason})...`
    );


    try {

      // Stop cron jobs
      cron
        .getTasks()
        .forEach(
          task =>
            task.stop()
        );


      // Stop music
      await shutdownMusic(
        this
      );


      // Save leveling data
      this.saveLevelingData();


      // Close web server
      if (
        this.webServer
      ) {

        await new Promise(
          resolve =>
            this.webServer.close(
              resolve
            )
        );

      }


      // Close database
      if (
        this.db &&
        this.db.db &&
        this.db.db.pool
      ) {

        await this.db.db.pool.end();

      }


      // Destroy Discord client
      if (
        this.isReady()
      ) {

        this.destroy();

      }


      shutdownLog(
        'Bot stopped successfully.'
      );


      process.exit(0);

    } catch (error) {

      logger.error(
        'Shutdown error:',
        error
      );

      process.exit(1);

    }

  }

}


// ============================================================
// START BOT
// ============================================================

try {

  const bot =
    new TitanBot();


  process.on(
    'SIGTERM',
    () =>
      bot.shutdown(
        'SIGTERM'
      )
  );


  process.on(
    'SIGINT',
    () =>
      bot.shutdown(
        'SIGINT'
      )
  );


  process.on(
    'uncaughtException',
    error => {

      handleTaskError(
        'uncaught_exception',
        error,
        {
          fatal: true,
        }
      );


      bot.shutdown(
        'UNCAUGHT_EXCEPTION'
      );

    }
  );


  process.on(
    'unhandledRejection',
    reason => {

      const code =
        reason?.code;


      if (
        code === 10062 ||
        code === 40060 ||
        code === 50027
      ) {

        logger.warn(
          'Recoverable Discord interaction rejection:',
          reason?.message ||
          reason
        );

        return;

      }


      if (
        reason?.message?.includes(
          'Queue is empty'
        )
      ) {

        return;

      }


      handleTaskError(
        'unhandled_rejection',
        reason instanceof Error
          ? reason
          : new Error(
              String(reason)
            ),
        {
          errorCode:
            ErrorCodes.UNHANDLED_REJECTION,
        }
      );

    }
  );


  bot
    .start()
    .catch(
      error => {

        logger.error(
          'Fatal startup error:',
          error
        );


        bot.shutdown(
          'STARTUP_ERROR'
        );

      }
    );


} catch (error) {

  logger.error(
    'Fatal bot startup error:',
    error
  );

  process.exit(1);

}


export default TitanBot;
