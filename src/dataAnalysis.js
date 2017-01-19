'use strict';
const DeepstreamClient = require('deepstream.io-client-js');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const mockData = require('../mockdata.js');
const _ = require('lodash');
const moment = require('moment');
const Big = require('big.js');
const cron = require('node-cron');

const Provider = function (config) {
  this.isReady = false;
  this._config = config;
  this._logLevel = config.logLevel !== undefined ? config.logLevel : 1;
  this._deepstreamClient = null;
  this._transactionHistory = {};
  // sort mockdata
  // this._sortedData = mockData.mockData
  //       .sort((a, b) => moment(b.date).diff( moment(a.date) ))
  // this._sortedData.forEach((each, i) => { each.value = mockData.stockData[i]; });
};

util.inherits(Provider, EventEmitter);

Provider.prototype.start = function () {
  this._initialiseDeepstreamClient();
};

Provider.prototype.stop = function () {
  this._deepstreamClient.close();
};

Provider.prototype.log = function (message, level) {
  if (this._logLevel < level) {
    return;
  }

  const date = new Date();
  const time = `${date.toLocaleTimeString()}:${date.getMilliseconds()}`;

  console.log(`${time}::Data Analysis::${message}`);
};

Provider.prototype._initialiseDeepstreamClient = function () {
  this.log('Initialising Deepstream connection', 1);

  if (this._config.deepstreamClient) {
    this._deepstreamClient = this._config.deepstreamClient;
    this.log('Deepstream connection established', 1);
    this._ready();
  } else {
    if (!this._config.deepstreamUrl) {
      throw new Error('Can\'t connect to deepstream, neither deepstreamClient nor deepstreamUrl were provided', 1);
    }

    if (!this._config.deepstreamCredentials) {
      throw new Error('Missing configuration parameter deepstreamCredentials', 1);
    }

    this._deepstreamClient = new DeepstreamClient(this._config.deepstreamUrl);
    this._deepstreamClient.on('error', (error) => {
      console.log(error);
    });
    this._deepstreamClient.login(
      this._config.deepstreamCredentials,
      this._onDeepstreamLogin.bind(this)
      );
  }
};

Provider.prototype._onDeepstreamLogin = function (success, error, message) {
  if (success) {
    this.log('Connection to deepstream established', 1);
    this._ready();
  } else {
    this.log(`Can't connect to deepstream: ${message}`, 1);
  }
};

Provider.prototype._ready = function () {
  this.init();
  this.log('Provider ready', 1);
  this.isReady = true;
  this.emit('ready');
};

Provider.prototype.reboot = function() {
  console.log('reboot');
  setTimeout(() => {this.init()}, 10000)
}


Provider.prototype.init = function () {
  let BTCLTC = [];
  let LTCDOGE = [];
  let DOGEBTC = [];
  this._deepstreamClient.event.subscribe('closedSale', (data) => {
    console.log('//////data', data)
    if (!data) {
      this.reboot();
      return;
    }
    if (data.type === 'buy') {
      let row = {};
      row.date = data.date;
      row.value = data.price/data.amount;
      console.log('row', row)
      if ( data.currFrom === 'BTC' && data.currTo === 'LTC') {
        BTCLTC.push(row);
      } else if ( data.currFrom === 'LTC' && data.currTo === 'DOGE') {
        LTCDOGE.push(row);
      } else {
        DOGEBTC.push(row);
      }
      row = {};
    }
  })
    // if server reboots, check if a catch up is necessary
    // this._deepstreamClient.record.snapshot(closedList[closedList.length - 1], (lastClosed) => {
    //   this._deepstreamClient.record.snapshot(`chartData/lastProcessed`), (lastProcessed) => {
    //     if (moment(lastProcessed.date).diff(moment(lastClosed.date)) >= 0) {
    //       this._catchup(lastProcessed.date, closedList);
    //     }
    //   }
    // })

    const two = cron.schedule('* */2 * * * *', function () {
      let periodDur = [2, 'minutes', '2m'];
      const periodAgo = this._subtractPeriod(moment(), periodDur[0], periodDur[1]);
      // console.log('cron trigger');
      if (BTCLTC.length > 0) {
        this._process(BTCLTC, periodDur[2], 'BTCLTC', periodAgo);
        BTCLTC = [];
      }
      if (LTCDOGE.length > 0) {
        this._process(LTCDOGE, periodDur[2], 'LTCDOGE', periodAgo);
        LTCDOGE = [];
      }
      if (DOGEBTC.length > 0) {
        this._process(DOGEBTC, periodDur[2], 'DOGEBTC', periodAgo);
        DOGEBTC = [];
      }
      
      // return;
    }.bind(this),
      true
    ); 

    // const fifteen = cron.schedule('* */15 * * * *', this._prepare(closedList, [15, 'minutes', '15m']),
    //   true
    // ); 

    // const thirty = cron.schedule('* */30 * * * *', this._prepare(closedList, [30, 'minutes', '30m']),
    //   true
    // );

    // const hour = cron.schedule('* 0 */1 * * *', this._prepare(closedList, [1, 'hours', '1h']),
    //   true
    // );

    // const twohours = cron.schedule('* 0 */2 * * *', this._prepare(closedList, [2, 'hours', '2h']),
    //   true
    // );
  // })
}



Provider.prototype._process = function (array, periodDur, pair, start) {
  if (!array.length) {
    console.log('nothing to process')
    return;
  }
  const period = {};
  period.date = start.toDate();
  period.close = array[0].value;
  period.open = array[array.length - 1].value;
  period.low = this._findHighandLow(array)[0];
  period.high = this._findHighandLow(array)[1];
  period.volume = array.length;
  this._deepstreamClient.record.getRecord(`chartData/${pair}${periodDur}`).whenReady((record) => {
    let rec;
    if (!record.get().data) {
      rec = [];
      rec.push(period);
    } else {
      rec = record.get().data;
      rec.push(period);
    }
    record.set( 'data', rec );
  })
  this._deepstreamClient.record.getRecord('chartData/lastProcessed').whenReady((record) => {
    record.set('date', start.toDate());
    console.log('chartData period processed')
  })
};


// Provider.prototype._getPeriods = function (data, periodDur) {
//   let periodEnd = moment(data[0].date).endOf('hour').toDate();
//   let periodStart = this._subtractPeriod(periodEnd, periodDur[0], periodDur[1]);
//   let periodData = [];
//   let period = [];
//   for (var i = 0; i < data.length; i++) {
//       let row = {}
//       row.date = data[i].date;
//       row.value = data[i].value;
//     if (new Date(row.date).getTime() > new Date(periodStart).getTime() && new Date(row.date).getTime() <= new Date(periodEnd).getTime() ) {
//       period.push(row);
//     } else {
//       let perRow = {}
//       perRow.date = periodStart;
//       perRow.low = this._findHighandLow(period)[0];
//       perRow.high = this._findHighandLow(period)[1];
//       perRow.close = period[0].value;
//       perRow.open = period[period.length - 1].value;
//       perRow.volume = period.length;
//       periodData.push(perRow);
//       period = [];
//       period.push(row);
//       let temp = periodStart;
//       periodStart = this._subtractPeriod(temp, periodDur[0], periodDur[1]);
//       periodEnd = temp;
//     }
//   }
//   return periodData;
// };

Provider.prototype._subtractPeriod = function (time, amt, increment) {
  return time.subtract(amt, increment);
};

Provider.prototype._findHighandLow = function (array) {
  let low = array[0].value;
  let high = array[0].value;
  for (let i = 1; i < array.length; i++) {
    if (array[i].value < low) {
      low = array[i].value;
    } else if (array[i].value > high) {
      high = array[i].value;
    }
  }
  return [low, high];
};

module.exports = Provider;
