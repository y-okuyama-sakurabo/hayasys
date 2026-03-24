from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


def compress_image(image, quality=70, max_width=1200):
    img = Image.open(image)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    if img.width > max_width:
        ratio = max_width / img.width
        height = int(img.height * ratio)
        img = img.resize((max_width, height), Image.LANCZOS)

    buffer = BytesIO()

    ext = image.name.lower().split(".")[-1]

    if ext in ["jpg", "jpeg"]:
        img.save(buffer, format="JPEG", quality=quality)
    elif ext == "png":
        img.save(buffer, format="PNG", optimize=True)
    else:
        img.save(buffer, format="JPEG", quality=quality)

    return ContentFile(buffer.getvalue(), name=image.name)