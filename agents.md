# 개발 가이드

## 파일 역할

- `button.js`: 복사 버튼 생성과 배치
- `extractor.js`: 현재 언어의 지문 추출과 텍스트 정리
- `clipboard.js`: 클립보드에 쓰기
- `main.js`: 클릭 이벤트 처리와 성공·실패 표시
- `manifest.json`: 스크립트 실행 순서와 권한
- `content.css`: 버튼 스타일

## 개발 테스트

Node.js와 Chrome이 설치된 환경에서 `npm install` 후 `npm test`를 실행합니다.
Playwright는 헤드리스 Chrome에서 실행하는 테스트용 의존성입니다.
테스트는 실제 지문 구조를 본뜬 로컬 페이지에서 언어 선택, 수식, 예제 공백,
중복 버튼 방지, 클립보드 복사와 실패 후 재시도를 검증합니다.
