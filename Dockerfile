# syntax=docker/dockerfile:1

# -------- Base: build the app --------
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS build
WORKDIR /usr/src/app

# Install dependencies (clean, reproducible)
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build


# -------- Production deps only --------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
# Install only production deps for a smaller runtime image
RUN npm ci --omit=dev


# -------- Runner (minimal) --------
FROM node:${NODE_VERSION} AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3000

# Use the non-root user provided by the Node image
USER node

# Copy runtime artifacts with correct ownership
COPY --chown=node:node --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/package*.json ./

# Container port (Nest listens on 0.0.0.0)
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]


