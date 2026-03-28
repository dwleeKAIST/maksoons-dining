# Maksoon's Dining

우리집 메뉴판 - 와인 & 식재료 관리 웹앱

## 주요 기능

- **와인 컬렉션 관리** - 와인 추가/수정/삭제, 수량 및 보관 위치 관리
- **AI 소믈리에 챗봇** - Claude AI 기반 와인 추천, 음용 시기 분석, 가격 추정
- **와인 라벨 OCR 스캔** - Google Cloud Vision + Claude로 라벨 사진에서 와인 정보 자동 추출
- **와인 다이어리** - 테이스팅 기록, 별점, 페어링 메모
- **와인 위키** - AI가 학습한 와인 지식 저장소
- **가구(Household) 시스템** - 가족/동거인과 데이터 공유
- **Telegram 알림** - 관리자 알림 및 개인 알림

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Node.js, Express |
| Frontend | React 18, Vite, Tailwind CSS |
| Database | PostgreSQL 16 |
| Auth | Firebase Authentication |
| AI | Anthropic Claude API (claude-haiku-4-5) |
| OCR | Google Cloud Vision API |
| 배포 | Google Cloud Run, Cloud Build |
| 컨테이너 | Docker |

---

## 초기 설정 가이드

### 1. 사전 준비

- [Node.js 20+](https://nodejs.org/) 설치
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (로컬 DB용)
- Google Cloud 계정
- GitHub 계정

### 2. Firebase 프로젝트 설정

Firebase는 사용자 인증(로그인/회원가입)을 담당합니다.

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 → 생성
3. **Authentication** 메뉴 → **시작하기** 클릭
4. **로그인 방법** 탭에서 원하는 제공업체 활성화:
   - **이메일/비밀번호** (기본 추천)
   - **Google** (선택)
5. **프로젝트 설정** (톱니바퀴 아이콘) → **일반** 탭:
   - 아래쪽 **내 앱** 섹션에서 **웹 앱 추가** (`</>` 아이콘) 클릭
   - 앱 이름 입력 → **앱 등록**
   - 표시되는 `firebaseConfig` 값들을 메모:
     ```
     apiKey: "AIza..."
     authDomain: "your-project.firebaseapp.com"
     projectId: "your-project"
     storageBucket: "your-project.appspot.com"
     messagingSenderId: "123456789"
     appId: "1:123456789:web:abc123"
     ```
6. **프로젝트 설정** → **서비스 계정** 탭:
   - **새 비공개 키 생성** 클릭 → JSON 파일 다운로드
   - 이 JSON의 내용을 `FIREBASE_SERVICE_ACCOUNT` 환경변수에 사용

### 3. Google Cloud Vision API 설정

Vision API는 와인 라벨 사진에서 텍스트를 읽어오는 OCR에 사용됩니다.

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. Firebase와 **같은 프로젝트** 선택 (Firebase 프로젝트는 자동으로 GCP 프로젝트와 연결됨)
3. **API 및 서비스** → **라이브러리** 메뉴
4. "Cloud Vision API" 검색 → **사용 설정** 클릭
5. **결제 계정 연결** 필요 (무료 등급: 월 1,000건 무료)
   - **결제** 메뉴 → 결제 계정 생성 또는 연결

> Vision API는 Firebase 서비스 계정의 인증 정보를 그대로 사용합니다. 별도 API 키가 필요 없습니다.

### 4. Anthropic Claude API 키 발급

Claude AI는 소믈리에 챗봇과 OCR 텍스트 파싱에 사용됩니다.

1. [Anthropic Console](https://console.anthropic.com/) 접속 → 회원가입
2. **API Keys** 메뉴 → **Create Key** 클릭
3. 생성된 키(`sk-ant-...`)를 메모
4. **Plans & Billing**에서 크레딧 충전 (사용량 기반 과금)

> 이 앱은 `claude-haiku-4-5` 모델을 사용합니다 (입력 $0.80/1M 토큰, 출력 $4.00/1M 토큰).

### 5. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어서 값 입력:

```env
PORT=8080
NODE_ENV=development

# PostgreSQL (docker-compose 기본값 그대로 사용)
DATABASE_URL=postgresql://maksoon:maksoon_dev_password@localhost:5432/maksoons_dining

# Anthropic Claude API (4단계에서 발급)
ANTHROPIC_API_KEY=sk-ant-여기에_키_입력

# Firebase 서비스 계정 (2-6단계의 JSON 파일 내용을 한 줄로)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}

# Firebase 클라이언트 설정 (2-5단계에서 메모한 값)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# CORS (로컬 개발용)
CORS_ORIGINS=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173

# Admin (본인 이메일)
ADMIN_EMAILS=your-email@gmail.com

# Telegram 알림 (선택사항 - 아래 '부록' 참조)
ADMIN_TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_CHAT_ID=
```

> `FIREBASE_SERVICE_ACCOUNT`는 다운로드한 JSON 파일의 내용을 **한 줄로** 붙여넣으세요.

### 6. 로컬 실행

```bash
# 1. PostgreSQL 실행 (Docker)
docker-compose up -d db

# 2. 서버 의존성 설치
npm install

# 3. 클라이언트 의존성 설치
cd client && npm install && cd ..

# 4. 개발 서버 실행 (서버 + 클라이언트 동시 시작)
npm run dev
```

- 클라이언트: http://localhost:5173
- 서버 API: http://localhost:8080

> DB 마이그레이션은 서버 시작 시 자동 실행됩니다.

### 7. 인증 없이 개발하기 (선택)

Firebase 설정 없이 빠르게 테스트하려면 `.env`에 추가:

```env
SKIP_AUTH=true
```

이렇게 하면 기본 관리자 계정으로 자동 로그인됩니다.

---

## Google Cloud Run 배포

### 사전 준비

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) 설치
2. `gcloud auth login` 으로 인증
3. `gcloud config set project YOUR_PROJECT_ID`

### Cloud SQL (PostgreSQL) 설정

프로덕션 환경에서 데이터를 저장할 Cloud SQL 인스턴스를 생성합니다.

#### 1. Cloud SQL API 활성화

```bash
gcloud services enable sqladmin.googleapis.com
```

#### 2. Cloud SQL 인스턴스 생성

```bash
# 개발/테스트용 (db-f1-micro, 저비용)
gcloud sql instances create maksoons-dining-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=asia-northeast3 \
  --storage-type=HDD \
  --storage-size=10GB

# 운영용 (더 높은 성능이 필요한 경우)
# gcloud sql instances create maksoons-dining-db \
#   --database-version=POSTGRES_16 \
#   --tier=db-custom-1-3840 \
#   --region=asia-northeast3 \
#   --storage-type=SSD \
#   --storage-size=10GB
```

> 리전은 Cloud Run과 동일한 `asia-northeast3` (서울)을 사용해야 지연시간이 최소화됩니다.

#### 3. 데이터베이스 및 사용자 생성

```bash
# 데이터베이스 생성
gcloud sql databases create maksoons_dining \
  --instance=maksoons-dining-db

# 사용자 생성 (비밀번호를 안전한 값으로 변경하세요)
gcloud sql users create maksoon \
  --instance=maksoons-dining-db \
  --password=YOUR_SECURE_PASSWORD
```

#### 4. Cloud Build 서비스 계정에 Cloud SQL 권한 부여

Cloud Run에서 Cloud SQL에 접속하려면 서비스 계정에 권한이 필요합니다.

```bash
# 프로젝트 번호 확인
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Cloud Build 서비스 계정에 Cloud SQL Client 역할 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Cloud Run 기본 서비스 계정에도 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

#### 5. DATABASE_URL 형식

Cloud Run에서는 Unix 소켓으로 Cloud SQL에 연결합니다. `DATABASE_URL` 형식:

```
postgresql://maksoon:YOUR_SECURE_PASSWORD@/maksoons_dining?host=/cloudsql/PROJECT_ID:asia-northeast3:maksoons-dining-db
```

`_CLOUD_SQL_INSTANCE` 형식:

```
PROJECT_ID:asia-northeast3:maksoons-dining-db
```

> `PROJECT_ID`는 본인의 GCP 프로젝트 ID로 대체하세요.

### Cloud Build로 배포

`cloudbuild.yaml`이 이미 설정되어 있습니다. 필요한 GCP 서비스:

- **Cloud Run** API 활성화
- **Cloud Build** API 활성화
- **Artifact Registry** API 활성화
- **Cloud SQL** (위 단계에서 생성 완료)

```bash
# 필요한 API 활성화
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Artifact Registry 저장소 생성 (최초 1회)
gcloud artifacts repositories create maksoons-dining \
  --repository-format=docker \
  --location=asia-northeast3

# Cloud Build로 빌드 & 배포
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=\
_ANTHROPIC_API_KEY="sk-ant-...",\
_FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}',\
_VITE_FIREBASE_API_KEY="AIza...",\
_VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com",\
_VITE_FIREBASE_PROJECT_ID="your-project",\
_VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com",\
_VITE_FIREBASE_MESSAGING_SENDER_ID="123456789",\
_VITE_FIREBASE_APP_ID="1:123456789:web:abc123",\
_ADMIN_EMAILS="admin@example.com",\
_ADMIN_TELEGRAM_BOT_TOKEN="",\
_ADMIN_TELEGRAM_CHAT_ID="",\
_CLOUD_SQL_INSTANCE="PROJECT_ID:asia-northeast3:maksoons-dining-db",\
_DATABASE_URL="postgresql://maksoon:YOUR_PASSWORD@/maksoons_dining?host=/cloudsql/PROJECT_ID:asia-northeast3:maksoons-dining-db"
```

---

## 부록: Telegram 알림 설정 (선택)

1. Telegram에서 [@BotFather](https://t.me/BotFather)에게 `/newbot` 명령
2. 봇 이름과 username 입력 → **Bot Token** 수령
3. 생성된 봇에게 아무 메시지 전송
4. 브라우저에서 `https://api.telegram.org/bot{TOKEN}/getUpdates` 접속
5. 응답에서 `chat.id` 값 확인
6. `.env`에 입력:
   ```env
   ADMIN_TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ADMIN_TELEGRAM_CHAT_ID=987654321
   ```

---

## 프로젝트 구조

```
maksoons-dining/
├── server.js                 # Express 서버 진입점
├── server/
│   ├── middleware/
│   │   ├── auth.js           # Firebase 인증 미들웨어
│   │   └── rateLimiter.js    # API 속도 제한
│   ├── routes/
│   │   ├── auth.js           # 인증 & 가구 관리
│   │   ├── wines.js          # 와인 CRUD
│   │   ├── diary.js          # 와인 다이어리
│   │   ├── bot.js            # AI 소믈리에 챗봇
│   │   ├── ocr.js            # 와인 라벨 스캔
│   │   └── groceries.js      # 식재료 관리 (TBU)
│   ├── db/
│   │   ├── connection.js     # DB 연결 풀
│   │   ├── migrate.js        # 마이그레이션 실행기
│   │   ├── migrations/       # SQL 마이그레이션 파일
│   │   └── queries/          # DB 쿼리 모듈
│   └── utils/
│       └── telegram.js       # Telegram 알림
├── client/                   # React 프론트엔드
│   └── src/
│       ├── App.jsx
│       ├── context/          # AuthContext
│       ├── components/       # UI 컴포넌트
│       └── utils/            # firebase.js, api.js
├── Dockerfile
├── docker-compose.yml
└── cloudbuild.yaml
```
