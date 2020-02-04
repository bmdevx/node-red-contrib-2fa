const speakeasy = require('speakeasy');

module.exports = function (RED) {

    function VerifyNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const config2fa = RED.nodes.getNode(config.config);

        node.on('input', function (msg, send, done) {
            const pay = msg.payload;

            if (pay.userID === undefined || !config2fa.hasUser(pay.userID)) {
                node.warn('User not found');
                msg.error = 'User not found';
            } else if (pay.token === undefined || typeof pay.token !== 'string') {
                node.warn('Token not found');
                msg.error = 'Token not found';
            } else {
                const secret = config2fa.getSecret(pay.userID, 'base32');

                pay.verified = speakeasy.totp.verify({
                    secret: secret,
                    encoding: 'base32',
                    token: (typeof pay.token === 'number' ? pay.token.toString() : pay.token)
                });
            }

            send(msg);

            done();
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("verify-node", VerifyNode);
}
