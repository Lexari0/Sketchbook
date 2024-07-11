const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

const api_host = "www.subscribestar." + (config.subscribestar.adult ? "adult" : "com");

function getRedirectURI() {
    return "https://" + path.join(config.server.domain, "/oauth/subscribestar");
}

function clearOAuth() {
    for (const key of Object.keys(config.subscribestar.auth_token))
    {
        config.subscribestar.auth_token[key] = undefined;
    }
    config.save();
}

function updateOAuth(oauth_response) {
    for (const key of Object.keys(config.subscribestar.auth_token))
    {
        config.subscribestar.auth_token[key] = oauth_response[key];
    }
    config.subscribestar.auth_token.issued_at = Date.now() / 1000;
    config.subscribestar.auth_token.expires_at = config.subscribestar.auth_token.issued_at + config.subscribestar.auth_token.expires_in
    config.save();
}

async function refreshOAuth() {
    const post_response = await api.sendPOST(api_host, "/oauth2/token", {
        client_id: config.subscribestar.client_id,
        client_secret: config.subscribestar.client_secret,
        refresh_token: config.subscribestar.auth_token.refresh_token,
        grant_type: "refresh_token",
        redirect_uri: getRedirectURI()
    });
    if (post_response.error)
    {
        return false;
    }
    updateOAuth(post_response);
    return true;
}

function isOAuthValid() {
    if (config.subscribestar.auth_token.access_token == undefined)
    {
        return false;
    }
    if (config.subscribestar.auth_token.expires_at == undefined)
    {
        return false;
    }
    if (Date.now() >= config.subscribestar.auth_token.expires_at)
    {
        if (refreshOAuth())
        {
            return true;
        }
        log.error("subscribestar", "Failed to refresh SubscribeStar OAuth! Clearing auth_token data from config.")
        clearOAuth();
        return false;
    }
    // This might fail and we shouldn't log that underlying error if it does
    const response = sendGraphQLRequest("{ user { name } }", false);
    if (response == undefined || response == null)
    {
        log.error("subscribestar", "SubscribeStar OAuth token isn't valid. Clearing auth_token data from config.")
        clearOAuth();
        return false;
    }
    return true;
}

async function sendGraphQLRequest(query, logError = true, bearer_token = config.subscribestar.auth_token.access_token) {
    if (!isOAuthValid())
    {
        return undefined;
    }
    const post_response = await api.sendPOST(api_host, "/api/graphql/v1", { query }, "application/json", {"Authorization": `Bearer ${bearer_token}`});
    if (post_response == undefined)
    {
        log.error("subscribestar", `GraphQL query (${query}) resulted in no response`);
        return undefined;
    }
    if (post_response.error && logError)
    {
        log.error("subscribestar", `GraphQL query (${query}) resulted in an error: ${post_response.error}`);
    }
    return post_response.data;
}

module.exports = {
    sendGraphQLRequest,
    isOAuthValid,
    getRedirectURI,
    clearOAuth,
    updateOAuth,
    refreshOAuth,
    getTagForTier: function(tier_name) {
        return "subscribestar:" + tier_name.toLowerCase().replace(/ /g, "_");
    },
    getTiers: async function() {
        const response = await sendGraphQLRequest("{ content_provider_profile { tiers { nodes { cost, title, description, hidden, id, removed } } } }");
        if (response == undefined)
        {
            return undefined;
        }
        [].map(x => x.y);
        return response.content_provider_profile.tiers.nodes.sort((a, b) => a.cost - b.cost).map(tier => {return {...tier, tag: this.getTagForTier(tier.title)}});
    },
    getTier: async function(tier_id) {
        const tiers = await this.getTiers();
        if (tiers == undefined)
        {
            return undefined;
        }
        return tiers.filter(tier => tier.id == tier_id).pop();
    },
    getProfile: async function() {
        const response = await sendGraphQLRequest("{ content_provider_profile { avatar_url, cover_url, description, id, mature, name, url, url_name, welcome_media_url } }");
        if (response == undefined)
        {
            return undefined;
        }
        return response.content_provider_profile;
    },
    getActiveSubscriptions: async function() {
        const response = await sendGraphQLRequest("{ content_provider_profile { subscriptions(active:true) { nodes { id, paid_until, price, tier_id, user { avatar_url, id, name } } } } }");
        if (response == undefined)
        {
            return undefined;
        }
        return response.content_provider_profile.subscriptions.nodes;
    },
    getUserSubscriptionTier: async function(subscriber_id) {
        const response = await sendGraphQLRequest(`{ content_provider_profile { subscriptions(active:true, subscriber_id:${subscriber_id}) { nodes { tier_id } } } }`);
        if (response == undefined)
        {
            return undefined;
        }
        const tier_id = response.content_provider_profile.subscriptions.nodes.tier_id;
        if (tier_id == undefined)
        {
            return undefined;
        }
        return await this.getTier(tier_id);
    },
    isItemCensoredForUser: async function(tags, viewer_access_token) {
        log.message("subscribestar", "Checking isItemCensoredForUser");
        tags = tags.filter(x => x.startsWith("subscribestar:"));
        if (tags.length == 0)
        {
            log.message("subscribestar", "No subscribestar: tags, visible");
            return false;
        }
        if (viewer_access_token == undefined)
        {
            log.message("subscribestar", "Viewer has no access_token, censor");
            return true;
        }
        const user = (await this.sendGraphQLRequest("{ user { id } }", true, viewer_access_token)).user;
        const viewer_id = user.id;
        const profile = await this.getProfile();
        console.log("viewer_id: ", viewer_id);
        console.log("profile: ", JSON.stringify(profile));
        if (profile.id == viewer_id)
        {
            log.message("subscribestar", "Viewer is owner, visible");
            return false;
        }
        const tier_id = await this.getUserSubscriptionTier(viewer_id);
        if (tier_id == undefined)
        {
            log.message("subscribestar", "Viewer has no subscription tier, censor");
            return true;
        }
        const tier = await this.getTier(tier_id);
        log.message("subscribestar", "Viewer tier: ", tier);
        return !tags.includes(tier.tag);
    }
};

// This will kick off a refresh if one needs to happen
if (!module.exports.isOAuthValid())
{
    log.warning("SubscribeStar auth_token is invalid!");
}
