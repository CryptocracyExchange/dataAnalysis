'use strict';
const DeepstreamClient = require('deepstream.io-client-js');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const mockData = require('../mockdata.js');
const _ = require('lodash');
const moment = require('moment');
const Big = require('big');
const cron = require('node-cron');

const Provider = function (config) {
  this.isReady = false;
  this._config = config;
  this._logLevel = config.logLevel !== undefined ? config.logLevel : 1;
  this._deepstreamClient = null;
  this._transactionHistory = {};
  // sort mockdata
  this._sortedData = mockData.mockData
        .sort((a, b) => moment(b.date).diff( moment(a.date) ))
  this._sortedData.forEach((each, i) => { each.value = mockData.stockData[i]; });
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


Provider.prototype.init = function () {
  const history = this._deepstreamClient.record.getList('transactionHistory');
  history.whenReady((list) => {
    const closedList = list.getEntries();

    // for each record of currency pair periods
    // find latest date
    // if 
    // this._deepstreamClient.record.getRecord(`chartData/${pair}${periodDur}`)
  // check if last record date in each chartData list matches closedlist last transaction date
  // if yes
  //   fire CronJobs (15m, 30m, 1h, 2h)
  // if no
  //   run catchup function which starts at top of current hour, processing all til hit start of last processed period
    const fifteen = cron.schedule('* */15 * * * *', (closedList) => {
      const fifteenAgo = this._subtractPeriod(moment(), 15, 'minutes');
      const BTCLTC = [];
      const LTCDOGE = [];
      const DOGEBTC = [];
        // loop backwards over closed transactions
      let shouldStop = false;
      while ( shouldStop === false ) {
        let i = closedList.length - 1;
        let row = {};
        // get snapshot of each record
        this._deepstreamClient.record.snapshot(closedList[i], (rec) => {
          if ( moment(rec.date).diff(fifteenAgo) >= 0 ) {
            row.date = rec.date;
            row.value = Big( rec.price ).div( rec.amount );
            // sort to currency pairs
            if ( rec.currFrom === 'BTC' && rec.currTo === 'LTC' ) {
              BTCLTC.push(row);
            } else if ( rec.currFrom === 'LTC' && rec.currTo === 'DOGE' ) {
              LTCDOGE.push(row);
            } else {
              DOGEBTC.push(row);
            }
          } else {
            shouldStop = true;
          }
        })
        i--;
      }
      this.process(BTCLTC, '15m', 'btcltc', fifteenAgo);
      this.process(LTCDOGE, '15m', 'ltcdoge', fifteenAgo);
      this.process(DOGEBTC, '15m', 'dogebtc', fifteenAgo);
      },
      true
    ); 

    const thirty = cron.schedule('* */30 * * * *', (closedList) => {
      const thirtyAgo = this._subtractPeriod(moment(), 30, 'minutes');
      const BTCLTC = [];
      const LTCDOGE = [];
      const DOGEBTC = [];
        // loop backwards over closed transactions
      let shouldStop = false
      while (shouldStop === false) {
        let i = closedList.length - 1;
        let row = {};
        // get snapshot of each record
        this._deepstreamClient.record.snapshot(closedList[i], (rec) => {
          if ( moment(rec.date).diff(thirtyAgo) >= 0 ) {
            row.date = rec.date;
            row.value = Big(rec.price).div(rec.amount);
            // sort to currency pairs
            if ( rec.currFrom === 'BTC' && rec.currTo === 'LTC' ) {
              BTCLTC.push(row);
            } else if ( rec.currFrom === 'LTC' && rec.currTo === 'DOGE' ) {
              LTCDOGE.push(row);
            } else {
              DOGEBTC.push(row);
            }
          } else {
            shouldStop = true;
          }
        })
        i--;
      }
      this.process(BTCLTC, '30m', 'btcltc', thirtyAgo);
      this.process(LTCDOGE, '30m', 'ltcdoge', thirtyAgo);
      this.process(DOGEBTC, '30m', 'dogebtc', thirtyAgo); 
      },
      true
    );

    const hour = cron.schedule('* 0 */1 * * *', (closedList) => {
      const hourAgo = this._subtractPeriod(moment(), 1, 'hours');
      const BTCLTC = [];
      const LTCDOGE = [];
      const DOGEBTC = [];
        // loop backwards over closed transactions
      let shouldStop = false
      while (shouldStop === false) {
        let i = closedList.length - 1;
        let row = {};
        // get snapshot of each record
        this._deepstreamClient.record.snapshot(closedList[i], (rec) => {
          if ( moment(rec.date).diff(hourAgo) >= 0 ) {
            row.date = rec.date;
            row.value = Big(rec.price).div(rec.amount);
            // sort to currency pairs
            if ( rec.currFrom === 'BTC' && rec.currTo === 'LTC' ) {
              BTCLTC.push(row);
            } else if ( rec.currFrom === 'LTC' && rec.currTo === 'DOGE' ) {
              LTCDOGE.push(row);
            } else {
              DOGEBTC.push(row);
            }
          } else {
            shouldStop = true;
          }
        })
        i--;
      }
      this.process(BTCLTC, '1h', 'btcltc', hourAgo);
      this.process(LTCDOGE, '1h', 'ltcdoge', hourAgo);
      this.process(DOGEBTC, '1h', 'dogebtc', hourAgo);
      },
      true
    );

    const twohours = cron.schedule('* 0 */2 * * *', (closedList) => {
      const twohoursAgo = this._subtractPeriod(moment(), 2, 'hours');
      const BTCLTC = [];
      const LTCDOGE = [];
      const DOGEBTC = [];
        // loop backwards over closed transactions
      let shouldStop = false
      while (shouldStop === false) {
        let i = closedList.length - 1;
        let row = {};
        // get snapshot of each record
        this._deepstreamClient.record.snapshot(closedList[i], (rec) => {
          if ( moment(rec.date).diff(twohoursAgo) >= 0 ) {
            row.date = rec.date;
            row.value = Big(rec.price).div(rec.amount);
            // sort to currency pairs
            if ( rec.currFrom === 'BTC' && rec.currTo === 'LTC' ) {
              BTCLTC.push(row);
            } else if ( rec.currFrom === 'LTC' && rec.currTo === 'DOGE' ) {
              LTCDOGE.push(row);
            } else {
              DOGEBTC.push(row);
            }
          } else {
            shouldStop = true;
          }
        })
        i--;
      }
      this.process(BTCLTC, '2h', 'btcltc', twohoursAgo);
      this.process(LTCDOGE, '2h', 'ltcdoge', twohoursAgo);
      this.process(DOGEBTC, '2h', 'dogebtc', twohoursAgo);
      },
      true
    );
  })
}

Provider.prototype.process = function (array, periodDur, pair, start) {
  const period = {};
  period.date = start.toDate();
  period.close = array[0].value;
  period.open = array[array.length - 1].value;
  period.low = this._findHighandLow(array)[0];
  period.high = this._findHighandLow(array)[1];
  period.volume = array.length;

  this._deepstreamClient.record.getRecord(`chartData/${pair}${periodDur}`).whenReady((record) => {
    let rec = record.get() || [];
    record.set( 'data', rec.push(period) );
  })
};


Provider.prototype._getPeriods = function (data, periodDur) {
  let periodEnd = moment(data[0].date).endOf('hour').toDate();
  let periodStart = this._subtractPeriod(periodEnd, periodDur[0], periodDur[1]);
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
      perRow.low = this._findHighandLow(period)[0];
      perRow.high = this._findHighandLow(period)[1];
      perRow.close = period[0].value;
      perRow.open = period[period.length - 1].value;
      perRow.volume = period.length;
      periodData.push(perRow);
      period = [];
      period.push(row);
      let temp = periodStart;
      periodStart = this._subtractPeriod(temp, periodDur[0], periodDur[1]);
      periodEnd = temp;
    }
  }
  return periodData;
};

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
