const xss = require('xss');

const sanitize = (obj) => {
    if (typeof obj === 'string') return xss(obj);
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const key of Object.keys(obj)) result[key] = sanitize(obj[key]);
        return result;
    }
    return obj;
};

module.exports = sanitize;
