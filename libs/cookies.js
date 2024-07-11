module.exports = {
    getRequestCookies: function(req) {
        var cookies = {};
        for (const cookie of (!req.headers || !req.headers.cookie ? [] : req.headers.cookie.split(";")))
        {
            var split_cookie = cookie.split("=");
            cookies[split_cookie.shift().trim()] = split_cookie.shift().trim();
        }
        return cookies;
    },
    stringifyCookies: function(cookies) {
        return Object.keys(cookies).map(k => `${k}=${cookies[k] ? cookies[k] : ""}`).join("&");
    }
};
