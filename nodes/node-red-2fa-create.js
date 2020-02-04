const speakeasy = require('speakeasy');

module.exports = function (RED) {

    function NodeRed2FACreate(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const config2fa = RED.nodes.getNode(config.config);

        node.on('input', function (msg, send, done) {
            const pay = msg.payload;
            const userID = (typeof pay === 'string') ? pay : (typeof pay === 'object' ? pay.userID : undefined);

            if (userID === undefined) {
                node.warn("Undefined UserID");
            } else {
                var user;
                if (!config2fa.hasUser(userID)) {
                    user = { userID: userID }
                    node.log("User Created");
                } else {
                    user = config2fa.getUser(userID);
                    node.log("User Loaded");
                }

                var secretLength = config2fa.getSecretLength();
                var useSymbols = config2fa.getSecretUseSymbols();

                if (typeof pay === 'object') {
                    if (pay.secretLength) {
                        secretLength = pay.secretLength;
                    }

                    if (pay.useSymbols) {
                        useSymbols = pay.useSymbols;
                    }
                }

                const secret = speakeasy.generateSecret(secretLength, useSymbols);
                user.secret = secret;

                config2fa.setUser(user);

                send({ payload: user });
            }

            done();
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("node-red-2fa-create", NodeRed2FACreate);
}
