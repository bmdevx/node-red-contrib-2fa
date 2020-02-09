module.exports = function (RED) {

    function DeleteNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const config2fa = RED.nodes.getNode(config.config);

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
                config2fa.deleteUser(userID)
                    .then(res => {
                        send({ payload: res === undefined ? { deleted: true, userID: userID } : res });
                    })
                    .catch(e => {
                        node.err(e);
                        send({ payload: { deleted: false, userID: userID, error: e } })
                    })
                    .finally(_ => {
                        done();
                    });
            }
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("delete-node", DeleteNode);
}
