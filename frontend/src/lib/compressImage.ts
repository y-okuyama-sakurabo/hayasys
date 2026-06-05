/**
 * 画像ファイルを自動圧縮するユーティリティ
 *
 * - 長辺が MAX_SIDE_PX を超えていればリサイズ
 * - JPEG/WEBP として QUALITY で再エンコード
 * - PNG は透過が必要な場合があるため PNG のまま（ただしリサイズは行う）
 * - 圧縮後のサイズが元より大きい場合は元ファイルをそのまま返す
 */

const MAX_SIDE_PX = 1920;   // 長辺の上限（px）
const JPEG_QUALITY = 0.85;  // JPEG/WEBP の品質（0〜1）

export async function compressImage(file: File): Promise<File> {
  // 画像ファイル以外はそのまま返す
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { naturalWidth: w, naturalHeight: h } = img;
      const maxSide = Math.max(w, h);

      // リサイズ不要 かつ PNG の場合はそのまま（PNG 圧縮は不要）
      if (maxSide <= MAX_SIDE_PX && file.type === "image/png") {
        resolve(file);
        return;
      }

      // 縮小率を計算（長辺が上限以内なら 1.0）
      const ratio = maxSide > MAX_SIDE_PX ? MAX_SIDE_PX / maxSide : 1.0;
      const newW = Math.round(w * ratio);
      const newH = Math.round(h * ratio);

      const canvas = document.createElement("canvas");
      canvas.width  = newW;
      canvas.height = newH;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, newW, newH);

      // 出力 MIME: PNG → PNG、それ以外 → JPEG
      const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const quality    = outputMime === "image/png" ? undefined : JPEG_QUALITY;

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }

          // 圧縮後が元より大きければ元を使う
          if (blob.size >= file.size) { resolve(file); return; }

          // 元のファイル名の拡張子を統一（jpg → jpg, それ以外 → jpg）
          const ext      = outputMime === "image/png" ? "png" : "jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const newName  = `${baseName}.${ext}`;

          resolve(new File([blob], newName, { type: outputMime }));
        },
        outputMime,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // 読み込めなければ元ファイルをそのまま
    };

    img.src = url;
  });
}
