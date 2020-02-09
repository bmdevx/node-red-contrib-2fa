const should = require("should");
const helper = require("node-red-node-test-helper");
const nr2fa_config = require("../nodes/config-node");
const nr2fa_create = require("../nodes/create-node");
const nr2fa_delete = require("../nodes/delete-node");
const nr2fa_verify = require("../nodes/verify-node");
const nr2fa_generate = require("../nodes/generate-node");

helper.init(require.resolve('node-red'));

describe('2fa Nodes', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "config-node", name: "config-node" },
        { id: "n2", type: "create-node", name: "create-node" },
        { id: "n3", type: "generate-node", name: "generate-node" },
        { id: "n4", type: "verify-node", name: "verify-node" },
        { id: "n5", type: "delete-node", name: "delete-node" }];

        helper.load([nr2fa_config, nr2fa_create, nr2fa_generate, nr2fa_verify, nr2fa_delete], flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'config-node');

            var n2 = helper.getNode("n2");
            n2.should.have.property('name', 'create-node');

            var n3 = helper.getNode("n3");
            n3.should.have.property('name', 'generate-node');

            var n4 = helper.getNode("n4");
            n4.should.have.property('name', 'verify-node');

            var n4 = helper.getNode("n5");
            n4.should.have.property('name', 'delete-node');

            done();
        });
    });

    it('create-generate-verify', function (done) {
        var flow = [
            { id: "ncfg", type: "config-node", name: "config-node", encryptUsersConfig: true },
            { id: "nCreateRes", type: "helper" },
            { id: "nGenRes", type: "helper" },
            { id: "nVerRes", type: "helper" },
            { id: "ncreate", type: "create-node", name: "create-node", wires: [["nCreateRes"]], config: "ncfg", generateQRCode: true },
            { id: "ngen", type: "generate-node", name: "generate-node", wires: [["nGenRes"]], config: "ncfg" },
            { id: "nver", type: "verify-node", name: "verify-node", wires: [["nVerRes"]], config: "ncfg" }
        ];


        helper.load([nr2fa_config, nr2fa_create, nr2fa_generate, nr2fa_verify], flow, {
            ncfg: {
                encryptionKey: "test"
            }
        }, function () {
            var ncreate = helper.getNode("ncreate");
            var ngen = helper.getNode("ngen");
            var nver = helper.getNode("nver");
            var nCreateRes = helper.getNode("nCreateRes");
            var nGenRes = helper.getNode("nGenRes");
            var nVerRes = helper.getNode("nVerRes");

            const userID = "defUser";

            nCreateRes.on("input", function (msg, send, done) {
                msg.payload.secret.should.have.property('base32');

                ngen.receive({
                    payload: {
                        userID: userID
                    }
                });

                done();
            });


            nGenRes.on("input", function (msg, send, done) {
                msg.payload.should.have.property('userID', userID);
                msg.payload.token.should.type('string');

                nver.receive({
                    payload: {
                        userID: msg.payload.userID,
                        token: msg.payload.token
                    }
                });

                done();
            });

            const fdone = done;

            nVerRes.on("input", function (msg, send, done) {
                msg.payload.should.have.property('verified', true);

                done();
                fdone();
            });

            setTimeout(() => {
                ncreate.receive({
                    payload: {
                        userID: userID
                    }
                });
            }, 2000);
        });
    }).timeout(60000);
});