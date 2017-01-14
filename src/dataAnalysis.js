'use strict';
var mockData = require('../mockdata.js');
var _ = require('lodash');
let transactionHistory = {};
var moment = require('moment');

var sortedData = mockData.sort(function(a,b) { 
    return new Date(b.date).getTime() - new Date(a.date).getTime() 
});

//insert trend data
sortedData.forEach((each, i) => {
  each.value = mockData.stockData[i];
});

let subtractPeriod = (time, amt, increment) => {return moment(time).subtract(amt, increment).toDate()};

const findHighandLow = (array) => {
  let low = array[0].value;
  let high = array[0].value;
  for (var i = 1; i < array.length; i++) {
    if (array[i].value < low) {
      low = array[i].value;
    } else if (array[i].value > high) {
      high = array[i].value;
    }
  }
  return [low, high];
}

const getPeriods = (data, amt, length) => {
  let periodEnd = moment(data[0].date).endOf('hour').toDate();
  let periodStart = subtractPeriod(periodEnd, amt, length);
  let periodData = [];
  let period = [];
  for (var i = 0; i < data.length; i++) {
      let row = {}
      row.date = data[i].date;
      row.value = data[i].value;
    if (new Date(row.date).getTime() > new Date(periodStart).getTime() && new Date(row.date).getTime() <= new Date(periodEnd).getTime() ) {
      period.push(row);
    } else {
      let perRow = {}
      perRow.date = periodStart;
      // perRow.end = periodEnd;
      perRow.low = findHighandLow(period)[0];
      perRow.high = findHighandLow(period)[1];
      perRow.close = period[0].value;
      perRow.open = period[period.length - 1].value;
      perRow.volume = period.length;
      periodData.push(perRow);
      period = [];
      period.push(row);
      let temp = periodStart;
      periodStart = subtractPeriod(temp, amt, length);
      periodEnd = temp;
    }
  }
  return periodData;
}

let testPeriods = getPeriods(sortedData, 15, 'minutes');

module.exports.init = (client) => {
  client.event.subscribe('getData', (data) => {  
    const query = {
      table: 'closed',
      query: [
      ['type', 'eq', 'buy']
      // ['currFrom', 'eq', data.primaryCurrency],
      // ['currTo', 'eq', data.secondaryCurrency]
      ]
    }

    let history = client.record.getList('transactionHistory');
    

    history.whenReady((transactions) => {
      let closedTrans = transactions.getEntries();
      for (let i = 0; i < closedTrans.length; i++) {
        client.record.getRecord(closedTrans[i]).whenReady((record) => {
          console.log('rec', record.get());
          let rec = record.get();

          transactionHistory[closedTrans[i]] = rec;
          record.discard();
          console.log('ready', transactionHistory)
        });
      }
 
      update(client, history);
    })

      client.event.emit('histData', testPeriods);
  })
}


const update = (client, history) => {
  history.subscribe((transactions) => {
    console.log('newEntry', transactions);

    //pooled into new period by starting date
  })
}





