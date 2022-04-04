const utils = require('./sh_utils');

async function initialize() {
  let config = false;
  utils.infoLog('Checking resource version...');
  await utils.checkVersion(GetResourceMetadata(GetCurrentResourceName(), 'git_repo'), GetResourceMetadata(GetCurrentResourceName(), 'version'));
  try {
    const _config = require('./config.json');
    config = Object.create(Object.assign(_config), _config);
    if (config.useConvarForAuthStrings) {
      config.apiKey = GetConvar('SONORAN_CMS_API_KEY', 'unknown');
      config.communityId = GetConvar('SONORAN_CMS_COMMUNITY_ID', 'unknown');
    }
  } catch (err) {
    if (err) {
      const apiKey = GetConvar('SONORAN_CMS_API_KEY', 'unknown');
      const communityId = GetConvar('SONORAN_CMS_COMMUNITY_ID', 'unknown');
      const apiIdType = GetConvar('SONORAN_CMS_API_ID_TYPE', 'unknown');
      const cmsApiUrl = GetConvar('SONORAN_CMS_API_URL', 'https://api.sonorancms.com');

      if (!config) {
        if (apiKey !== 'unknown' && communityId !== 'unknown' && apiIdType !== 'unknown') {
          config = {
            apiKey,
            communityId,
            apiIdType,
            apiUrl: cmsApiUrl,
            qbcore: {
              use: false,
              autoClockInJobs: []
            }
          };
        }
      } else {
        utils.errorLog(err);
      }
    }
  }

  if (config) {
    if (config.apiIdType.toLowerCase() !== 'discord' && config.apiIdType.toLowerCase() !== 'steam' && config.apiIdType.toLowerCase() !== 'license') {
      utils.errorLog('Invalid apiIdType given, must be "discord", "steam", or "license".');
    } else {
      const Sonoran = require('@sonoransoftware/sonoran.js');
      utils.infoLog('Initializing Sonoran ClockIn...');
      const instance = new Sonoran.Instance({
        communityId: config.communityId,
        apiKey: config.apiKey,
        serverId: config.serverId,
        product: Sonoran.productEnums.CMS,
        cmsApiUrl: config.apiUrl
      });

      instance.on('CMS_SETUP_SUCCESSFUL', () => {
        if (instance.cms.version < 2) return utils.errorLog(`Subscription version too low to use Sonoran ClockIn effectively... Current Sub Version: ${utils.subIntToName(instance.cms.version)} (${instance.cms.version}) | Needed Sub Version: ${utils.subIntToName(2)} (2)`);
        utils.infoLog(`Sonoran ClockIn Setup Successfully! Current Sub Version: ${utils.subIntToName(instance.cms.version)} (${instance.cms.version})`);

        global.exports('clockPlayerIn', async (source, forceClockIn = false) => {
          const apiId = getAppropriateIdentifier(source, config.apiIdType);
            await clockPlayerIn(instance, apiId, forceClockIn).then((inOrOut) => {
              return { success: true, in: inOrOut };
            }).catch((err) => {
              return { success: false, err };
            });
        });

        if (config.enableCommand) {
          RegisterCommand(config.command ?? 'clockin', async (source) => {
            const apiId = getAppropriateIdentifier(source, config.apiIdType);
            await clockPlayerIn(instance, apiId, false).then((inOrOut) => {
              emitNet('chat:addMessage', source, {
                color: [255, 0, 0],
                multiline: false,
                args: [`^3^*Sonoran CMS^r: Successfully clocked ${inOrOut ? 'in' : 'out'}!`]
              });
            }).catch((err) => {
              emitNet('chat:addMessage', source, {
                color: [255, 0, 0],
                multiline: false,
                args: [`^8^*Sonoran CMS^r: An error occured while clocking in...`]
              });
              utils.errorLog(`An error occured while clocking in ${GetPlayerName(source)} (${apiId})... ${err}`);
            });
          }, config.useAcePermissions);
        }

        onNet('SonoranCMS::ClockIn::Server::ClockPlayerIn', (forceClockIn) => {
          const src = global.source;
          const apiId = getAppropriateIdentifier(src, config.apiIdType);
          await clockPlayerIn(instance, apiId, forceClockIn).then((inOrOut) => {
            utils.infoLog(`Clocked player ${GetPlayerName(src)} (${apiId}) ${inOrOut ? 'in' : 'out'}!`);
          }).catch((err) => {
            utils.errorLog(`Failed to clock player ${GetPlayerName(src)} (${apiId}) ${inOrOut ? 'in' : 'out'}... ${err}`);
          });
        });
      });

      instance.on('CMS_SETUP_UNSUCCESSFUL', (err) => {
        utils.errorLog(`Sonoran ClockIn Setup Unsuccessfully! Error provided: ${err}`);
      });
    }
  } else {
    utils.errorLog('No config found... looked for config.json & server convars...');
  }
}

function getAppropriateIdentifier(source, type) {
  const identifiers = getPlayerIdentifiers(source);
  let properIdentifiers = {
    discord: '',
    steam: '',
    license: ''
  }
  identifiers.forEach((identifier) => {
    const splitIdentifier = identifier.split(':');
    const identType = splitIdentifier[0];
    const identId = splitIdentifier[1];
    switch (identType) {
      case 'discord':
        properIdentifiers.discord = identId;
        break;
      case 'steam':
        properIdentifiers.steam = identId;
        break;
      case 'license':
        properIdentifiers.license = identId;
        break;
    }
  });

  if (properIdentifiers[type] === '') {
    return null;
  } else {
    return properIdentifiers[type];
  }
}

async function clockPlayerIn(instance, apiId, forceClockIn) {
  return new Promise((resolve, reject) => {
    await instance.cms.clockInOut({
      apiId,
      forceClockIn: !!forceClockIn
    }).then((clockin) => {
      if (clockin.success) {
        resolve(clockin.clockIn);
      } else {
        reject(clockin.reason);
      }
    }).catch((err) => {
      reject(err);
    });
  });
}


initialize();