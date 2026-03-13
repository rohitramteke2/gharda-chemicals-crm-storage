import NodeCache from 'node-cache';

// stdTTL = 0 means items don't auto-expire; each .set() provides its own TTL.
const cache = new NodeCache({ stdTTL: 0, checkperiod: 60 });

export default cache;
