FROM node:20-alpine
WORKDIR /usr/src/app
COPY ./frontend/package.json ./frontend/package-lock.json* ./
RUN npm ci || npm i
COPY ./frontend .
CMD ["sh","-lc","npm run dev -- --host"]
