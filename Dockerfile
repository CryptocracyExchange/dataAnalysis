FROM node:7.4-alpine

ENV DEEPSTREAM_AUTH_ROLE=provider \
    DEEPSTREAM_AUTH_USERNAME=dataanalysis-service

RUN mkdir /usr/local/dataanalysis
WORKDIR /usr/local/dataanalysis
COPY . /usr/local/dataanalysis
RUN npm install

CMD [ "npm", "run", "start-prod"]
