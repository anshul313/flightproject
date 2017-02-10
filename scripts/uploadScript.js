"use strict";

const sheetsHelper = require("./sheetsHelper");
const hasuraHelper = require("./hasuraHelper");
const Rx = require('rx');

const BATCH_SIZE = 2000; //Tanmai recommended a batch size of 50

sheetsHelper.authToken()
    .map(authToken => {
        return {
            auth: authToken,
            spreadsheetId: "1iAqrf3zogDS-JiTbJ0Gd3w0V-eiKVE68uXN682NCcOI",
            range: ("Sheet1!A2:8920")
        };
    })
    .flatMap(sheetsHelper.get)
    .concatMap(response => response.values)
    .flatMap(row => {
        const flights = [];

        const flight_number = row[0].replace(/\s+/g, '');
        const origin = row[1].replace(/[()]/g, '');
        const origin_code = row[2].replace(/[()]/g, '');
        const destination = row[3].replace(/[()]/g, '');
        const destination_code = row[4].replace(/[()]/g, '');
        const departure_time = row[5];
        const arrival_time = row[6];
        const daysOfOperation = row[7];
        const valid_from = row[8];
        const valid_till = row[9];
        const airline = row[10];

        const startDate = new Date(valid_from);
        const endDate = new Date(valid_till);
        const today = new Date();

        if (isNaN(startDate.getTime() || isNaN(endDate.getTime()))) {
            console.error(flight_number + " departing " + departure_time + ", has an invalid date range.")
        }

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (daysOfOperation.includes(convertDayToOperation(d.getDay()))) {
                const flight = {
                    number: flight_number,
                    origin: origin,
                    destination: destination,
                    departure: generateTimestamp(departure_time, d),
                    arrival: generateTimestamp(arrival_time, d),
                    airline: airline,
                    origin_code: origin_code,
                    destination_code: destination_code,
                    eff_from: startDate,
                    eff_till: endDate,
                    op_days: daysOfOperation
                };
                if (flight.departure.getTime() >= today.getTime()) {
                    flights.push(flight);
                }
            } else {

            }
        }
        return Rx.Observable.from(flights);
    })
    .bufferWithCount(BATCH_SIZE)
    .concatMap(hasuraHelper.insert)
    .map(response => response.data)
    .map(data => data.affected_rows)
    .scan((acc, x, i, source) => acc + x, 0)
    .map(rowCount => "Total rowcount: " + rowCount)
    // .count()
    .subscribe(console.log, console.error);

function generateTimestamp(time, date) {
    const timeArr = time.trim().split(":");
    const hours = parseInt(timeArr[0]);
    let minutes = timeArr[1];
    let dateIncrement = 0;
    if (minutes.includes("+")) {
        const minuteArr = minutes.split("+");
        minutes = parseInt(minuteArr[0]);
        dateIncrement = parseInt(minuteArr[1]);
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + dateIncrement, hours, minutes);
}

function offsetDate(date) {
    date.setMinutes(date.getMinutes() + 330);
    return date;
}

function convertDayToOperation(day) {
    if (day == 0) {
        return 7;
    } else
        return day;
}
