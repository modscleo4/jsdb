/**
 * Copyright 2019 Dhiego Cassiano Fogaça Barbosa

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @file Script to the CSV generation system
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {config} = require('../../config');

exports.dataToCSV = function dataToCSV(data) {
    let csv = '';

    let cols = [];
    for (let key in data[0]) {
        if (data[0].hasOwnProperty(key)) {
            cols.push(key);
        }
    }

    csv += cols.join(',');
    csv += '\n';

    for (let i = 0; i < data.length; i++) {
        let d = [];

        for (let key in data[i]) {
            if (data[i].hasOwnProperty(key)) {
                let dd = data[i][key];
                if (typeof dd === 'object' && dd != null) {
                    dd = JSON.stringify(dd);
                }

                d.push(dd);
            }
        }

        csv += d.join(',');
        csv += '\n';
    }

    return csv;
};

exports.CSVToData = function CSVToData(csv) {
    let data = [];

    return data;
};
