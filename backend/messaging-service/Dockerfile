FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
EXPOSE 8001
CMD ["npm", "start"]