const speakeasy = require('speakeasy');

const DEFAULT_ENCODING = 'base32';

module.exports = function (RED) {

    function GenerateNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        var config2fa = (typeof config.config === 'string') ? RED.nodes.getNode(config.config) : config.config;

        node.on('input', function (msg, send, done) {
            if (!config2fa.isInitialized()) {
                node.warn('2FA config-node is not initialized');
                done();
                return;
            }

            const pay = msg.payload;
            const userID = (typeof pay === 'string') ? pay : (typeof pay === 'object' ? pay.userID : undefined);

            if (userID === undefined || !config2fa.hasUser(userID)) {
                node.warn('User not found');
                send({ payload: { userID: userID, error: 'User not found' } });
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

    RED.nodes.registerType("generate-node", GenerateNode);
}
