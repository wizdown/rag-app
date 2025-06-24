# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and install dependencies
# npm install will also install devDependencies like esbuild, typescript, and serve
COPY package.json ./
RUN npm install

# Copy the rest of the application source code
# This includes .tsx, .ts files, and other components/assets
COPY . .

# Build the application
# The 'npm run build' script uses esbuild to create bundle.js and bundle.js.map
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine AS runner
WORKDIR /app

# Copy package.json (useful for context, and npm start might rely on it)
COPY package.json ./

# Copy node_modules from the builder stage.
# This is crucial because 'serve' (used in 'npm start') is in devDependencies,
# and we need it in the runtime environment.
COPY --from=builder /app/node_modules ./node_modules

# Copy the built application (bundle.js and its sourcemap) from the builder stage
COPY --from=builder /app/bundle.js ./bundle.js
COPY --from=builder /app/bundle.js.map ./bundle.js.map

# Copy static assets like index.html and metadata.json
COPY index.html ./index.html
COPY metadata.json ./metadata.json
# If you had a public/ or static/assets folder, you would copy it here too, e.g.:
# COPY public ./public

# Expose the port the app runs on (as defined in package.json's start script)
EXPOSE 300

# The command to start the application using 'serve'
CMD ["npm", "start"]