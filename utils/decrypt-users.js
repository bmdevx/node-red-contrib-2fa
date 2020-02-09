const fsp = require('fs').promises;
const crypto = require('crypto');

const saveConfig = (filePath, cfg) => {
    return new Promise((resolve, reject) => {
        try {
            var data = JSON.stringify(cfg);

            fsp.writeFile(filePath, data)
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

const loadConfig = (filePath, key) => {
    return new Promise((resolve, reject) => {
        fsp.readFile(filePath)
            .then(data => {
                try {
                    if (data.length > 0) {
                        if (Buffer.isBuffer(data)) {
                            data = data.toString();
                        }

                        if (data[0] === '!') {
                            if (key === undefined) {
                                reject('No decryption key found');
                            } else {
                                var encryptionKey = crypto.createHash('sha256').update(key).digest();
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


if (process.argv.length < 5) {
    console.log("Invalid Arguments.");
    console.log("args: usersFile decryptedFile password");
} else {
    console.log(`file: ${process.argv[2]} - ofile: ${process.argv[3]} - pass: ${process.argv[4]}`)
    loadConfig(process.argv[2], process.argv[4])
        .then(cfg => {
            saveConfig(process.argv[3], cfg);
        })
        .catch(e => {
            console.error(e);
        });
}