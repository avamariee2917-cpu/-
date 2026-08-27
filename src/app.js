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

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const DATA_DIRECTORY =
  path.join(__dirname, '../data');

const LEVELING_FILE =
  path.join(DATA_DIRECTORY, 'leveling.json');


// ============================================================
// LEVELING CHANNELS
// ============================================================

const LEVELING_CHANNELS = new Set([
  '1531439019529994283',
  '1531441681893691514',
  '1531444290054656091',
  '1531444326339575909',
  '1532518611812618350',
  '1533718033036476497',
  '1533649909839040592',
  '1541320716941664256',
  '1541318089226850304',
  '1541318129626386472',
  '1541318239857147934',
  '1541321227568943174',
  '1531444192214257744',
  '1531444263953498315',
]);


// ============================================================
// LEVELING ROLES
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


// ============================================================
// LEVELING SETTINGS
// ============================================================

const MIN_XP_PER_MESSAGE = 15;

const MAX_XP_PER_MESSAGE = 25;

const XP_COOLDOWN =
  60 * 1000;

const XP_PER_LEVEL =
  100;

const MAX_LEVEL =
  100;

const MAX_XP =
  (MAX_LEVEL - 1) * XP_PER_LEVEL;


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
        'Invalid leveling data detected. Starting fresh.'
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
// LEVEL CALCULATION
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


// ============================================================
// XP CALCULATION
// ============================================================

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
// TITAN BOT
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


    // ========================================================
    // BASIC BOT DATA
    // ========================================================

    this.config =
      config;

    this.commands =
      new Collection();

    this.events =
      new Collection();

    this.buttons =
      new Collection();

    this.selectMenus =
      new Collection();

    this.modals =
      new Collection();

    this.cooldowns =
      new Collection();

    this.db =
      null;


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


    this.saveLevelingData =
      () => {

        return saveLevelingDataToFile(
          this.levelingData
        );

      };

  }


  // ==========================================================
  // START BOT
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
          'Connection: In-Memory Storage'
        );

        logger.warn(
          'Data Persistence: DISABLED'
        );

      } else {

        startupLog(
          `Database Status: ${dbStatus.connectionType}`
        );

      }


      // ------------------------------------------------------
      // WEB SERVER
      // ------------------------------------------------------

      startupLog(
        'Starting web server...'
      );

      this.startWebServer();


      // ------------------------------------------------------
      // COMMANDS
      // ------------------------------------------------------

      startupLog(
        'Loading commands...'
      );


      await loadCommands(
        this
      );


      startupLog(
        `Commands loaded: ${this.commands.size}`
      );


      // ------------------------------------------------------
      // HANDLERS
      // ------------------------------------------------------

      startupLog(
        'Loading handlers...'
      );


      await this.loadHandlers();


      startupLog(
        'Handlers loaded'
      );


      // ------------------------------------------------------
      // MUSIC
      // ------------------------------------------------------

      initializeMusic(
        this
      );


      // ------------------------------------------------------
      // LEVELING
      // ------------------------------------------------------

      this.setupLevelingSystem();


      startupLog(
        'Leveling system loaded'
      );


      startupLog(
        `Leveling channels: ${LEVELING_CHANNELS.size}`
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
        'Registering slash commands...'
      );


      await this.registerCommands();


      startupLog(
        'Slash commands registration complete'
      );


      const databaseMode =
        dbStatus.isDegraded
          ? 'Optional in-memory mode'
          : 'Connected';


      startupLog(
        `ONLINE | ${this.commands.size} commands | Database: ${databaseMode}`
      );


      // ------------------------------------------------------
      // CRON
      // ------------------------------------------------------

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

    if (this.levelingSystemInitialized) {
      return;
    }

    this.levelingSystemInitialized =
      true;


    this.on(
      'messageCreate',
      async message => {

        try {

          // --------------------------------------------------
          // IGNORE BOTS
          // --------------------------------------------------

          if (message.author.bot) {
            return;
          }


          // --------------------------------------------------
          // IGNORE DMS
          // --------------------------------------------------

          if (!message.guild) {
            return;
          }


          // --------------------------------------------------
          // ONLY LEVELING CHANNELS
          // --------------------------------------------------

          if (
            !LEVELING_CHANNELS.has(
              message.channel.id
            )
          ) {
            return;
          }


          // --------------------------------------------------
          // MEMBER
          // --------------------------------------------------

          const member =
            message.member;


          if (!member) {
            return;
          }


          // --------------------------------------------------
          // COOLDOWN
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


          this.levelingCooldowns.set(
            cooldownKey,
            now
          );


          // --------------------------------------------------
          // GUILD DATA
          // --------------------------------------------------

          const guildId =
            message.guild.id;


          if (
            !this.levelingData[guildId]
          ) {

            this.levelingData[guildId] =
              {};

          }


          // --------------------------------------------------
          // USER DATA
          // --------------------------------------------------

          if (
            !this.levelingData[guildId][
              message.author.id
            ]
          ) {

            this.levelingData[guildId][
              message.author.id
            ] = {

              xp: 0,

              level: 1,

            };

          }


          const userData =
            this.levelingData[guildId][
              message.author.id
            ];


          // --------------------------------------------------
          // OLD LEVEL
          // --------------------------------------------------

          const oldLevel =
            Math.max(
              1,
              Number(userData.level) || 1
            );


          // --------------------------------------------------
          // GAIN XP
          // --------------------------------------------------

          const gainedXP =
            getRandomXP();


          const currentXP =
            Math.max(
              0,
              Number(userData.xp) || 0
            );


          const newXP =
            Math.min(
              MAX_XP,
              currentXP + gainedXP
            );


          userData.xp =
            newXP;


          // --------------------------------------------------
          // CALCULATE LEVEL
          // --------------------------------------------------

          const newLevel =
            calculateLevel(
              newXP
            );


          userData.level =
            newLevel;


          // --------------------------------------------------
          // SAVE DATA
          // --------------------------------------------------

          this.saveLevelingData();


          // --------------------------------------------------
          // LEVEL DID NOT CHANGE
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
          // LEVEL ANNOUNCEMENTS (EVERY LEVEL)
          // --------------------------------------------------

          try {

            await message.channel.send(
              `♱ ⋆˙ ${message.author} has reached level ${newLevel}`
            );

          } catch (error) {

            logger.warn(
              'Could not send level announcement:',
              error.message
            );

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
  // UPDATE LEVEL ROLES
  // ==========================================================

  async updateLevelRoles(
    member,
    level
  ) {

    try {

      // Ensure member is provided
      if (!member) {
        logger.warn('updateLevelRoles called with null/undefined member');
        return;
      }

      const guild =
        member.guild;

      if (!guild) {
        logger.warn('updateLevelRoles: member has no guild');
        return;
      }

      const botMember =
        guild.members.me ||
        await guild.members.fetchMe();


      if (!botMember) {

        logger.warn(
          'Could not find bot member.'
        );

        return;

      }


      // Verify bot has Manage Roles permission
      if (!botMember.permissions.has('ManageRoles')) {

        logger.warn(
          `Bot does not have Manage Roles permission in guild ${guild.id}`
        );

        return;

      }


      // Ensure level is a valid number
      const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1));


      // ======================================================
      // DETERMINE QUALIFYING ROLES (CUMULATIVE)
      // ======================================================

      const qualifyingRoleIds =
        new Set(
          ROLE_LEVELS
            .filter(
              roleLevel =>
                roleLevel <= safeLevel
            )
            .map(
              roleLevel =>
                LEVEL_ROLES[roleLevel]
            )
        );


      // ======================================================
      // PROCESS ALL LEVELING ROLES
      // ======================================================

      for (
        const roleLevel
        of ROLE_LEVELS
      ) {

        const roleId =
          LEVEL_ROLES[roleLevel];


        // Check if role should be held
        const shouldHaveRole =
          qualifyingRoleIds.has(roleId);


        // Check if member currently has role
        const hasRole =
          member.roles.cache.has(roleId);


        // No action needed
        if (shouldHaveRole === hasRole) {
          continue;
        }


        // Fetch role from guild
        const role =
          guild.roles.cache.get(roleId);


        if (!role) {

          logger.warn(
            `Level ${roleLevel} role ${roleId} not found in guild ${guild.id}.`
          );

          continue;

        }


        // Check role hierarchy
        if (
          role.position >=
          botMember.roles.highest.position
        ) {

          logger.warn(
            `Cannot modify ${role.name} (${roleId}); role is at or above bot's highest role in guild ${guild.id}.`
          );

          continue;

        }


        // REMOVE ROLE
        if (hasRole && !shouldHaveRole) {

          try {

            await member.roles.remove(
              role,
              `Level decreased to ${safeLevel}`
            );

            logger.info(
              `Removed level ${roleLevel} role from ${member.user.tag} in guild ${guild.id}`
            );

          } catch (error) {

            logger.warn(
              `Could not remove ${role.name} from ${member.user.tag}:`,
              error.message
            );

          }

        }


        // ADD ROLE
        if (!hasRole && shouldHaveRole) {

          try {

            await member.roles.add(
              role,
              `Reached level ${safeLevel}`
            );

            logger.info(
              `Added level ${roleLevel} role to ${member.user.tag} in guild ${guild.id}`
            );

          } catch (error) {

            logger.warn(
              `Could not add ${role.name} to ${member.user.tag}:`,
              error.message
            );

          }

        }

      }

    } catch (error) {

      logger.error(
        `Failed to update roles for member:`,
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


    const configuredPort =
      Number(
        this.config.api?.port ||
        process.env.PORT ||
        3000
      );


    const maxPortRetryAttempts =
      Number(
        process.env.PORT_RETRY_ATTEMPTS ||
        5
      );


    const host =
      process.env.WEB_HOST ||
      '0.0.0.0';


    const corsOrigin =
      this.config.api?.cors?.origin ||
      '*';


    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    app.use(
      (req, res, next) => {

        const allowedOrigins =
          Array.isArray(corsOrigin)
            ? corsOrigin
            : [corsOrigin];


        const origin =
          req.headers.origin;


        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin)
        ) {

          res.header(
            'Access-Control-Allow-Origin',
            origin || '*'
          );

        }


        res.header(
          'Access-Control-Allow-Methods',
          'GET, POST, OPTIONS'
        );


        res.header(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization'
        );


        if (
          req.method === 'OPTIONS'
        ) {

          return res.sendStatus(
            200
          );

        }


        next();

      }
    );


    // --------------------------------------------------------
    // RATE LIMIT
    // --------------------------------------------------------

    const requestCounts =
      new Map();


    const windowMs =
      this.config.api?.rateLimit?.windowMs ||
      60000;


    const maxRequests =
      this.config.api?.rateLimit?.max ||
      100;


    app.use(
      (req, res, next) => {

        const ip =
          req.ip;


        const now =
          Date.now();


        const windowStart =
          now - windowMs;


        if (
          !requestCounts.has(ip)
        ) {

          requestCounts.set(
            ip,
            []
          );

        }


        const times =
          requestCounts
            .get(ip)
            .filter(
              time =>
                time > windowStart
            );


        if (
          times.length >=
          maxRequests
        ) {

          return res
            .status(429)
            .json({
              error:
                'Too many requests',
            });

        }


        times.push(
          now
        );


        requestCounts.set(
          ip,
          times
        );


        next();

      }
    );


    // --------------------------------------------------------
    // HEALTH
    // --------------------------------------------------------

    app.get(
      '/health',
      (req, res) => {

        const dbStatus =
          this.db?.getStatus?.() ||
          {
            isDegraded:
              'unknown',
          };


        res
          .status(200)
          .json({

            status:
              'healthy',

            timestamp:
              new Date().toISOString(),

            uptime:
              process.uptime(),

            database: {

              connected:
                dbStatus.connectionType !==
                'none',

              degraded:
                dbStatus.isDegraded,

              type:
                dbStatus.connectionType,

            },

          });

      }
    );


    // --------------------------------------------------------
    // READY
    // --------------------------------------------------------

    app.get(
      '/ready',
      (req, res) => {

        const dbStatus =
          this.db?.getStatus?.() ||
          {
            isDegraded: true,
            connectionType: 'none',
          };


        const isReady =
          this.isReady() &&
          !dbStatus.isDegraded;


        const metrics = {

          guildCount:
            this.guilds?.cache?.size ??
            0,

          commandCount:
            this.commands?.size ??
            0,

          database: {

            mode:
              dbStatus.connectionType,

            degraded:
              dbStatus.isDegraded,

            degradedReason:
              dbStatus.degradedReason ??
              null,

          },

          schemaVersion:
            EXPECTED_SCHEMA_VERSION,

          schemaLabel:
            EXPECTED_SCHEMA_LABEL,

        };


        if (isReady) {

          return res
            .status(200)
            .json({

              ready:
                true,

              message:
                'Bot is ready',

              metrics,

            });

        }


        res
          .status(503)
          .json({

            ready:
              false,

            reason:
              !this.isReady()
                ? 'Bot not Ready'
                : 'Database degraded',

            metrics,

          });

      }
    );


    // --------------------------------------------------------
    // ROOT
    // --------------------------------------------------------

    app.get(
      '/',
      (req, res) => {

        res
          .status(200)
          .json({

            message:
              'TitanBot System Online',

            version:
              pkg.version,

            timestamp:
              new Date().toISOString(),

          });

      }
    );


    // --------------------------------------------------------
    // START SERVER
    // --------------------------------------------------------

    const startServer =
      (
        port,
        attempt = 0
      ) => {

        let hasStartedListening =
          false;


        const server =
          app.listen(
            port,
            host,
            () => {

              hasStartedListening =
                true;


              this.webServer =
                server;


              startupLog(
                `Web Server running on ${host}:${port}`
              );


              startupLog(
                `Health endpoint: http://${host}:${port}/health`
              );


              startupLog(
                `Ready endpoint: http://${host}:${port}/ready`
              );

            }
          );


        server.on(
          'error',
          error => {

            const errorCode =
              error?.code ||
              'UNKNOWN_ERROR';


            const errorMessage =
              error?.message ||
              'Unknown server error';


            if (
              !hasStartedListening &&
              errorCode ===
                'EADDRINUSE' &&
              attempt <
                maxPortRetryAttempts
            ) {

              const nextPort =
                port + 1;


              startupLog(
                `Port ${port} is already in use. Trying port ${nextPort}...`
              );


              setTimeout(
                () =>
                  startServer(
                    nextPort,
                    attempt + 1
                  ),
                250
              );


              return;

            }


            logger.error(
              `Web server error on port ${port} (${errorCode}): ${errorMessage}`
            );


            if (
              !hasStartedListening
            ) {

              process.exit(1);

            }

          }
        );

      };


    startServer(
      configuredPort,
      0
    );

  }


  // ==========================================================
  // CRON JOBS
  // ==========================================================

  setupCronJobs() {

    cron.schedule(
  '* * * * *',
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
  // SERVER COUNTERS
  // ==========================================================

  async updateAllCounters() {

    if (!this.db) {

      logger.warn(
        'Database not available for counter updates'
      );

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


        const validCounters =
          [];

        const orphanedCounters =
          [];


        for (
          const counter
          of counters
        ) {

          if (
            counter &&
            counter.type &&
            counter.channelId &&
            counter.enabled !== false
          ) {

            const channel =
              guild.channels.cache.get(
                counter.channelId
              );


            if (channel) {

              validCounters.push(
                counter
              );


              await updateCounter(
                this,
                guild,
                counter
              );

            } else {

              orphanedCounters.push(
                counter
              );

            }

          }

        }


        if (
          orphanedCounters.length > 0
        ) {

          await saveServerCounters(
            this,
            guildId,
            validCounters
          );

        }

      } catch (error) {

        logger.error(
          `Error updating counters for guild ${guildId}:`,
          error
        );

      }

    }

  }


  // ==========================================================
  // LOAD HANDLERS
  // ==========================================================

  async loadHandlers() {

    const handlers = [

      {
        path: 'events',
        type: 'default',
        required: true,
      },

      {
        path: 'interactions',
        type: 'default',
        required: true,
      },

    ];


    for (
      const handler
      of handlers
    ) {

      try {

        startupLog(
          `Loading handler: ${handler.path}`
        );


        const module =
          await import(
            `./handlers/loaders/${handler.path}.js`
          );


        const loaderFn =
          handler.type.startsWith(
            'named:'
          )
            ? module[
                handler.type.split(':')[1]
              ]
            : module.default;


        if (
          typeof loaderFn !==
          'function'
        ) {

          throw new Error(
            `Invalid loader export from ${handler.path}`
          );

        }


        await loaderFn(
          this
        );


        startupLog(
          `Loaded ${handler.path}`
        );


      } catch (error) {

        if (
          handler.required
        ) {

          logger.error(
            `Failed to load required handler ${handler.path}:`,
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

      const guildId =
        process.env.DISCORD_GUILD_ID ||
        this.guilds.cache.first()?.id ||
        null;


      startupLog(
        `Command registration target: ${guildId || 'GLOBAL'}`
      );


      if (!guildId) {

        throw new Error(
          'No Discord guild was found for command registration.'
        );

      }


      await registerSlashCommands(
        this,
        {
          clientId:
            this.config.bot.clientId,

          guildId:
            guildId,
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
      `Bot is shutting down (${reason})...`
    );


    try {

      // ------------------------------------------------------
      // CRON
      // ------------------------------------------------------

      cron
        .getTasks()
        .forEach(
          task =>
            task.stop()
        );


      // ------------------------------------------------------
      // MUSIC
      // ------------------------------------------------------

      await shutdownMusic(
        this
      );


      // ------------------------------------------------------
      // WEB SERVER
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // LEVELING DATA
      // ------------------------------------------------------

      try {

        this.saveLevelingData();

        logger.info(
          'Leveling data saved.'
        );

      } catch (error) {

        logger.warn(
          'Could not save leveling data:',
          error.message
        );

      }


      // ------------------------------------------------------
      // DATABASE
      // ------------------------------------------------------

      if (
        this.db &&
        this.db.db
      ) {

        try {

          if (
            this.db.db.pool
          ) {

            await this.db.db.pool.end();

          }

        } catch (error) {

          logger.warn(
            'Error closing database:',
            error.message
          );

        }

      }


      // ------------------------------------------------------
      // DISCORD
      // ------------------------------------------------------

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
        'Error during graceful shutdown:',
        error
      );


      process.exit(1);

    }

  }

}


// ============================================================
// BOT STARTUP
// ============================================================

try {

  const bot =
    new TitanBot();


  // ----------------------------------------------------------
  // SHUTDOWN HANDLERS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // UNCAUGHT EXCEPTION
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // UNHANDLED REJECTION
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // START
  // ----------------------------------------------------------

  bot
    .start()
    .catch(
      error => {

        logger.error(
          'Fatal error during bot startup:',
          error
        );


        bot.shutdown(
          'STARTUP_ERROR'
        );

      }
    );


} catch (error) {

  logger.error(
    'Fatal error during bot startup:',
    error
  );


  process.exit(1);

}


export default TitanBot;
