# Plynt preview.6 검증 기록

검사일: 2026-11-19. 이번 변경: 프로젝트 이름·저장소 주소 통일, 저장된 워크스페이스 이름 변경, 플린트 사이드바, Android 태블릿 멀티뷰, GitHub Pages 소개 페이지.

## 환경과 구분

- 로컬 Linux: Electron 45.3.3, Xvfb 실제 앱 창. 격리된 임시 프로필의 합성 페이지에만 시험용 실행 옵션 적용. 실제 서비스 프로필이나 정상 배포 보안 설정은 변경하지 않았습니다.
- CI: Windows x64·macOS arm64·Linux x64의 네이티브 Electron. Intel Mac은 패키지 빌드 대상이며 실제 x64 실행은 미검증입니다.
- Android: 공식 Android 15/API 35 x86_64 에뮬레이터, Pixel 2 기본 휴대폰 설정과 2560×1600·1600×2560 / 240dpi 태블릿 화면 설정. 데스크톱 브라우저를 줄인 시험이 아닙니다. 물리 태블릿 실기기는 미검증입니다.
- 모든 페이지·글·쿠키는 합성 시험 자료입니다. 실제 계정 로그인을 시험하지 않았습니다.

## 진행 결과

최종 CI 검사와 배포를 진행 중입니다. 통과 결과와 설치 파일 체크섬을 확인한 뒤 이 표를 갱신합니다.

| 항목 | 결과 |
|---|---|
| Linux 새 기능·회귀 검사 | 30개 + 재시작 3개 및 기존 탭·배치·분류 50개 통과 |
| Android 휴대폰 사이드바·이름 변경·복원 | 25개 통과, 최종 태그 재확인 예정 |
| Windows·Mac 새 기능·회귀 검사 | 각 30개 + 재시작 3개 통과, 최종 태그 재확인 예정 |
| Android 태블릿 기본 검사 | 11개 통과. 입력 보호·2/3개 자동 배치의 추가 검사 진행 중 |
| 실제 AI 서비스 로그인 후 입력 | 미검증 |
| 소개 페이지 | 정적 HTML·로컬 링크·자산 검사 통과. 브라우저 제어 경로 부재로 시각 QA 미실행. Pages 활성화 관리 권한 요청 403 |

## 관찰과 수정

- 최초 데스크톱 스크롤 검사는 Windows·Mac에서 실패했습니다. 폭 변경에 따른 Chromium 스크롤 앵커링 영향을 구분하도록 합성 문서의 스크롤 앵커링을 끄고 동일 화면의 초안·스크롤을 확인합니다. 실제 사이트가 폭에 맞춰 내용을 재배치하는 동작까지 고정하지 않습니다.
- macOS CI의 복사 버튼 검사에서는 창의 포커스 전환 전에 클릭하는 간헐적 실패가 있었습니다. 실제 네이티브 창·페이지 포커스를 기다린 뒤 클릭하고 클립보드 갱신을 확인하도록 고쳤습니다. 사이트 권한 정책을 완화하지 않았습니다.
- Android 접근성 트리는 네이티브 WebView와 내부 문서를 모두 같은 클래스로 노출했습니다. 최초 태블릿 검사에서 패널 4개를 8개로 세어 실패한 것을 원본 캡처·XML로 확인하고, 최상위 WebView만 세도록 검사 코드를 고쳤습니다.

## 데이터·이름 호환성

`dev.plynt.mobile.preview.MainActivity`로 Java 소스를 옮겼습니다. 앱 ID 및 런처 별칭 `dev.naru.mobile.preview`는 기존 설치를 잇는 식별자로 남겼습니다. 앱 ID까지 변경하면 새 앱으로 설치돼 기존 데이터에 접근하지 못합니다. 배포 키는 `docs/android-signing.json`의 인증서와 대조합니다. 실제 preview.5 → preview.6 덮어설치 전체 흐름은 별도 실기기 확인이 필요합니다.

## 화면 증거

- [Linux 사이드바](evidence/preview.6/linux/12-sidebar.png): 실제 앱 창과 합성 웹 화면.
- [이름 변경 입력창](evidence/preview.6/linux/13-rename.png).
- [Linux 30개 결과](evidence/preview.6/linux/features-results.json), [재실행 3개](evidence/preview.6/linux/features-restore-results.json).

검사 원본은 합성 자료만 공개합니다. 진단 로그에는 워크스페이스 이름·주소·대화·쿠키가 들어가지 않는 것도 검사합니다.

- [Windows 30개](evidence/preview.6/windows/features-results.json), [재시작 3개](evidence/preview.6/windows/features-restore-results.json).
- [macOS arm64 30개](evidence/preview.6/macos/features-results.json), [재시작 3개](evidence/preview.6/macos/features-restore-results.json).
- [Android 사이드바](evidence/preview.6/android/05-sidebar.png), [이름 변경](evidence/preview.6/android/06-rename.png), [휴대폰 결과](evidence/preview.6/android/results.json).
- [태블릿 2×2](evidence/preview.6/android-tablet/01-tablet-grid.png), [좌우 4열](evidence/preview.6/android-tablet/03-tablet-columns.png), [세로 화면](evidence/preview.6/android-tablet/04-tablet-portrait.png), [태블릿 결과](evidence/preview.6/android-tablet/results.json).
