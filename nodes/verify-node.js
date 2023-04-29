const speakeasy = require('speakeasy');

module.exports = function (RED) {

    function VerifyNode(config) {
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

            if (pay.userID === undefined || !config2fa.hasUser(pay.userID)) {
                node.warn('User not found');
                msg.error = 'User not found';
                pay.verified = false;
            } else if (pay.token === undefined || typeof pay.token !== 'string') {
                node.warn('Token not found');
                msg.error = 'Token not found';
                pay.verified = false;
            } else {
                const secret = config2fa.getSecret(pay.userID, 'base32');

                pay.verified = speakeasy.totp.verify({
                    secret: secret,
                    encoding: 'base32',
                    token: (typeof pay.token === 'number' ? pay.token.toString() : pay.token)
                });
            }

            if (pay.verified || config.onlyOutputOnAuth !== true) {
                send(msg);
            }

            done();
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("verify-node", VerifyNode);
}
