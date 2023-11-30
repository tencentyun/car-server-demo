const Crypto = require('crypto');
const TLSSigAPIv2 = require("tls-sig-api-v2");
const {Config, DefaultKeys} = require("./config");
const https = require('https');
const {json} = require("express");
const sudEntryPoint = 'sim-asc.sudden.ltd';

const genSudSign = () => {
    const key = Config.get(DefaultKeys.SUD_APP_SECRET);
    const data = Config.get(DefaultKeys.SUD_APPID);
    const hmac = Crypto.createHmac('md5', key);
    return hmac.update(data).digest('hex');
};


const genSudAppSignAuthorization = (body) => {
    let appId = Config.get(DefaultKeys.SUD_APPID);
    let appSecret = Config.get(DefaultKeys.SUD_APP_SECRET);
    let timestamp = Math.floor(Date.now() / 1000).toString();
    let nonce = Math.random().toString(36).substring(2, 12);
    let signContent = appId + '\n' + timestamp + '\n' + nonce + '\n' + body + '\n';
    let hmac = Crypto.createHmac('sha1', appSecret);
    let signature = hmac.update(signContent).digest('hex');
    return 'Sud-Auth app_id="' + appId + '",timestamp="' + timestamp + '",nonce="' + nonce + '",signature="' + signature + '"';
}

const getUrl = async () => {
    const options = {
        hostname: sudEntryPoint,
        path:  `/${genSudSign()}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    try {
        return await makeHttpRequest(options);
    } catch (error) {
        throw error;
    }
};



const initGame =  async (path, body) => {
    const { hostname, pathname } = new URL(path);
    const options = {
        hostname: hostname,
        path:  `${pathname}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': genSudAppSignAuthorization(JSON.stringify(body))
        },
    };

    try {
        return await makeHttpRequest(options, JSON.stringify(body));
    } catch (error) {
        throw error;
    }
}

const makeHttpRequest = (options, body) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                resolve(responseData);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}


module.exports = {
    GenSudSign: genSudSign,
    GetUrl: getUrl,
    InitGame: initGame,
};

