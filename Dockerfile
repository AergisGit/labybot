# Étape 1 : Build du bot et du client React
FROM node:23-slim AS builder

# Bot : Définir le dossier de travail pour la compilation
WORKDIR /tmp/source

# Bot : Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package*.json ./
RUN npm install

# Gui : Définir le dossier de travail pour la compilation du client React
WORKDIR /tmp/source/client
COPY client/package*.json ./
RUN npm install

# Copier tout le code source dans le répertoire temporaire
WORKDIR /tmp/source
COPY . .

# Bot : Compiler le TypeScript
RUN npm run build

# Gui : Compiler le client React
WORKDIR /tmp/source/client
RUN npm run build

# Étape 2 : Image finale pour le runtime
FROM node:23-alpine

# Définir le répertoire de travail principal
WORKDIR /bot

# Copier uniquement les fichiers nécessaires depuis l'étape de build
COPY --from=builder /tmp/source/out /bot/
#COPY --from=builder /tmp/source/resources /bot/resources
COPY --from=builder /tmp/source/shared /bot/shared
COPY --from=builder /tmp/source/client/build /bot/public/
COPY --from=builder /tmp/source/package*.json /bot/

# Installer uniquement les dépendances de production
#RUN npm install --only=production

# Exposer le port du serveur
EXPOSE 3000

# Commande pour exécuter le bot
CMD ["node", "--enable-source-maps", "/bot/bundle.js"]