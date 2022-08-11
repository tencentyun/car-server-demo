const tencentcloud = require('tencentcloud-sdk-nodejs');
const CarClient = tencentcloud.car.v20220110.Client;

const { Config, DefaultKeys } = require('./config');

const newCarClient = _ => new CarClient({
  credential: {
    secretId: Config.get(DefaultKeys.SECRET_ID),
    secretKey: Config.get(DefaultKeys.SECRET_KEY),
  },
  // cloud api region, for example: ap-guangzhou, ap-beijing, ap-shanghai
  region: "ap-guangzhou",
  profile: {
    signMethod: "TC3-HMAC-SHA256",
    httpProfile: {
      reqMethod: "POST",
      reqTimeout: 30,
    },
  },
});

module.exports = newCarClient;
