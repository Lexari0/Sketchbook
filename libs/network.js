const os = require("os");

module.exports = {
    ipv4: {
        getInterfaces: function() {
            var r = {};
            const interfaces = os.networkInterfaces();
            for (const interface of Object.keys(interfaces))
            {
                for (const option of interfaces[interface])
                {
                    if (option.family === "IPv4")
                    {
                        r[interface] = option;
                        break;
                    }
                }
            }
            return r;
        },
        toInt: function(ip) {
            var r = 0;
            const split = ip.split(".").reverse();
            for (const i in split)
            {
                r += parseInt(split[i]) << (8 * i);
            }
            return r;
        },
        maskIP: function(ip, netmask) {
            if (typeof ip == "string")
            {
                ip = this.toInt(ip);
            }
            if (typeof netmask == "string")
            {
                netmask = this.toInt(netmask);
            }
            return ip & netmask;
        },
        ipInSubnet: function(ip) {
            if (typeof ip == "string")
            {
                ip = this.toInt(ip);
            }
            const interfaces = this.getInterfaces();
            for (const interface of Object.values(interfaces))
            {
                if (this.maskIP(ip, interface.netmask) == this.maskIP(interface.address, interface.netmask))
                {
                    return true;
                }
            }
            return false;
        }
    }
};
