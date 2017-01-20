'use strict';
const DeepstreamClient = require('deepstream.io-client-js');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const mockData = require('../mockdata.js');
const _ = require('lodash');
const moment = require('moment');
const Big = require('big.js');
const cron = require('node-cron');

moment.locale();

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
  let BTCLTC5m = [];
  let LTCDOGE5m = [];
  let DOGEBTC5m = [];
  let BTCLTC15m = [];
  let LTCDOGE15m = [];
  let DOGEBTC15m = [];
  let BTCLTC30m = [];
  let LTCDOGE30m = [];
  let DOGEBTC30m = [];
  let BTCLTC1h = [];
  let LTCDOGE1h = [];
  let DOGEBTC1h = [];
  let BTCLTC2h = [];
  let LTCDOGE2h = [];
  let DOGEBTC2h = [];
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
        BTCLTC5m.push(row);
        BTCLTC15m.push(row);
        BTCLTC30m.push(row);
        BTCLTC1h.push(row);
        BTCLTC2h.push(row);
      } else if ( data.currFrom === 'LTC' && data.currTo === 'DOGE') {
        LTCDOGE5m.push(row);
        LTCDOGE15m.push(row);
        LTCDOGE30m.push(row);
        LTCDOGE1h.push(row);
        LTCDOGE2h.push(row);
      } else {
        DOGEBTC5m.push(row);
        DOGEBTC15m.push(row);
        DOGEBTC30m.push(row);
        DOGEBTC1h.push(row);
        DOGEBTC2h.push(row);
      }
      row = {};
    }
  })
  
    const five = cron.schedule('0 */5 * * * *', function () {
      let periodDur = [5, 'minutes', '5m'];
      const periodAgo = this._subtractPeriod(moment(), periodDur[0], periodDur[1]);
      if (BTCLTC5m.length > 0) {
        this._process(BTCLTC5m, periodDur[2], 'BTCLTC', periodAgo);
        BTCLTC5m = [];
      }
      if (LTCDOGE5m.length > 0) {
        this._process(LTCDOGE5m, periodDur[2], 'LTCDOGE', periodAgo);
        LTCDOGE5m = [];
      }
      if (DOGEBTC5m.length > 0) {
        this._process(DOGEBTC5m, periodDur[2], 'DOGEBTC', periodAgo);
        DOGEBTC5m = [];
      }
      // return;
    }.bind(this),
      false
    ); 

    const fifteen = cron.schedule('0 */15 * * * *', function () {
      let periodDur = [15, 'minutes', '15m'];
      const periodAgo = this._subtractPeriod(moment(), periodDur[0], periodDur[1]);
      if (BTCLTC15m.length > 0) {
        this._process(BTCLTC15m, periodDur[2], 'BTCLTC', periodAgo);
        BTCLTC15m = [];
      }
      if (LTCDOGE15m.length > 0) {
        this._process(LTCDOGE15m, periodDur[2], 'LTCDOGE', periodAgo);
        LTCDOGE15m = [];
      }
      if (DOGEBTC15m.length > 0) {
        this._process(DOGEBTC15m, periodDur[2], 'DOGEBTC', periodAgo);
        DOGEBTC15m = [];
      }
      // return;
    }.bind(this),
      false
    ); 

    const thirty = cron.schedule('0 */30 * * * *', function () {
      let periodDur = [30, 'minutes', '30m'];
      const periodAgo = this._subtractPeriod(moment(), periodDur[0], periodDur[1]);
      if (BTCLTC30m.length > 0) {
        this._process(BTCLTC30m, periodDur[2], 'BTCLTC', periodAgo);
        BTCLTC30m = [];
      }
      if (LTCDOGE30m.length > 0) {
        this._process(LTCDOGE30m, periodDur[2], 'LTCDOGE', periodAgo);
        LTCDOGE30m = [];
      }
      if (DOGEBTC30m.length > 0) {
        this._process(DOGEBTC30m, periodDur[2], 'DOGEBTC', periodAgo);
        DOGEBTC30m = [];
      }
      // return;
    }.bind(this),
      false
    ); 

    const hour = cron.schedule('0 0 */1 * * *', function () {
      let periodDur = [1, 'hours', '1h'];
      const periodAgo = this._subtractPeriod(moment(), periodDur[0], periodDur[1]);
      if (BTCLTC1h.length > 0) {
        this._process(BTCLTC1h, periodDur[2], 'BTCLTC', periodAgo);
        BTCLTC1h = [];
      }
      if (LTCDOGE1h.length > 0) {
        this._process(LTCDOGE1h, periodDur[2], 'LTCDOGE', periodAgo);
        LTCDOGE1h = [];
      }
      if (DOGEBTC1h.length > 0) {
        this._process(DOGEBTC1h, periodDur[2], 'DOGEBTC', periodAgo);
        DOGEBTC1h = [];
      }
      // return;
    }.bind(this),
      false
    ); 

    const twohour = cron.schedule('0 0 */2 * * *', function () {
      let periodDur = [2, 'hours', '2h'];
      const periodAgo = this._subtractPeriod(moment(), periodDur[0], periodDur[1]);
      if (BTCLTC2h.length > 0) {
        this._process(BTCLTC2h, periodDur[2], 'BTCLTC', periodAgo);
        BTCLTC2h = [];
      }
      if (LTCDOGE2h.length > 0) {
        this._process(LTCDOGE2h, periodDur[2], 'LTCDOGE', periodAgo);
        LTCDOGE2h = [];
      }
      if (DOGEBTC2h.length > 0) {
        this._process(DOGEBTC2h, periodDur[2], 'DOGEBTC', periodAgo);
        DOGEBTC2h = [];
      }
      // return;
    }.bind(this),
      false
    ); 


    five.start();
    fifteen.start();
    thirty.start();
    hour.start();
    twohour.start();
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
