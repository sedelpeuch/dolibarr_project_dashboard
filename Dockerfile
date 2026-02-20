# Stage 1: Build API (Python/FastAPI)
FROM python:3.11-slim as api-builder

WORKDIR /app/api

# Install uv
RUN pip install --no-cache-dir uv

# Copy API files
COPY api/pyproject.toml api/uv.lock ./

# Build and install dependencies
RUN uv sync --no-cache

COPY api/src ./src

# Stage 2: Build Web (Node/React)
FROM node:18-alpine as web-builder

WORKDIR /app

# Copy web files
COPY web ./web

# Install dependencies and build
RUN cd web && yarn install --frozen-lockfile && yarn build --config vite.config.ts .

# Stage 3: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install Node and uv for web serving
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv fastapi uvicorn

# Copy Python environment from builder
COPY --from=api-builder /app/api ./api

# Copy built web from builder
COPY --from=web-builder /app/web/dist ./web/dist

# Copy environment and root config
COPY .env.example ./
COPY web ./web

# Install serve to serve static files
RUN npm install -g serve

# Expose ports
EXPOSE 41587 5173

# Start both services
CMD sh -c "cd api && uv run uvicorn src.main:app --host 0.0.0.0 --port 41587 & serve -s web/dist -l 5173"
