# Étape 1 : compilation de l'application Angular
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build

# Étape 2 : fichiers statiques servis par nginx, qui relaie aussi /api vers FastAPI
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/handidiag/browser /usr/share/nginx/html
EXPOSE 80
