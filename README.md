# LiFi FeeCollector Off-chain Reporter

## Description

### Purpose

This is a mono-repository for developing and running 2 main backend services, on top of the LiFi protocol:

1. A serverless scraper of on-chain events: `FeeCollected` events emitted by the LiFi `FeeCollector` contracts deployed on several blockchains. A scraping session can be triggered manually or scheduled to run periodically on a given blockchain.

2. A backend REST/json API to report the fees collected by the integrators of the LiFi protocol

### Technical Stack

The `FeeCollected` events are stored in a [MongoDB](https://mongodb.com/) database/cluster. [Typegoose](https://typegoose.github.io/typegoose/) is used, on top of the [Mongoose](https://mongoosejs.com/) ODM, as well as the [GrapeoffJS/kindagoose](https://github.com/GrapeoffJS/kindagoose) for the NestJS integration.

The [NestJS](https://github.com/nestjs/nest) development framework is used as one of the main foundation of these backend modules.

The [Serverless](https://serverless.com/) tooling is used for developing the events scraper to be locally ran and deployed, for instance as AWS Lambda functions.

## Installation

[Node.js](https://nodejs.org/) must be installed on your OS. Lower versions than `18.x` have not been tested. The usage of [NVM](https://github.com/nvm-sh/nvm) is recommended to install and manage your Node.js environments.

[pnpm](https://pnpm.io/) is used as the package manager for this project, as well as for managing this mono-repository workspaces. Please refer to its [installation](https://pnpm.io/installation) instructions.

To install all the necessary packages and tooling dependencies, run:

```bash
pnpm install
```

## Running the Apps Locally

### Start MongoDB via Docker Compose

Run locally a Mongo Database:

```bash
docker compose up fcrs-db
```

### Initiate an Events Scraping session

The blocks of the specified target blockchain are scanned and the found `FeeCollector.FeeCollected` events are imported into MongoDB.

```bash
cd ./events-scraper && pnpm start
```

The default target blockchain is then 'Polygon mainnet' (key: `pol`), and the target LiFi FeeCollector contract is [`0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9`](https://polygonscan.com/address/0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9#events)

*Alternatively* you can use the local Serverless offline runtime framework, run:

```bash
cd ./events-scraper && pnpm serverless offline
```

Then you can trigger the scraping function using a GET request [`http://localhost:3003/dev/collectedfees/scrap/{chainKey}`](http://localhost:3003/dev/collectedfees/scrap/pol)

### Start the Fee Reporter API

For locally running the backend, run:

```bash
cd ./fees-reporter && pnpm start
```

Then you can request for a report on fees collected by a given integrator, e.g. [`http://localhost:3000/api/v1/collectedfees/integrators/0xD5e230cEa6dA2F0C62bdeED2Cf85326F1063e27D`](http://localhost:3000/api/v1/collectedfees/integrators/0xD5e230cEa6dA2F0C62bdeED2Cf85326F1063e27D)

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## License

This project is licensed under the [GNU AGPL-v3](LICENSE).
