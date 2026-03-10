import os
import re
import time
import base64
import json
import requests as http_requests
from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect, url_for
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.json.ensure_ascii = False
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024
app.secret_key = os.getenv("SECRET_KEY", "shift-secret-2026")
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.getenv("RAILWAY_ENVIRONMENT") is not None
SHIFT_PIN = os.getenv("SHIFT_PIN", "1234")

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CATEGORIES = {
    "생필품": ["화장지/위생용품", "세제/세정제", "주방용품", "청소용품", "욕실용품"],
    "간편식품": ["라면/면류", "통조림/레토르트", "즉석식품", "간식/과자", "음료"],
    "신선식품": ["과일", "채소", "육류/계란", "수산물", "유제품"],
    "건강/뷰티": ["건강식품/영양제", "화장품", "헤어케어", "남성화장품"],
    "의류/패션": ["상의", "하의", "아우터", "속옷/잠옷", "악세서리"],
    "디지털/가전": ["스마트폰/태블릿", "노트북/PC", "가전제품", "카메라"],
    "스포츠/레저": ["운동기구", "스포츠의류", "아웃도어", "레저용품"],
    "홈/리빙": ["가구", "인테리어", "생활소품", "욕실/화장실"],
}


def generate_content(product_name, category, subcategory):
    prompt = f"""당신은 한국 이커머스 상세페이지 전문 카피라이터입니다.
상품명: {product_name}
카테고리: {category} > {subcategory}

스마트스토어/쿠팡에 바로 사용할 수 있는 전문적인 상세페이지 내용을 작성해주세요.

다음 JSON 형식으로만 응답하세요 (```없이, 순수 JSON만):
{{
  "headline": "메인 헤드라인 (20자 이내, 강렬하게)",
  "subheadline": "서브 헤드라인 (40자 이내)",
  "features": [
    {{"title": "특징1 제목", "desc": "특징1 설명 (30자 이내)"}},
    {{"title": "특징2 제목", "desc": "특징2 설명 (30자 이내)"}},
    {{"title": "특징3 제목", "desc": "특징3 설명 (30자 이내)"}},
    {{"title": "특징4 제목", "desc": "특징4 설명 (30자 이내)"}}
  ],
  "description": "상세 설명 (250자 내외)",
  "specs": [
    {{"label": "항목1", "value": "내용1"}},
    {{"label": "항목2", "value": "내용2"}},
    {{"label": "항목3", "value": "내용3"}},
    {{"label": "항목4", "value": "내용4"}}
  ],
  "reviews": [
    {{"name": "구매자닉네임1", "rating": 5, "text": "리뷰 내용 (40자 이내)"}},
    {{"name": "구매자닉네임2", "rating": 5, "text": "리뷰 내용 (40자 이내)"}},
    {{"name": "구매자닉네임3", "rating": 4, "text": "리뷰 내용 (40자 이내)"}}
  ],
  "cta": "구매 유도 문구 (15자 이내)",
  "hashtags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "smartstore_title": "스마트스토어 상품명 (100자 이내, SEO 최적화)",
  "coupang_title": "쿠팡 상품명 (100자 이내, SEO 최적화)",
  "color": "#4f46e5"
}}"""

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def generate_product_image(product_name, category, context=""):
    if context:
        prompt = f"{context}. Studio lighting, clean background, commercial product photography, high detail, photorealistic. No text overlays, no watermarks."
    else:
        prompt = f"Professional product photo of {product_name}. Clean white background, studio lighting, sharp details, commercial quality, photorealistic. No text overlays, no watermarks."

    # Pollinations.ai (무료, API키 불필요)
    encoded = http_requests.utils.quote(prompt)
    for model in ["flux-realism", "flux", "turbo"]:
        try:
            url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&model={model}&seed={int(time.time())}"
            resp = http_requests.get(url, timeout=90)
            if resp.status_code == 200 and len(resp.content) > 1000:
                return resp.content
        except Exception:
            continue
    raise Exception("이미지 생성 실패")


_kw_cache = {"time": 0, "keywords": []}
KW_TTL = 3600  # 1시간 캐시


@app.route("/api/trending-keywords")
def trending_keywords():
    global _kw_cache
    now = time.time()
    if now - _kw_cache["time"] < KW_TTL and _kw_cache["keywords"]:
        return jsonify({"keywords": _kw_cache["keywords"], "cached": True})
    try:
        month = time.strftime("%m월")
        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": (
                f"현재 {month} 한국 온라인쇼핑(쿠팡·스마트스토어) 식품 실시간 인기 검색 키워드 20개를 "
                "JSON 배열로만 반환하세요. 예: [\"제주 한라봉\",\"국내산 참기름\",...]. 설명·마크다운 없이 JSON만."
            )}]
        )
        text = resp.content[0].text.strip()
        m = re.search(r'\[.*?\]', text, re.DOTALL)
        keywords = json.loads(m.group(0)) if m else []
        _kw_cache = {"time": now, "keywords": keywords[:20]}
        return jsonify({"keywords": _kw_cache["keywords"], "cached": False})
    except Exception as e:
        return jsonify({"keywords": [], "error": str(e)})


@app.route("/api/generate-image", methods=["POST"])
def api_generate_image():
    data = request.json
    product_name = data.get("product_name", "")
    category = data.get("category", "")
    context = data.get("context", "")
    try:
        img_bytes = generate_product_image(product_name, category, context)
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")
        return jsonify({"image": img_b64, "mime": "image/png"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/claude", methods=["POST"])
def claude_proxy():
    body = request.json
    headers = {
        "Content-Type": "application/json",
        "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
        "anthropic-version": "2023-06-01",
    }
    # web search tool requires beta header
    tools = body.get("tools") or []
    if any("web_search" in t.get("type", "") for t in tools):
        headers["anthropic-beta"] = "web-search-2025-03-05"
    resp = http_requests.post(
        "https://api.anthropic.com/v1/messages",
        json=body,
        headers=headers,
        timeout=60,
    )
    return jsonify(resp.json()), resp.status_code


# ── PIN 인증 ──
PIN_PAGE = """<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shift AI — 인증</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{min-height:100vh;background:linear-gradient(135deg,#1e1b4b,#312e81);display:flex;align-items:center;justify-content:center;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;}
.card{background:#fff;border-radius:24px;padding:48px 40px;width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);}
.logo{width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:20px;}
h2{font-size:22px;font-weight:900;color:#111;margin-bottom:6px;}
p{font-size:13px;color:#999;margin-bottom:28px;}
.dots{display:flex;gap:12px;justify-content:center;margin-bottom:28px;}
.dot{width:14px;height:14px;border-radius:50%;background:#e8e8e8;transition:background .15s;}
.dot.filled{background:#6366f1;}
.dot.error{background:#ef4444;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
button{padding:18px;border:none;border-radius:12px;background:#f5f5f5;font-size:20px;font-weight:700;color:#111;cursor:pointer;transition:background .1s;}
button:active{background:#e0e0e0;}
button.del{font-size:14px;color:#666;}
.err{font-size:13px;color:#ef4444;margin-top:12px;min-height:18px;}
</style></head><body>
<div class="card">
  <div class="logo">⚡</div>
  <h2>Shift AI</h2>
  <p>4자리 PIN을 입력하세요</p>
  <div class="dots" id="dots">
    <div class="dot" id="d0"></div><div class="dot" id="d1"></div>
    <div class="dot" id="d2"></div><div class="dot" id="d3"></div>
  </div>
  <div class="grid">
    <button onclick="press('1')">1</button><button onclick="press('2')">2</button><button onclick="press('3')">3</button>
    <button onclick="press('4')">4</button><button onclick="press('5')">5</button><button onclick="press('6')">6</button>
    <button onclick="press('7')">7</button><button onclick="press('8')">8</button><button onclick="press('9')">9</button>
    <button></button><button onclick="press('0')">0</button><button class="del" onclick="del()">⌫</button>
  </div>
  <div class="err" id="err"></div>
</div>
<script>
let pin='';
function press(d){
  if(pin.length>=4)return;
  pin+=d;
  for(let i=0;i<4;i++)document.getElementById('d'+i).className='dot'+(i<pin.length?' filled':'');
  if(pin.length===4)submit();
}
function del(){pin=pin.slice(0,-1);for(let i=0;i<4;i++)document.getElementById('d'+i).className='dot'+(i<pin.length?' filled':'');}
function submit(){
  fetch('/shift-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})})
  .then(r=>r.json()).then(d=>{
    if(d.ok){location.href='/shift-app';}
    else{
      for(let i=0;i<4;i++)document.getElementById('d'+i).className='dot error';
      document.getElementById('err').textContent='PIN이 올바르지 않습니다';
      setTimeout(()=>{pin='';for(let i=0;i<4;i++)document.getElementById('d'+i).className='dot';document.getElementById('err').textContent='';},800);
    }
  });
}
</script></body></html>"""

@app.route("/shift-auth", methods=["POST"])
def shift_auth():
    data = request.json or {}
    if data.get("pin") == SHIFT_PIN:
        return jsonify({"ok": True})
    return jsonify({"ok": False})

# PIN 페이지 (항상 PIN 요구)
@app.route("/shift")
def serve_pin():
    return PIN_PAGE, 200, {"Content-Type": "text/html"}

# React 앱 (PIN 인증 후 리다이렉트되는 경로)
@app.route("/shift-app")
@app.route("/shift-app/<path:path>")
def serve_react(path=""):
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if path and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, "index.html")

# assets 파일 서빙
@app.route("/shift/assets/<path:path>")
def serve_assets(path):
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    return send_from_directory(os.path.join(static_dir, "assets"), path)


@app.route("/")
def index():
    return render_template("index.html", categories=CATEGORIES)


@app.route("/generate", methods=["POST"])
def generate():
    product_name = request.form.get("product_name", "").strip()
    category = request.form.get("category", "생필품")
    subcategory = request.form.get("subcategory", "")

    if not product_name:
        return jsonify({"error": "상품명을 입력해주세요."}), 400

    # 사진 처리
    photo_b64 = None
    photo_mime = "image/jpeg"
    if "photo" in request.files:
        photo = request.files["photo"]
        if photo.filename:
            photo_bytes = photo.read()
            photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")
            ext = photo.filename.rsplit(".", 1)[-1].lower()
            photo_mime = f"image/{'jpeg' if ext == 'jpg' else ext}"

    # 콘텐츠 생성
    try:
        content = generate_content(product_name, category, subcategory)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"콘텐츠 생성 실패: {repr(e)}"}), 500

    # 사진 없으면 AI 이미지 생성
    if not photo_b64:
        try:
            img_bytes = generate_product_image(product_name, category)
            photo_b64 = base64.b64encode(img_bytes).decode("utf-8")
            photo_mime = "image/png"
        except Exception as e:
            photo_b64 = None

    return jsonify({
        "content": content,
        "image": photo_b64,
        "image_mime": photo_mime,
        "product_name": product_name,
        "category": category,
        "subcategory": subcategory,
    })


if __name__ == "__main__":
    app.run(debug=True, port=8080)
