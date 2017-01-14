const DataAnalysisProvider = require('./dataAnalysis');

const dataAnalysis = new DataAnalysisProvider({
  /**
   * Only use 1 for production!
   * 0 = logging off
   * 1 = only log connection events & errors
   * 2 = also log subscriptions and discards
   * 3 = log outgoing messages
   */
  logLevel: process.env.NODE_ENV === 'prod' ? 1 : 3,
  deepstreamUrl: `${process.env.NODE_ENV === 'prod' ? 'deepstream' : 'localhost'}:6020`,
  deepstreamCredentials: process.env.NODE_ENV === 'prod' ? {
    role: process.env.DEEPSTREAM_AUTH_ROLE,
    username: process.env.DEEPSTREAM_AUTH_USERNAME,
    password: process.env.DEEPSTREAM_AUTH_PASSWORD
  } : {role: 'provider'}
});

dataAnalysis.start();

if (process.env.NODE_ENV !== 'prod') {
  const express = require('express');
  const path = require('path');
  const morgan = require('morgan');
  const chalk = require('chalk');
  
  const app = express();
  app.use(morgan('combined'));
  app.use('/', express.static(path.join(__dirname, '../public')));

  const port = 3006;
  app.listen(port, () => {
    console.log(chalk.blue(`DataAnalysis on ${port}!///////////////`));
  });
}

