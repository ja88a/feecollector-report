# LiFi FeeCollector Off-chain Reporter

## Description

This is a mono-repository for developing and running 2 main backend services, on top of the LiFi protocol:

1. A serverless scraper of on-chain events: `FeeCollected` events emitted by the LiFi `FeeCollector` contracts deployed on several blockchains. A scraping session can be triggered manually or scheduled to run periodically on a given blockchain.

2. A backend REST/json API to report the fees collected by the integrators of the LiFi protocol

The `FeeCollected` events are stored in a [MongoDB](https://mongodb.com/) database/cluster, [Typegoose](https://typegoose.github.io/typegoose/) is used, on top of the [Mongoose](https://mongoosejs.com/) ODM.

The [Nest](https://github.com/nestjs/nest) development framework is used as one of the main foundation of these backend modules.

The [Serverless](https://serverless.com/) tooling is used for developing the events scraper to be locally ran and deployed, for instance as AWS Lambda functions.

## Installation

[Node.js](https://nodejs.org/) is required to be installed on your OS. Lower version numbers then `18.x` have not been tested. The usage of [NVM](https://github.com/nvm-sh/nvm) is recommended to install and manage your Node.js environments.

[`pnpm`](https://pnpm.io/) is used as the package manager for this project, as well as for managing this mono-repository workspaces. Please refer to its [installation](https://pnpm.io/installation) instructions.

To install all the necessary packages and tooling dependencies, run:

```bash
$ pnpm install
```

## Running the Apps Locally

### Start Docker Compose

Run locally a Mongo Database:

```bash
docker compose up fcrs-db
```

### Initiate an event scraping session

The target blockchain blocks will be scanned and the found FeeCollector.FeeCollected events reported to the MongoDB.

```bash
cd ./events-scraper && pnpm start
```

The default target blockchain is then Polygon mainnet, with the target LiFi FeeCollector contract [`0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9`](https://polygonscan.com/address/0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9#events)

Alternatively you can use the Serverless offline runtime framework, run:

```bash
cd ./events-scraper && pnpm serverless offline
```

Then you can trigger the function using a GET request [`http://localhost:3003/dev/chain/{chainId}`](http://localhost:3003/dev/chain/pol)

### Start the Fee Reporter backend API

For locally running the backend, run:

```bash
cd ./fees-reporter && pnpm start
```

Then you can request for a report on fees collected by a given integrator, e.g. [`http://localhost:3000/collectedfees/integrators/0xD5e230cEa6dA2F0C62bdeED2Cf85326F1063e27D`](http://localhost:3000/collectedfees/integrators/0xD5e230cEa6dA2F0C62bdeED2Cf85326F1063e27D)

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
