const fetch = require('node-fetch');

/**
 *
 * @param {string} message
 * @param  {errStack} args
 * @returns
 */
module.exports.errorLog = (message, ...args) => {
  return console.log(`^1[ERROR - Sonoran CMS ClockIn - ${new Date().toLocaleString()}] ${message}`, args + '^0');
}

/**
 *
 * @param {string} message
 * @returns
 */
module.exports.infoLog = (message) => {
  return console.log(`[INFO - Sonoran CMS ClockIn - ${new Date().toLocaleString()}] ${message}`);
}

module.exports.subIntToName = (subInt) => {
  switch (subInt) {
    case 0:
      return 'FREE';
    case 1:
      return 'STARTER';
    case 2:
      return 'STANDARD';
    case 3:
      return 'PLUS';
    case 4:
      return 'PRO';
    case 5:
      return 'SONORANONE';
  }
}

module.exports.checkVersion = async (_gitRepo, _currentVersion) => {
  return new Promise(async (resolve) => {
    const currentVersion = Number.parseInt(_currentVersion.split('.').join(''));
    const gitRepoSplit = _gitRepo.split('/');
    const gitRepo = `https://raw.githubusercontent.com/${gitRepoSplit[3]}/${gitRepoSplit[4]}`;
    const theFetch = await fetch(`${gitRepo}/master/fxmanifest.lua`);
    if (theFetch.ok) {
      let data = await theFetch.text();
      data = data.trim().split('\n');
      data.forEach((line) => {
        if (line.startsWith('version')) {
          const versionLineSplit = line.split('\'');
          const latestVersion = Number.parseInt(versionLineSplit[1].split('.').join(''));
          if (currentVersion < latestVersion) {
            this.infoLog(`New update available for Sonoran Whitelist. Current version: ${versionLineSplit[1]} | Latest Version: ${_currentVersion} | Download new version: ${_gitRepo}/releases/tag/v${versionLineSplit[1]}`);
          } else {
            this.infoLog(`Sonoran Whitelist is already up to date! Version: ${versionLineSplit[1]}`);
          }
          resolve();
        }
      });
    } else {
      const respText = await theFetch.text();
      this.errorLog(`An error occured while checking version... ${respText}`);
      resolve();
    }
  });
}