const hasuraHelper = require("./hasuraHelper");
const Rx = require('rx');

hasuraHelper.updateAirlinesByName("Air Vistara", "Vistara")
    .map(response => response.data)
    // .bufferWithCount(1000)
    // .flatMap(hasuraHelper.updateAirlineNamesToIndigo)
    // .flatMap(response => response.data)
    // .doOnNext(console.log)
    // .map(data => data.affected_rows)
    // .scan((acc, x, i, source) => acc + x, 0)
    // .map(rowCount => "Total updates: " + rowCount)
    .subscribe(console.log, console.error);