# Utilise l'image officielle Node.js
FROM node:20

# Définir le dossier de travail pour la compilation
WORKDIR /tmp/source

# Copier uniquement package.json et package-lock.json pour optimiser le cache
COPY package*.json ./

# Installer les dépendances dans le répertoire temporaire
RUN npm install

# Copier tout le code source dans le répertoire temporaire
COPY . .

# Compiler le TypeScript dans le répertoire temporaire
RUN npm run build

# Déplacer seulement le répertoire de sortie (out) vers la racine du projet (/bot)
RUN cp -r /tmp/source/out /bot/ && cp -r /tmp/source/resources /bot/ && rm -rf /tmp/source

# Définir le répertoire de travail principal
WORKDIR /bot

# Exécuter le bot
CMD ["node", "--enable-source-maps", "/bot/bundle.js"]