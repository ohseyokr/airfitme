AIRFITME FRMS - GitHub 저장소 구조 및 Render 배포 가이드

본 가이드는 Render Cloud의 Node Service와 PostgreSQL 데이터베이스 연동을 위해 GitHub 저장소(https://github.com/ohseyokr/airfitme)에 코드를 업로드할 때 필요한 최적의 폴더 구조와 배포 설정 단계를 정의합니다.

1. 최적의 GitHub 저장소 폴더 구조 (Folder Structure)

업로드된 package.json의 실행 경로(src/server.js)와 server.js 내 정적 파일 서비스 경로(src/public)를 완벽히 충족하는 디렉터리 구성안입니다.

airfitme/ (Repository Root)
├── src/
│   ├── server.js                 # Express 백엔드 및 웹소켓 메인 서버 파일
│   └── public/
│       └── index.html            # 프론트엔드 웹앱 및 통합 시뮬레이터 UI
├── database/
│   └── schema.sql                # PostgreSQL DB 테이블 구성 및 가상 데이터 스키마
├── package.json                  # Node.js 패키지 환경 및 의존성 정의 파일
└── README.md                     # 프로젝트 개요 및 배포 매뉴얼


각 파일의 배치 위치 및 역할 요약

파일명

저장소 내 물리적 경로

주요 역할 및 연계 포인트

package.json

/package.json (루트)

Render 배포 빌드 시 환경설정 및 구동 스크립트(npm start) 제공

server.js

/src/server.js

Express API 엔드포인트 및 실시간 관제를 위한 웹소켓 서버 실행

index.html

/src/public/index.html

하이브리드 앱 웹뷰가 바라볼 실시간 관제 UI 및 통합 테스트 시뮬레이터

schema.sql

/database/schema.sql

데이터베이스 설계서 역할을 겸하며, PostgreSQL 초기화에 쓰이는 DDL 스크립트

2. GitHub 업로드 시 주의 사항 및 코드 연계 포인트

① package.json 의 경로 일치 확인

Render는 루트 디렉터리에 위치한 package.json을 분석하여 빌드를 진행합니다. scripts 내 구동 명령어가 실제 파일 위치를 정확히 가리키고 있는지 확인해야 합니다.

"scripts": {
  "start": "node src/server.js"
}


② server.js 내의 정적 폴더 맵핑

src/server.js 내부에서 프론트엔드 파일 경로를 지정할 때 아래 코드가 사용됩니다.

// src/server.js 기준, 동일 디렉터리 안의 public 폴더를 정적 경로로 지정
app.use(express.static(path.join(__dirname, 'public')));


따라서 index.html 파일은 반드시 /src/public/ 폴더 내에 배치되어야 도메인 접속 시 웹페이지가 바로 표시됩니다.

3. Render Cloud 서비스 생성 및 배포 설정 가이드

단계 1: PostgreSQL 데이터베이스 생성

Render 대시보드에서 New > PostgreSQL을 선택합니다.

데이터베이스 설정 값을 입력합니다:

Name: airfitme-db

Region: 가급적 Web Service와 동일한 리전 선택

데이터베이스 생성이 완료되면 화면에 제공되는 Internal Database URL 또는 External Database URL을 안전한 곳에 복사해 둡니다.

단계 2: 데이터베이스 테이블 초기화 (schema.sql 반영)

Render PostgreSQL에 접속하여 /database/schema.sql의 SQL 스크립트를 실행해 테이블과 초기 데이터를 삽입합니다.

방법 A (Render Shell 사용): Render 데이터베이스 페이지의 Shell 탭에 접속하여 schema.sql 내의 쿼리를 직접 복사하여 실행합니다.

방법 B (DBeaver/pgAdmin 연동): 복사해 둔 External Database URL을 이용해 외부 데이터베이스 관리 툴에서 쿼리를 밀어 넣습니다.

단계 3: Node Web Service 생성 및 GitHub 연동

Render 대시보드에서 New > Web Service를 선택합니다.

https://github.com/ohseyokr/airfitme 저장소를 연동합니다.

배포 환경을 다음과 같이 입력합니다:

Name: airfitme-frms-server

Environment: Node

Region: 데이터베이스와 동일한 리전

Branch: main (또는 실제 작업 중인 브랜치명)

Root Directory: 빈칸 (루트 기준 배포)

Build Command: npm install

Start Command: npm start (또는 node src/server.js)

단계 4: 환경 변수(Environment Variables) 설정 (가장 중요)

Web Service 설정 화면의 Environment 탭으로 이동하여 아래 변수를 반드시 등록해야 연동이 완료됩니다.

DATABASE_URL: 단계 1에서 생성하고 복사한 PostgreSQL의 Internal Database URL 값을 여기에 대입합니다.

예: postgresql://user:password@host/database_name?sslmode=require

4. 로컬 테스트 및 동작 확인 절차

코드 업로드 및 Render 배포가 끝나면 다음 단계로 동작을 점검할 수 있습니다.

지상 관제용 웹 대시보드 확인:
https://airfitme-frms-server.onrender.com/에 접속하여 통합 시뮬레이터 화면이 깨짐 없이 로드되는지 확인합니다.

실시간 API 동작 확인:
https://airfitme-frms-server.onrender.com/api/v1/frms/crew-status 호출 시 PostgreSQL의 crew_profiles 테이블 데이터를 올바르게 응답하는지 확인합니다.

Flutter 하이브리드 앱 연동:
이전의 Flutter 모바일 기기 빌드용 main.dart 파일 내의 webAppUrl 변수 주소를 위 배포 완료된 Render 도메인 주소로 교체 후 패키징하여 .apk 파일을 추출합니다.
