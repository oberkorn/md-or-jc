import cv2
import os
import shutil
from pathlib import Path
from PIL import Image
import pillow_avif  # noqa
import numpy as np

ROOT = Path('/home/phebert/mdjc')
SRC = ROOT/'images'
BACKUP = ROOT/'images_original'
YUNET = ROOT/'yunet.onnx'
TARGET_RATIO = 1.0
FACE_FRAC = 0.40

if not BACKUP.exists():
    shutil.copytree(SRC, BACKUP)

cdir = Path(cv2.data.haarcascades)
HAAR = [
    ('haar-front', cv2.CascadeClassifier(str(cdir/'haarcascade_frontalface_default.xml'))),
    ('haar-alt2',  cv2.CascadeClassifier(str(cdir/'haarcascade_frontalface_alt2.xml'))),
    ('haar-prof',  cv2.CascadeClassifier(str(cdir/'haarcascade_profileface.xml'))),
]

def detect_yunet(img_bgr):
    h, w = img_bgr.shape[:2]
    det = cv2.FaceDetectorYN.create(str(YUNET), "", (w, h), 0.6, 0.3, 5000)
    _, faces = det.detect(img_bgr)
    if faces is None or len(faces) == 0:
        return None
    # pick highest confidence
    best = max(faces, key=lambda f: f[-1])
    x, y, fw, fh = best[:4]
    return (int(round(x)), int(round(y)), int(round(fw)), int(round(fh)))

def detect_haar(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    h, w = gray.shape
    min_side = max(20, min(h, w)//12)
    for name, c in HAAR:
        faces = c.detectMultiScale(gray, 1.1, 4, minSize=(min_side, min_side))
        if len(faces):
            return name, tuple(max(faces, key=lambda f: f[2]*f[3]))
    return None, None

def detect(img_bgr):
    face = detect_yunet(img_bgr)
    if face is not None:
        return 'yunet', face
    name, face = detect_haar(img_bgr)
    if face is not None:
        return name, face
    # upscale + retry yunet (helps tiny faces)
    h, w = img_bgr.shape[:2]
    scale = max(1.0, 400 / min(h, w))
    if scale > 1.0:
        big = cv2.resize(img_bgr, (int(w*scale), int(h*scale)))
        face = detect_yunet(big)
        if face is not None:
            fx, fy, fw, fh = face
            return 'yunet-up', (int(fx/scale), int(fy/scale), int(fw/scale), int(fh/scale))
    return None, None

def crop_face(img, face):
    h, w = img.shape[:2]
    min_dim = min(h, w)
    floor = min_dim * 0.90
    if face is None:
        cx, cy = w/2, h*0.40
        target_h = min_dim
    else:
        fx, fy, fw, fh = face
        cx = fx + fw/2
        cy = fy + fh/2
        target_h = max(fh / FACE_FRAC, floor)

    target_w = target_h * TARGET_RATIO
    target_h = min(target_h, h)
    target_w = min(target_w, w)
    if target_w / target_h > TARGET_RATIO:
        target_w = target_h * TARGET_RATIO
    else:
        target_h = target_w / TARGET_RATIO

    cy_shift = cy - target_h * 0.05
    x1 = cx - target_w/2
    y1 = cy_shift - target_h/2
    x1 = max(0, min(x1, w - target_w))
    y1 = max(0, min(y1, h - target_h))

    x1, y1 = int(round(x1)), int(round(y1))
    x2, y2 = int(round(x1+target_w)), int(round(y1+target_h))
    return img[y1:y2, x1:x2]

results = []
for f in sorted(os.listdir(BACKUP)):
    p = BACKUP/f
    pil = Image.open(p).convert('RGB')
    arr = np.array(pil)[:, :, ::-1]
    name, face = detect(arr)
    cropped = crop_face(arr, face)
    out = Image.fromarray(cropped[:, :, ::-1])
    dst = SRC/(Path(f).stem + '.jpg')
    out.save(dst, format='JPEG', quality=88)
    tag = name or 'NONE'
    face_str = f'({face[0]},{face[1]},{face[2]}x{face[3]})' if face is not None else '—'
    results.append((f, tag, face_str, cropped.shape[1], cropped.shape[0]))

for r in results:
    print(f'{r[0]:40s} {r[1]:10s} {r[2]:22s} -> {r[3]}x{r[4]}')
