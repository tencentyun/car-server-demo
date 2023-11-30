const TLSSigAPIv2 = require('tls-sig-api-v2');
const { Config, DefaultKeys } = require('./config');
const { TRTCUserSigExpire } = require('./com');

const genUserSig = (userId) => {
    return new TLSSigAPIv2.Api(Config.get(DefaultKeys.TRTC_SDKAPPID), Config.get(DefaultKeys.TRTC_SECRET_KEY)).genSig(
        userId, TRTCUserSigExpire
    );
};

module.exports = {
    GenUserSig: genUserSig,
};

