'use strict';
const intake = require('./intake');

module.exports = (req, res) => {
  const url = req.url || '/';

  // Route: POST /intake → intake-processor
  if (url.startsWith('/intake')) return intake(req, res);

  // Future routes:
  // if (url.startsWith('/gaps'))  return require('./gaps')(req, res);
  // if (url.startsWith('/specs')) return require('./specs')(req, res);

  // Default — health check
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'FCI Workspace API running',
    version: '1.0.0',
    routes: ['/intake']
  }));
};