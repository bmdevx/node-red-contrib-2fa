module.exports = function (RED) {

    function NodeRed2FADelete(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const config2fa = RED.nodes.getNode(config.config);

        node.on('input', function (msg, send, done) {
            const pay = msg.payload;
            const userID = (typeof pay === 'string') ? pay : (typeof pay === 'object' ? pay.userID : undefined);

            if (userID === undefined) {
                node.warn("Undefined UserID");
            } else {

                config2fa.deleteUser(userID)
                    .then(res => {
                        send({ payload: res === undefined ? { deleted: true, userID: userID } : res });
                        done();
                    })
                    .catch(e => {
                        node.err(e);
                        send({ payload: { deleted: false, userID: userID, error: e } })
                    });
            }
        });

        node.on('close', (done) => {
            done();
        });
    }

    RED.nodes.registerType("node-red-2fa-delete", NodeRed2FADelete);
}
