'use strict';
const DeepstreamClient = require('deepstream.io-client-js');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const mockData = require('../mockdata.js');
const _ = require('lodash');
const moment = require('moment');

const Provider = function (config) {
  this.isReady = false;
  this._config = config;
  this._logLevel = config.logLevel !== undefined ? config.logLevel : 1;
  this._deepstreamClient = null;
  this._transactionHistory = {};
  this._sortedData = mockData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() )
        .forEach((each, i) => { each.value = mockData.stockData[i]; });
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
  this._deepstreamClient.event.subscribe('getData', (data) => {  
    const query = {
      table: 'closed',
      query: [
      ['type', 'eq', 'buy']
      // ['currFrom', 'eq', data.primaryCurrency],
      // ['currTo', 'eq', data.secondaryCurrency]
      ]
    };

    const history = this._deepstreamClient.record.getList('transactionHistory');

    history.whenReady((transactions) => {
      let closedTrans = transactions.getEntries();
      for (let i = 0; i < closedTrans.length; i++) {
        this._deepstreamClient.record.getRecord(closedTrans[i]).whenReady((record) => {
          console.log('rec', record.get());
          let rec = record.get();

          transactionHistory[closedTrans[i]] = rec;
          record.discard();
          console.log('ready', transactionHistory)
        });
      }

      this._update(history);
    });

    this._deepstreamClient.event.emit('histData', () => {
      this._getPeriods(this._sortedData, 15, 'minutes');
    });
  })
};

Provider.prototype._update = (history) => {
  history.subscribe((transactions) => {
    console.log('newEntry', transactions);
    //pooled into new period by starting date
  })
};

Provider.prototype._getPeriods = function (data, amt, length) {
  let periodEnd = moment(data[0].date).endOf('hour').toDate();
  let periodStart = this._subtractPeriod(periodEnd, amt, length);
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
      perRow.low = this._findHighandLow(period)[0];
      perRow.high = this._findHighandLow(period)[1];
      perRow.close = period[0].value;
      perRow.open = period[period.length - 1].value;
      perRow.volume = period.length;
      periodData.push(perRow);
      period = [];
      period.push(row);
      let temp = periodStart;
      periodStart = this._subtractPeriod(temp, amt, length);
      periodEnd = temp;
    }
  }
  return periodData;
};

Provider.prototype._subtractPeriod = function (time, amt, increment) {
  return moment(time).subtract(amt, increment).toDate()
};

Provider.prototype._findHighandLow = function (array) {
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
};

module.exports = Provider;
