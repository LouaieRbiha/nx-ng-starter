##
# Monorepo documentation app image based on NodeJS.
##

##
# Stage 1.
##

# Define image.
FROM node:16.13.1-slim as builder
# Set environment variables.
ENV DEBIAN_FRONTEND=noninteractive
# Create app directory.
WORKDIR /app
# Copy dist.
COPY /package.json .
COPY /dist/apps/documentation ./dist/apps/documentation
COPY /server.prod.js .
# Install dependencies for minimal nodejs server.
RUN npm i express compression; \
  npm cache clean --force

##
# Stage 2.
##

# Define image.
FROM node:16.13.1-alpine
# Create app directory.
WORKDIR /app
# Copy dist.
COPY --from=builder /app .
# Configure exposed port.
EXPOSE 8080
# Define startup command.
CMD [ "node", "server.prod.js", "documentation" ]
