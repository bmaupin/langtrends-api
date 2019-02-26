FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Upgrade npm so we can use npm ci
RUN npm install -g npm

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# npm ci will install packages exactly as specified in package-lock.json
# --only-production will install dependencies but not devDependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]
