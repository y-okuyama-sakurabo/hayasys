FROM node:20-bullseye

WORKDIR /usr/src/app

# 依存関係だけ先にコピーしてキャッシュを効かせる
COPY ./frontend/package*.json ./

# package.json に書かれた依存をまとめて入れる（ここだけでOK）
RUN npm ci

# 残りのアプリケーションコードをコピー
COPY ./frontend .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
