FROM python:3.11-slim

# 依存インストール
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# requirements はルートの docker/backend/ 配下からコピー
COPY docker/backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 開発中は volume マウントするので COPY は必須ではないが、
# 初回ビルド時に manage.py が無くて困る場合はコメント外してOK
# COPY backend /app
