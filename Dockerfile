FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx
COPY server ./server
COPY --from=build /app/dist ./dist
RUN sed -i "s|app.listen(PORT|app.use(express.static(require('path').join(__dirname,'../dist')));\napp.get('*',(_,r)=>r.sendFile(require('path').join(__dirname,'../dist/index.html')));\napp.listen(PORT|" server/index.ts
EXPOSE 3001
CMD ["tsx", "server/index.ts"]
