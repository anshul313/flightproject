const axios = require("axios");
const Rx = require('rx');
const fetch = require('node-fetch');

axios.defaults.baseURL = 'https://data.ailment92.hasura-app.io/v1/query';
axios.defaults.headers.common['Authorization'] = "Bearer " + process.ENV.HASURA_AUTH_TOKEN;
axios.defaults.headers.post['Content-Type'] = 'application/json';

var exports = module.exports = {};

exports.insert = function (objects) {
    return Rx.Observable.defer(() => Rx.Observable.fromPromise(axios({
        method: 'post',
        url: '/',
        data: {
            type: "insert",
            args: {
                table: "flights",
                objects: objects
            }
        }
    }))).doOnError(console.error)
        .retry();
};

exports.updateFlightNumbers = function (records) {
    return Rx.Observable.from(records)
        .map(createFlightNumberArgs)
        .toArray()
        .flatMap(args => Rx.Observable.defer(() => Rx.Observable.fromPromise(
            axios({
                method: 'post',
                url: '/',
                data: {
                    type: "bulk",
                    args: args
                }
            }))
        ).retry());
};

exports.updateAirlineNamesToIndigo = function (records) {
    return Rx.Observable.from(records)
        .map(createAirlineNameArgs)
        .toArray()
        .flatMap(args => Rx.Observable.defer(() => Rx.Observable.fromPromise(
            axios({
                method: 'post',
                url: '/',
                data: {
                    type: "bulk",
                    args: args
                }
            }))
        ).retry());
};

function createAirlineNameArgs(record) {
    return {
        type: "update",
        args: {
            table: "flights",
            $set: {
                airline: "Indigo"
            },
            where: {
                id: record.id
            }
        }
    };
}

function createFlightNumberArgs(record) {
    return {
        type: "update",
        args: {
            table: "flights",
            $set: {
                number: record.number.replace('\s+', '')
            },
            where: {
                id: record.id
            }
        }
    };
}

exports.findIncorrectFlightNumbers = function () {
    console.log("WTF");
    return Rx.Observable.defer(() => Rx.Observable.fromPromise(axios({
        method: 'post',
        url: '/',
        data: {
            type: "select",
            args: {
                table: "flights",
                columns: ["id", "number"],
                where: {"airline": {"eq": "Indigo"}},
                returning: ["id", "number"]
            }
        }
    }))).retry();
};

exports.findAirlinesByName = function (airlineName) {
    return Rx.Observable.defer(() => Rx.Observable.fromPromise(axios({
        method: 'post',
        url: '/',
        data: {
            type: "select",
            args: {
                table: "flights",
                columns: ["id", "airline"],
                where: {"airline": {"$like": airlineName}},
                returning: ["id", "number"]
            }
        }
    }))).retry();
};

exports.updateAirlinesByName = function (oldAirlineName, newAirlineName) {
    return Rx.Observable.defer(() => Rx.Observable.fromPromise(axios({
        method: 'post',
        url: '/',
        data: {
            type: "update",
            args: {
                table: "flights",
                $set: {
                    airline: newAirlineName
                },
                where: {"airline": {"$like": oldAirlineName}}
            }
        }
    }))).retry();
};

// exports.insert = function (objects) {
//     return Rx.Observable.fromPromise(fetch('https://data.guarani85.hasura-app.io/v1/query', {
//         method: 'POST', headers: {
//             Authorization: "Bearer rlik5rdpjk8ayo0d3un0xcsu169jq3oe"
//         }, body: JSON.stringify({
//             type: "insert",
//             args: {
//                 table: "flights",
//                 objects: objects
//             }
//         })
//     }));
// };


// let testDate = generateTimestamp("21:30", new Date("1-Oct-16"));
// const flight = [{
//     number: "123",
//     origin: "asb",
//     destination: "dsa",
//     departure: generateTimestamp("21:30", new Date()),
//     arrival: generateTimestamp("23:30", new Date()),
//     airline: "Need to add this to the excel",
//     origin_code: "dsdd",
//     destination_code: "aasd",
//     valid_from: offsetDate(new Date()),
//     valid_till: offsetDate(new Date())
// }];
//
// exports.insert(flight)
//     .subscribe(console.log);
//
// function generateTimestamp(time, date) {
//     const timeArr = time.trim().split(":");
//     const hours = timeArr[0];
//     const minutes = timeArr[1];
//     return offsetDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0));
// }
//
// function offsetDate(date) {
//     date.setMinutes(date.getMinutes() + 330);
//     return date;
// }
