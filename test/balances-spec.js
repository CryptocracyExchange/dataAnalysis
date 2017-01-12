// const DeepstreamServer = require('deepstream.io')
const assert = require('assert');
const testData = require('./testBalances');
const balances = require('../src/balances');
// const client = require('../src/config');
// const Big = require('big.js');

// Create server
// const server = new DeepstreamServer({
//   host: 'localhost',
//   port: 6020
// });

describe('balances', () => {

  describe('checkBalance()', function () {

    // before((done) => {
    //   server.start();
    //   setTimeout(() => {
    //     done();
    //   }, 1000);
    // })

    // beforeEach((done) => {
    //   const url = process.env.NODE_ENV === 'prod' ? 'deepstream' : 'localhost';
    //   client(`${url}:6020`).login();
    //   // test data
    //   const initTestData = () => {
    //     const userID = '00';
    //     const type = 'BTC';
    //     const amount = testData['00'].BTC;
    //     const balance = client.record.getRecord(`balances/${userID}/${type}`);
    //     balance.set('amount', amount);
    //   };

    //   initTestData(client);
    //   done();
    // });

    it('should return balance on "checkBalance" event', function(done) {
      // client.event.emit('checkBalance', {userID: '00', currency: 'BTC'});
      // client.event.subscribe('returnBalance', (data) => {

      //   assert.equal(2.03, data.balance);
        done();
      // })

    });
    // it('should return 0 on empty balance "checkBalance" event', function(done) {
    //   client.event.emit('checkBalance', {userID: '02', currency: 'BTC'});
    //   client.event.subscribe('returnBalance', (data) => {
    //     console.log('data', data);
    //     assert.equal(0, data.amount);
    //     done();
    //   })
    // });
  });
  // describe('update balance', function() {
  //   it('should update current user balance on "updateBalance" event', function(done) {
  //     client.event.emit('updateBalance', {userID: '00', update: '2', currency: 'BTC'});
  //     setTimeout(() => {
  //       client.event.subscribe('returnBalance', function (data) {
  //         assert.equal(4.03, data.amount);
  //         done();
  //       })
  //     }, 1200)
  //   });
  // });

  // afterEach(() => {
  //   client.off();
  // });

  // after(() => {
  //   server.stop();
  // });
});
