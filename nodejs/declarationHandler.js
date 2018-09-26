/**
 * Copyright 2018 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const BigIp = require('@f5devcentral/f5-cloud-libs').bigIp;
const DeclarationParser = require('./declarationParser');
const Logger = require('./logger');
const SystemHandler = require('./systemHandler');
const NetworkHandler = require('./networkHandler');

const logger = new Logger(module);

class DeclarationHandler {
    constructor(declaration) {
        this.declaration = declaration;
    }

    process() {
        try {
            const declarationParser = new DeclarationParser(this.declaration);
            const parsedDeclaration = declarationParser.parse();

            const bigIp = new BigIp({ logger });
            return cloudUtil.runTmshCommand('list sys httpd ssl-port')
                .then((response) => {
                    const regex = /(\s+ssl-port\s+)(\S+)\s+/;
                    const port = regex.exec(response)[2];
                    return bigIp.init(
                        'localhost',
                        'admin',
                        'admin',
                        {
                            port,
                            product: 'BIG-IP'
                        }
                    );
                })
                .then(() => {
                    return bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' });
                })
                .then(() => {
                    return new SystemHandler(parsedDeclaration.System, bigIp).process();
                })
                .then(() => {
                    // return new NetworkHandler(parsedDeclaration.Network, bigIp).process();
                    return Promise.resolve();
                })
                .catch((err) => {
                    return Promise.reject(err);
                });
        } catch (err) {
            logger.warning(`Error parsing declaration: ${err.message}`);
            return Promise.reject(err);
        }
    }
}

module.exports = DeclarationHandler;