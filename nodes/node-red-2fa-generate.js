const speakeasy = require('speakeasy');

const DEFAULT_ENCODING = 'base32';

module.exports = function (RED) {

    function NodeRed2FAGenerate(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const config2fa = RED.nodes.getNode(config.config);

        node.on('input', function (msg, send, done) {
            const pay = msg.payload;
            const userID = (typeof pay === 'string') ? pay : (typeof pay === 'object' ? pay.userID : undefined);

            if (userID === undefined || !config2fa.hasUser(userID)) {
                node.warn("User not found");
            } else {
                const secret = config2fa.getSecret(userID, 'base32');

                if (secret !== undefined) {
                    const token = speakeasy.totp({
                        secret: secret,
                        encoding: 'base32'
                    });

                    send({ payload: { token: token, userID: userID } });
                } else {
                    node.warn("Secrect not found");
                }
            }

            done();
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("node-red-2fa-generate", NodeRed2FAGenerate);
}
