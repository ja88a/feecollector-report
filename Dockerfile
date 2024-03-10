FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


FROM base AS src-deps
WORKDIR /usr/src/app
COPY package*.json .
COPY pnpm-*.yaml .

RUN mkdir -p ./externals/lifi-contract-types
COPY externals/lifi-contract-types/package*.json ./externals/lifi-contract-types
COPY externals/lifi-contract-types/yarn.lock ./externals/lifi-contract-types

RUN mkdir -p ./common
COPY common/package*.json ./common
COPY common/pnpm-*.yaml ./common

RUN mkdir -p ./fees-reporter
COPY fees-reporter/package*.json ./fees-reporter
COPY fees-reporter/pnpm-*.yaml ./fees-reporter


FROM src-deps AS build-deps
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM src-deps AS build-deps-prod
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod


FROM build-deps AS build-assets
# Set NODE_ENV environment variable
ENV NODE_ENV production

WORKDIR /usr/src/app

# Prepare for the TS Compilation of src dirs
COPY tsconfig*.json .

COPY externals/lifi-contract-types/tsconfig*.json ./externals/lifi-contract-types
COPY externals/lifi-contract-types/src ./externals/lifi-contract-types/src

COPY common/tsconfig*.json ./common
COPY common/src ./common/src

COPY fees-reporter/tsconfig*.json ./fees-reporter
COPY fees-reporter/src ./fees-reporter/src

# Build all available workspaces
RUN pnpm run -r build


FROM build-assets AS fees-reporter
WORKDIR /usr/src/app
RUN rm -rf **/src
RUN rm -rf **/tsconfig*

WORKDIR /usr/src/app/fees-reporter
EXPOSE 3000
CMD [ "node", "dist/main" ]


FROM build-deps-prod AS fees-reporter-prod
# Set NODE_ENV environment variable
ENV NODE_ENV production

WORKDIR /usr/src/app
COPY --from=build-assets /usr/scr/app/externals/lifi-contract-types/dist ./externals/lifi-contract-types/dist
COPY --from=build-assets /usr/scr/app/common/dist ./common/dist
COPY --from=build-assets /usr/scr/app/fees-reporter/dist ./fees-reporter/dist

RUN rm -rf **/tsconfig*

WORKDIR /usr/src/app/fees-reporter
EXPOSE 3000
CMD [ "node", "dist/main" ]
