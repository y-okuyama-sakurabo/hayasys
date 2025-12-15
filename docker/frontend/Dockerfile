# ===============================
# Frontend Dockerfile（最適化版）
# ===============================

FROM node:20-bullseye

# 作業ディレクトリを設定
WORKDIR /usr/src/app

# 依存関係だけ先にコピーしてキャッシュを効かせる
COPY ./frontend/package*.json ./

# Emotion 関連を追加でインストール（MUI依存のため）
RUN npm install @emotion/react @emotion/styled

# 通常の依存もインストール
RUN npm install

# 残りのアプリケーションコードをコピー
COPY ./frontend .

# ポートを公開
EXPOSE 3000

# Next.js を 0.0.0.0 で起動
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
