#!/bin/bash
# DBバックアップ → Backblaze B2 アップロードスクリプト
#
# 必要な環境変数（/etc/backup.env に記載）:
#   B2_KEY_ID          : Backblaze B2 キーID
#   B2_APPLICATION_KEY : Backblaze B2 アプリケーションキー
#   B2_BUCKET          : バケット名（例: hayasys-db-backups）
#
# 使い方:
#   bash /opt/hayasys/scripts/backup_db.sh
#
set -euo pipefail

# ── 設定読み込み ────────────────────────────────────
ENV_FILE="/etc/backup.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${B2_KEY_ID:?B2_KEY_ID が設定されていません}"
: "${B2_APPLICATION_KEY:?B2_APPLICATION_KEY が設定されていません}"
: "${B2_BUCKET:?B2_BUCKET が設定されていません}"

# ── Docker Compose のプロジェクトディレクトリ ──────
COMPOSE_DIR="${COMPOSE_DIR:-/opt/hayasys}"

# ── PostgreSQL 接続情報 ────────────────────────────
POSTGRES_USER="${POSTGRES_USER:-app}"
POSTGRES_DB="${POSTGRES_DB:-app}"

# ── ファイル名 ──────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="hayasys_${TIMESTAMP}.sql.gz"
TMPFILE="/tmp/${FILENAME}"

echo "[$(date)] バックアップ開始: ${FILENAME}"

# ── 1. pg_dump ──────────────────────────────────────
docker compose -f "${COMPOSE_DIR}/docker-compose.yml" exec -T db \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${TMPFILE}"

echo "[$(date)] pg_dump 完了 ($(du -h "$TMPFILE" | cut -f1))"

# ── 2. B2 認証 & アップロード ───────────────────────
b2 authorize-account "${B2_KEY_ID}" "${B2_APPLICATION_KEY}" > /dev/null
b2 upload-file "${B2_BUCKET}" "${TMPFILE}" "db/${FILENAME}"

echo "[$(date)] B2 アップロード完了: db/${FILENAME}"

# ── 3. ローカル一時ファイル削除 ─────────────────────
rm -f "${TMPFILE}"

# ── 4. 古いバックアップを削除（30日以上前） ─────────
# B2 のライフサイクルルールで管理する場合はこのブロック不要
RETENTION_DAYS=30
CUTOFF=$(date -d "${RETENTION_DAYS} days ago" +"%Y%m%d" 2>/dev/null || \
         date -v"-${RETENTION_DAYS}d" +"%Y%m%d")  # macOS fallback

b2 ls --long "${B2_BUCKET}" db/ 2>/dev/null | while read -r _ _ _ _ remote_path; do
  fname=$(basename "$remote_path")
  fdate=$(echo "$fname" | grep -oP '\d{8}' | head -1 || true)
  if [ -n "$fdate" ] && [ "$fdate" -lt "$CUTOFF" ]; then
    b2 delete-file-version "${B2_BUCKET}" "${remote_path}" || true
    echo "[$(date)] 古いバックアップ削除: ${remote_path}"
  fi
done

echo "[$(date)] バックアップ完了"
