const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const DEAFULT_FILE_PATH = '/data/node-red-2fa-config.json';

const KEY_USERS = 'users';
const KEY_SECRET_LENGTH = 'secretLength';
const KEY_SECRET_SYMBOLS = 'secretUseSymbols';

const SECRET_LENGTH = 32;
const SECRET_USE_SYMBOLS = true;


const checkExists = (path) => new Promise(r => fs.access(path, fs.F_OK, e => r(!e)));

const createDirIfNotExist = (filePath) => {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    createDirIfNotExist(dirname);
    fs.mkdirSync(dirname);
}


module.exports = function (RED) {

    function NodeRed2FAConfig(config) {
        RED.nodes.createNode(this, config);

        var initiated = false;

        const node = this;
        const configFilePath = (config.configPath && typeof config.configPath == 'string') ? config.configPath : DEAFULT_FILE_PATH;

        var config2fa = { users: {}, secretLength: config.secretLength, secretUseSymbols: config.secretUseSymbols };

        const saveConfig = () => {
            return new Promise((resolve, reject) => {
                try {
                    const json = JSON.stringify(config2fa);

                    createDirIfNotExist(configFilePath);

                    fsp.writeFile(configFilePath, json)
                        .then(_ => {
                            resolve();
                        })
                        .catch(e => {
                            reject(`2FA config file failed to save- ${e}`);
                        })
                } catch (e) {
                    reject(`2FA config file failed to convert to json- ${e}`);
                }
            });
        }

        const init = () => {
            node.setUser = (user) => {
                const users = config2fa[KEY_USERS];
                users[user.userID] = user;
                config2fa[KEY_USERS] = users;
                saveConfig().catch(e => node.err(e));
            }

            node.hasUser = (userID) => {
                const users = config2fa[KEY_USERS];
                if (users[userID] !== undefined) {
                    return true;
                }

                return false;
            }

            node.getUser = (userID) => {
                const users = config2fa[KEY_USERS];
                if (users[userID] !== undefined) {
                    return users[userID];
                }

                return undefined;
            }


            node.getSecret = (userID, encoding = 'base32') => {
                const users = config2fa[KEY_USERS];
                if (users[userID] !== undefined) {
                    const user = users[userID];

                    switch (encoding) {
                        case 'hex': return user.secret.hex;
                        case 'ascii': return user.secret.ascii;
                        case 'base64': return user.secret.base64;
                        case 'base32':
                        default: return user.secret.base32;
                    }
                }

                return undefined;
            }

            node.getSecretLength = function () {
                return config2fa[KEY_SECRET_LENGTH] !== undefined ? config2fa[KEY_SECRET_LENGTH] : SECRET_LENGTH;
            }

            node.getSecretUseSymbols = function () {
                return config2fa[KEY_SECRET_SYMBOLS] !== undefined ? config2fa[KEY_SECRET_SYMBOLS] : SECRET_USE_SYMBOLS;
            }

            initiated = true;
        };

        checkExists(configFilePath).then(exists => {
            if (exists) {
                fsp.readFile(configFilePath)
                    .then(data => {
                        try {
                            config2fa = JSON.parse(data);
                            init();
                        } catch (e) {
                            node.warn(`Failed to parse 2FA config file. (${e})`);
                        }
                    })
                    .catch(e => {
                        node.warn(`2FA config file does not exist. (${configFilePath})`);
                    });
            } else {
                saveConfig()
                    .then(_ => init())
                    .catch(e => {
                        console.error(e);
                        node.warn(e);
                    });
            }
        });

        node.isInitiated = () => {
            return initiated;
        };
    }

    RED.nodes.registerType("node-red-2fa-config", NodeRed2FAConfig);
}