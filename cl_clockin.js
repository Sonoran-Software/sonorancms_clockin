let job;

async function initialize() {
  while (!NetworkIsPlayerActive(PlayerId())) {}
  emitNet('SonoranCMS::ClockIn::Server::GetConfig');
}

onNet('SonoranCMS::ClockIn::Client::RecieveConfig', (_config) => {
  if (_config.qbcore.use) {
    if (_config.qbcore.autoClockInJobs.length > 0) {
      onNet('QBCore:Client:OnJobUpdate', (_job) => {
        job = _job;
      });
      onNet('QBCore:Client:SetDuty', (onDuty) => {
        if (_config.qbcore.autoClockInJobs.includes(job.name)) {
          emitNet('SonoranCMS::ClockIn::Server::ClockPlayerIn', onDuty);
        }
      });
    }
  }
});

initialize();