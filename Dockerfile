FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
RUN mkdir -p /app/var && chown -R node:node /app/var
USER node
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
# Compte admin : docker run -e ADMIN_USER=admin -e ADMIN_PASSWORD=... -v handidiag-data:/app/var -p 3000:3000 handidiag
# (sans ADMIN_PASSWORD, NODE_ENV=production genere un mot de passe aleatoire affiche une seule fois dans les journaux)
CMD ["node", "server.js"]
