# syntax=docker/dockerfile:1.7

# Define the version once at the top
ARG NODE_VERSION=22-alpine3.24

# Intermediate image - base for building and installing dependencies
FROM node:${NODE_VERSION} AS install

# Install required tools
RUN apk add --no-cache --virtual .gyp python3 py3-setuptools make g++ \
  && ln -sf python3 /usr/bin/python

WORKDIR /usr/src/app

# Install dependencies first, to cache the image.
COPY ["package.json", "package-lock.json", "./"]

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline


# Create image for application building
FROM install AS builder

# Copy only the files required by the production build.
COPY ["tsconfig.json", "tsconfig.vue-tsc.json", "rspack.config.mjs", "./"]
COPY ["src/tsconfig.json", "./src/tsconfig.json"]
COPY ["src", "./src"]
COPY ["assets", "./assets"]

# Run building
ARG SOURCE_VERSION=unknown
ENV SOURCE_VERSION=$SOURCE_VERSION
RUN npm run build


# Create image to prepare prod dependencies to be copied from
FROM install AS installprod

RUN npm prune --omit=dev \
  && find node_modules -type d -empty -delete


# Target image
FROM node:${NODE_VERSION}

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Add user tfm
RUN adduser -S -D -h /usr/src/app tfm \
  && mkdir /usr/src/app/db \
  && chown -R tfm:nogroup .

USER tfm

# Copy required files.

COPY ["package.json", "package-lock.json", "./"]

# Copy dependencies from intermediate image
COPY --from=installprod /usr/src/app/node_modules ./node_modules

# Copy built app from intermediate image
COPY --from=builder --chown=tfm:nogroup /usr/src/app/build ./build

COPY --from=builder --chown=tfm:nogroup /usr/src/app/assets ./assets

# Run command.

EXPOSE 8080

CMD ["npm", "run", "start"]
