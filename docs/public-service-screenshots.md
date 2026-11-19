# 소개 페이지의 실제 서비스 화면

소개 페이지의 합성 시험 사진 2장을 실제 Plynt에서 연 서비스 화면으로 교체했습니다. 앱 코드는 변경하지 않았습니다.

## 촬영 환경

- Linux에서 Plynt `0.1.0-preview.6`의 실제 Electron 앱을 실행했습니다. 소스 리비전은 `e4bb27dcae2dadc39a6d093b02eaad13290cf9b7`입니다.
- Electron 45.3.3 / Chromium 156.0.8078.100, Xvfb 1600×1000 화면입니다. Chromium 샌드박스를 유지했고 합성 페이지 모드는 사용하지 않았습니다.
- 별도 새 프로필에서 공개 웹사이트만 열었습니다. 계정 로그인, 개인 대화 열기, 메시지 전송, 이미지 생성, 결제는 하지 않았습니다.
- 앱의 실제 웹 패널을 포함한 X 디스플레이를 그대로 캡처했습니다. 화면 합성이나 서비스 UI 재제작은 하지 않았습니다. 쿠키 안내는 각 사이트의 정상 버튼으로 선택 쿠키를 거절하고 닫았습니다.
- 두 사진 모두 **Linux 데스크톱 앱 화면**입니다. Android 태블릿 사진으로 표기하지 않습니다. 기존 태블릿 기능 검사는 [preview.6 검증 기록](preview.6-validation.md)에 남아 있습니다.

## 공개한 사진

| 사진 | 구성 | 확인 범위 |
|---|---|---|
| [ChatGPT + Canva](../site/assets/desktop-chatgpt-canva.png) | 사이드바와 좌우 2개 패널 | ChatGPT 비로그인 채팅 입력 화면, Canva의 공개 AI Image Generator 페이지와 입력칸 |
| [AI 4개](../site/assets/desktop-four-ai.png) | ChatGPT · Perplexity · Duck.ai · DeepAI, 좌우 4열 | 각 서비스의 비로그인 입력 화면이 동시에 표시됨 |

Canva는 `https://www.canva.com/ai-image-generator/`, 다른 서비스는 `https://chatgpt.com/`, `https://www.perplexity.ai/`, `https://duck.ai/`, `https://deepai.org/chat`에서 열었습니다. Canva 사진은 로그인 후 디자인 편집기가 아닙니다.

각 서비스의 주 입력칸이 표시되고 `disabled`·`readOnly` 상태가 아님을 확인했습니다. 입력 전의 화면만 촬영했으므로 답변 생성, 모든 모델의 무료 이용, 로그인 후 편집, 서비스 간 글 전달 성공을 입증하는 사진은 아닙니다. Copilot은 해당 환경에서 로그인 안내가 먼저 표시되고 채팅 입력칸이 없어 4개 구성에서 제외했습니다.

## 확인 결과

- 실제 앱 화면을 직접 검토해 두 사진에 개인 정보, 시험용 문구, 로그인 차단 화면, 쿠키 대화상자가 없는 것을 확인했습니다.
- 이미지 파일 무결성·크기(1600×1000), HTML의 이미지 크기·대체 텍스트, 로컬 링크·파일 존재 여부와 기존 사진 참조 제거를 확인했습니다.
- [촬영 메타데이터·입력칸 상태·이미지 SHA-256](evidence/public-service-screenshots/capture.json)을 기록했습니다. 브라우저 프로필·쿠키·원본 페이지 로그는 공개하지 않습니다.
- 소개 페이지 자체의 브라우저 렌더링 시각 검사는 이번 범위에 포함하지 않았습니다. 앱 화면 확인과 정적 사이트 파일 검사를 구분합니다.
