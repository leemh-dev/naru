# Plynt preview.6 검증 기록

검사일: 2026-11-19. 이번 변경: 프로젝트 이름·저장소 주소 통일, 저장된 워크스페이스 이름 변경, 플린트 사이드바, Android 태블릿 멀티뷰, GitHub Pages 소개 페이지.

## 환경과 구분

- 로컬 Linux: Electron 45.3.3, Xvfb 실제 앱 창. 격리된 임시 프로필의 합성 페이지에만 시험용 실행 옵션 적용. 실제 서비스 프로필이나 정상 배포 보안 설정은 변경하지 않았습니다.
- CI: Windows x64·macOS arm64·Linux x64의 네이티브 Electron. Intel Mac은 패키지 빌드 대상이며 실제 x64 실행은 미검증입니다.
- Android: 공식 Android 15/API 35 x86_64 에뮬레이터, Pixel 2 기본 휴대폰 설정과 2560×1600·1600×2560 / 240dpi 태블릿 화면 설정. 데스크톱 브라우저를 줄인 시험이 아닙니다. 물리 태블릿 실기기는 미검증입니다.
- 모든 페이지·글·쿠키는 합성 시험 자료입니다. 실제 계정 로그인을 시험하지 않았습니다.

## 진행 결과

최종 태그 `v0.1.0-preview.6` / 커밋 `eef3e0a82b71d75d9e9b7de40131820c09643122`의 [배포 검사](https://github.com/leemh-dev/plynt/actions/runs/44459269369)가 통과했습니다. [공개 APK 덮어설치·배포 검사](https://github.com/leemh-dev/plynt/actions/runs/44461058875)도 통과했습니다. 설치 파일 9개와 체크섬이 [릴리스](https://github.com/leemh-dev/plynt/releases/tag/v0.1.0-preview.6)에 게시됐습니다.

| 항목 | 결과 |
|---|---|
| 기본 Node 검사 | 20개 통과 |
| Linux 새 기능·회귀 검사 | 30개 + 재시작 3개 및 기존 탭·배치·분류 50개 통과 |
| Android 휴대폰 사이드바·이름 변경·복원 | 26개 통과 |
| Windows·Mac 새 기능·회귀 검사 | 각 30개 + 재시작 3개 통과 |
| Android 태블릿 기본 검사 | 14개 통과: 2/3/4개 자동 배치, 좌우 열, 드래그, 입력 보호, 단독 탭, 회전, 복원 |
| 공개 preview.5 → preview.6 덮어설치 | Android 15에서 14개 통과: 런처 조회·실행, 탭 ID·워크스페이스, 합성 쿠키·웹 저장소 보존 |
| 배포 파일 | 설치 파일 9개·체크섬 대조 성공, 공개 APK는 로컬 서명 파일과 바이트 단위 일치 |
| 실제 AI 서비스 로그인 후 입력 | 미검증 |
| 소개 페이지 | 정적 HTML·로컬 링크·자산 검사 통과. Pages 공개 후 홈페이지·개인정보·CSS·파비콘 HTTP 200 및 원본 일치. 브라우저 시각 QA는 미실행 |

## 관찰과 수정

- 최초 데스크톱 스크롤 검사는 Windows·Mac에서 실패했습니다. 폭 변경에 따른 Chromium 스크롤 앵커링 영향을 구분하도록 합성 문서의 스크롤 앵커링을 끄고 동일 화면의 초안·스크롤을 확인합니다. 실제 사이트가 폭에 맞춰 내용을 재배치하는 동작까지 고정하지 않습니다.
- macOS CI의 복사 버튼 검사에서는 창의 포커스 전환 전에 클릭하는 간헐적 실패가 있었습니다. 실제 네이티브 창·페이지 포커스를 기다린 뒤 클릭하고 클립보드 갱신을 확인하도록 고쳤습니다. 사이트 권한 정책을 완화하지 않았습니다.
- Android 접근성 트리는 네이티브 WebView와 내부 문서를 모두 같은 클래스로 노출했습니다. 최초 태블릿 검사에서 패널 4개를 8개로 세어 실패한 것을 원본 캡처·XML로 확인하고, 최상위 WebView만 세도록 검사 코드를 고쳤습니다.

- 추가 업데이트 검사에서 일반 암시적 MAIN/LAUNCHER 실행은 기존 버전에서도 해결되지 않았습니다. 런처처럼 등록된 컴포넌트를 조회한 뒤 명시적으로 실행해 두 버전의 진입점을 확인했습니다.
- 최초 업데이트 쿠키 검사는 페이지 로딩 완료 전에 확인해 실패했습니다. 합성 문서 로딩 완료와 이전 버전의 저장·재실행 기준점을 확인하도록 고친 뒤 새 버전에서 쿠키·웹 저장소 유지가 통과했습니다. 앱의 인증·저장 정책을 완화하지 않았습니다.

## 데이터·이름 호환성

`dev.plynt.mobile.preview.MainActivity`로 Java 소스를 옮겼습니다. 앱 ID 및 런처 별칭 `dev.naru.mobile.preview`는 기존 설치를 잇는 식별자로 남겼습니다. 앱 ID까지 변경하면 새 앱으로 설치돼 기존 데이터에 접근하지 못합니다. 배포 키는 `docs/android-signing.json`의 인증서와 대조합니다. 공개 preview.5 APK를 설치해 합성 데이터를 저장·재실행한 뒤, 앱을 삭제하지 않고 공개 preview.6 APK로 덮어 설치하는 검사가 통과했습니다. 실제 계정과 물리 실기기의 업데이트는 별도 확인 대상입니다.

## 화면 증거

- [Linux 사이드바](evidence/preview.6/linux/12-sidebar.png): 실제 앱 창과 합성 웹 화면.
- [이름 변경 입력창](evidence/preview.6/linux/13-rename.png).
- [Linux 30개 결과](evidence/preview.6/linux/features-results.json), [재실행 3개](evidence/preview.6/linux/features-restore-results.json).

검사 원본은 합성 자료만 공개합니다. 진단 로그에는 워크스페이스 이름·주소·대화·쿠키가 들어가지 않는 것도 검사합니다.

- [Windows 30개](evidence/preview.6/windows/features-results.json), [재시작 3개](evidence/preview.6/windows/features-restore-results.json).
- [macOS arm64 30개](evidence/preview.6/macos/features-results.json), [재시작 3개](evidence/preview.6/macos/features-restore-results.json).
- [Android 사이드바](evidence/preview.6/android/05-sidebar.png), [이름 변경](evidence/preview.6/android/06-rename.png), [휴대폰 결과](evidence/preview.6/android/results.json).
- [태블릿 2×2](evidence/preview.6/android-tablet/01-tablet-grid.png), [좌우 4열](evidence/preview.6/android-tablet/03-tablet-columns.png), [세로 화면](evidence/preview.6/android-tablet/04-tablet-portrait.png), [태블릿 결과](evidence/preview.6/android-tablet/results.json).

## 공개 파일·업데이트 증거

- [덮어설치 14개 결과](evidence/preview.6/android-upgrade/results.json), [업데이트 후 새 사이드바](evidence/preview.6/android-upgrade/01-updated-sidebar.png).
- [설치 파일 검증](evidence/preview.6/release-verification.json), [최종 SHA256SUMS](evidence/preview.6/SHA256SUMS.txt).
- APK는 실제 공개 다운로드와 로컬 서명본을 바이트 단위로 비교했습니다. 데스크톱 8개 파일은 GitHub asset digest와 체크섬을 대조했으며 모든 설치 관리자 흐름을 직접 실행한 것은 아닙니다.
- 소유자의 Pages 설정 후 [소개 페이지](https://leemh-dev.github.io/plynt/)를 공개했습니다. 초기 활성화 API 403과 업로드 직후 파일 조회 실패는 과거 결과입니다. 빌드·배포 분리 및 파일 조회 대기 후 [배포 실행](https://github.com/leemh-dev/plynt/actions/runs/44462828236)이 성공했습니다. [공개 HTTP 검사](evidence/preview.6/pages-verification.json)는 홈페이지·개인정보·CSS·파비콘의 HTTP 200과 원본 바이트 일치를 확인합니다. 브라우저 시각 QA를 수행했다는 뜻은 아닙니다.
