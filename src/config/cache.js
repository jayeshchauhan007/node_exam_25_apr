const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 70 });

module.exports = cache;
