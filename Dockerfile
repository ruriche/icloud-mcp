FROM node:20-slim

Install Python and build tools for uv and node-gyp
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

Install uv to run the mcp-proxy wrapper
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

Copy dependency files and install
COPY package*.json ./
RUN npm install

Copy the rest of the application
COPY . 

Force cloud mode (Linux environment)
ENV USE_LOCAL_MODE=false
ENV PORT=8080

EXPOSE 8080

Run through the mcp-proxy to convert stdio to SSE on port 8080
CMD ["uvx", "mcp-proxy", "node", "index.js"]
