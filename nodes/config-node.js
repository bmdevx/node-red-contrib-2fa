const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DEAFULT_FILE_PATH = '/data/config-2fa.json';

const KEY_USERS = 'users';

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

    function ConfigNode(config) {
        RED.nodes.createNode(this, config);

        var initiated = false;

        const node = this;
        const configFilePath = (config.configPath && typeof config.configPath == 'string') ? config.configPath : DEAFULT_FILE_PATH;

        var usersCfg = { users: {} };

        const saveConfig = (filePath, cfg) => {
            return new Promise((resolve, reject) => {
                try {
                    var data = JSON.stringify(cfg);

                    try {
                        createDirIfNotExist(filePath);

                        if (config.encryptUsersConfig && node.credentials.encryptionKey) {
                            var encryptionKey = crypto.createHash('sha256').update(node.credentials.encryptionKey).digest();
                            var initVector = crypto.randomBytes(16);
                            var cipher = crypto.createCipheriv("aes-256-ctr", encryptionKey, initVector);
                            var enryptedData = cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
                            data = '!' + initVector.toString('hex') + enryptedData;
                        }

                        fsp.writeFile(filePath, data)
                            .then(_ => {
                                resolve();
                            })
                            .catch(e => {
                                reject(`2FA config file failed to save- ${e}`);
                            })
                    } catch (e) {
                        reject(`2FA config file failed to encrypt- ${e}`);
                    }
                } catch (e) {
                    reject(`2FA config file failed to convert to json- ${e}`);
                }
            });
        }

        const loadConfig = (filePath) => {
            return new Promise((resolve, reject) => {
                fsp.readFile(filePath)
                    .then(data => {
                        try {
                            if (data.length > 0) {
                                if (Buffer.isBuffer(data)) {
                                    data = data.toString();
                                }

                                if (data[0] === '!') {
                                    if (node.credentials.encryptionKey === undefined) {
                                        reject('No decryption key found');
                                    } else {
                                        var encryptionKey = crypto.createHash('sha256').update(node.credentials.encryptionKey).digest();
                                        var initVector = new Buffer(data.substring(1, 33), 'hex');
                                        data = data.substring(33);
                                        var decipher = crypto.createDecipheriv("aes-256-ctr", encryptionKey, initVector);
                                        var decryptedData = decipher.update(data, 'base64', 'utf8') + decipher.final('utf8');

                                        if (decryptedData[0] !== '{') {
                                            reject('Invalid encryption key');
                                        } else {
                                            resolve(JSON.parse(decryptedData));
                                        }
                                    }
                                } else {
                                    resolve(JSON.parse(data));
                                }
                            } else {
                                reject('Invalid config file');
                            }
                        } catch (e) {
                            reject(`Failed to parse 2FA config file. (${e})`);
                        }
                    })
                    .catch(e => {
                        reject(`2FA config file does not exist. (${filePath})`);
                    });
            });
        }

        const init = () => {
            node.setUser = (user) => {
                return new Promise((resolve, reject) => {
                    const users = usersCfg[KEY_USERS];
                    users[user.userID] = user;
                    usersCfg[KEY_USERS] = users;
                    saveConfig(configFilePath, usersCfg)
                        .then(_ => resolve())
                        .catch(e => {
                            reject(e);
                        });
                });
            }

            node.deleteUser = (userID) => {
                return new Promise((resolve, reject) => {
                    const users = usersCfg[KEY_USERS];
                    if (users[userID] !== undefined) {
                        delete users[userID];
                        usersCfg[KEY_USERS] = users;

                        saveConfig(configFilePath, usersCfg)
                            .then(_ => resolve({ deleted: true, userID: userID }))
                            .catch(e => {
                                reject(e);
                            });
                    } else {
                        resolve({ deleted: false, userID: userID, error: 'User not found' });
                    }
                });
            }

            node.hasUser = (userID) => {
                const users = usersCfg[KEY_USERS];
                if (users[userID] !== undefined) {
                    return true;
                }

                return false;
            }

            node.getUser = (userID) => {
                const users = usersCfg[KEY_USERS];
                if (users[userID] !== undefined) {
                    return users[userID];
                }

                return undefined;
            }

            node.getSecret = (userID, encoding = 'base32') => {
                const users = usersCfg[KEY_USERS];
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
                return config.secretLength !== undefined ? config.secretLength : SECRET_LENGTH;
            }

            node.getSecretUseSymbols = function () {
                return config.secretUseSymbols !== undefined ? config.secretUseSymbols : SECRET_USE_SYMBOLS;
            }

            initiated = true;
        };

        checkExists(configFilePath).then(exists => {
            if (exists) {
                loadConfig(configFilePath)
                    .then(cfg => {
                        usersCfg = cfg;
                        init();
                    })
                    .catch(e => {
                        node.error(e);
                    });
            } else {
                saveConfig(configFilePath, usersCfg)
                    .then(_ => init())
                    .catch(e => {
                        node.error(e);
                    });
            }
        });

        node.isInitialized = () => {
            return initiated;
        };
    }

    RED.nodes.registerType("config-node", ConfigNode, {
        credentials: {
            encryptionKey: { type: "password" },
            decrypt: {}
        }
    });
}