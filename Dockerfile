# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Environment arguments for production build
ARG VITE_SUPABASE_PROJECT_ID=bkdfseyhusoxiruhuhbs
ARG VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGZzZXlodXNveGlydWh1aGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTY0MzYsImV4cCI6MjA5NDk3MjQzNn0.hBUfzBDT_MA-eZXZkwQfxoOV4mBN2_jmhHJyA6kvpbo
ARG VITE_SUPABASE_URL=https://bkdfseyhusoxiruhuhbs.supabase.co
ARG VITE_ASTRO_PROVIDER=custom

ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_ASTRO_PROVIDER=$VITE_ASTRO_PROVIDER

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
