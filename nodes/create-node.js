const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const Stream = require('stream');

module.exports = function (RED) {

    function CreateNode(config) {
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

                var secret = speakeasy.generateSecret({
                    length: secretLength,
                    symbols: useSymbols
                });

                //update otpauth_url to have Issuer and Label (userID)
                secret.otpauth_url = speakeasy.otpauthURL({
                    secret: secret.ascii,
                    label: userID,
                    issuer: 'NodeRED 2FA'
                })

                const setAndSend = (s) => {
                    user.secret = s;
                    config2fa.setUser(user)
                        .then(_ => {
                            send({ payload: user });
                        })
                        .catch(e => node.error(e))
                        .finally(_ => {
                            done();
                        });
                }

                if (config.generateQRCode === true) {
                    qrcode.toDataURL(secret.otpauth_url, (err, url) => {
                        if (err) {
                            node.warn(err);
                            secret.error = 'Failed to generate QRCode URL';
                        } else {
                            secret.qrcode = url;
                        }
                        setAndSend(secret);
                    });
                } else {
                    setAndSend(secret);
                }
            }
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("create-node", CreateNode);
}
