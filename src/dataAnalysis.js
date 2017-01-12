// pulls all closed transaction data
// gathers all transactions and returns data by date
// returns 24h highs & lows(?)
// after init, only push new data



module.exports.init = (client) => {
  const query = {
    table: 'closed',
    query: [
      []
    ]
  }

  client.record.getList('Search?' + query, (data) => {
    console.log('data', data)
  })
}
