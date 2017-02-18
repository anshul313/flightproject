const hasuraHelper = require("./hasuraHelper");
const Rx = require('rx');

hasuraHelper.findIncorrectFlightNumbers()
    .flatMap(response => response.data)
    .bufferWithCount(1000)
    .flatMap(hasuraHelper.updateFlightNumbers)
    .flatMap(response => response.data)
    .doOnNext(console.log)
    .map(data => data.affected_rows)
    .scan((acc, x, i, source) => acc + x, 0)
    .map(rowCount => "Total updates: " + rowCount)
    .subscribe(console.log, console.error);