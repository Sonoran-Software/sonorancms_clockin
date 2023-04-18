const utils = require('./sh_utils');
let apiKey, communityId, apiUrl, serverId, apiIdType, debugMode

RegisterNetEvent('SonoranCMS::Plugins::GiveInfo')
on('SonoranCMS::Plugins::GiveInfo', async (pluginName, payload) => {
	if (pluginName !== GetCurrentResourceName()) return;
	apiKey = payload.apiKey
	communityId = payload.communityId
	apiUrl = payload.apiUrl
	serverId = payload.serverId
	apiIdType = payload.apiIdType
	debugMode = payload.debugMode
})

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

on('SonoranCMS::Started', async (resourceName) => {
	utils.infoLog('sonorancms core has been (re)started! reinitializing addon!')
	initialize()
})

async function initialize() {
	if (GetResourceState('sonorancms') != "started") {
		utils.errorLog('SonoranCMS Core Is Not Started! Not loading addon...')
	} else {
		let config = false;
		utils.infoLog("Checking resource version...");
		TriggerEvent('SonoranCMS::Plugins::Loaded', GetCurrentResourceName())
		await sleep(2000)
		try {
			config = require('./config.json');
		} catch (err) {
			utils.errorLog(err);
		}
		if (config) {
			global.exports('clockPlayerIn', async (source, forceClockIn = false) => {
				const apiId = getAppropriateIdentifier(source, apiIdType);
				await clockPlayerIn(apiId, forceClockIn).then((inOrOut) => {
					return { success: true, in: inOrOut };
				}).catch((err) => {
					return { success: false, err };
				});
			});
			if (config.enableCommand) {
				RegisterCommand(config.command || 'clockin', async (source) => {
					const apiId = getAppropriateIdentifier(source, apiIdType);
					await clockPlayerIn(apiId, false).then((inOrOut) => {
						if (inOrOut == false) {
							emitNet('chat:addMessage', source, {
								color: [255, 0, 0],
								multiline: false,
								args: [`^3^*Sonoran CMS:^7 Successfully clocked in!`]
							});
						} else if (inOrOut == true) {
							emitNet('chat:addMessage', source, {
								color: [255, 0, 0],
								multiline: false,
								args: [`^3^*Sonoran CMS:^7 Successfully clocked out!`]
							});
						} else {
							emitNet('chat:addMessage', source, {
								color: [255, 0, 0],
								multiline: false,
								args: [`^8^*Sonoran CMS:^7 An error occured while clocking in...`]
							});
							utils.errorLog(`An error occured while clocking in ${GetPlayerName(source)} (${apiId})...`);
						}
					}).catch((err) => {
						emitNet('chat:addMessage', source, {
							color: [255, 0, 0],
							multiline: false,
							args: [`^8^*Sonoran CMS:^7 ${err || 'An error occured while clocking in...'}`]
						});
						utils.errorLog(`An error occured while clocking in ${GetPlayerName(source)} (${apiId})... ${err}`);
					});
				}, config.useAcePermissions);

				onNet('SonoranCMS::ClockIn::Server::ClockPlayerIn', async (forceClockIn) => {
					const src = global.source;
					const apiId = getAppropriateIdentifier(src, apiIdType);
					await clockPlayerIn(apiId, forceClockIn).then((inOrOut) => {
						utils.infoLog(`Clocked player ${GetPlayerName(src)} (${apiId}) ${inOrOut ? 'out' : 'in'}!`);
					}).catch((err) => {
						utils.errorLog(`Failed to clock player ${GetPlayerName(src)} (${apiId}) ${inOrOut ? 'out' : 'in'}...`);
					});
				});
			}
		} else {
			utils.errorLog('No config found... looked for config.json & server convars...');
		}
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

async function clockPlayerIn(apiId, forceClockIn) {
	return new Promise(async (resolve, reject) => {
		exports.sonorancms.performApiRequest([{ "apiId": apiId, "forceClockIn": !!forceClockIn }], "CLOCK_IN_OUT", function (res) {
			res = JSON.parse(res)
			if (res) {
				resolve(res.completed);
			} else {
				reject('There was an error')
			}
		})
	});
}


initialize();