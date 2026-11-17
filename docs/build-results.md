# 2026-11-17 시험판 생성 결과

프로젝트명은 아직 미정입니다. `AI Workspace Preview`는 임시 이름입니다. 로컬 Git 저장소를 만들고 첫 커밋을 완료했습니다. GitHub CLI는 `leemh-dev`로 인증돼 있지만 새 저장소 생성 요청은 `Resource not accessible by integration (createRepository)`로 거절됐습니다. **자동 승인 검토의 거절이 아니라 GitHub 연결 권한 제한**입니다. 원격 저장소 생성·소스 업로드·릴리스 공개는 완료되지 않았습니다. 사용자가 만든 빈 저장소의 주소가 필요합니다.

## 생성한 파일

모두 Electron 45.3.3, electron-builder 26.18.0, 앱 버전 0.1.0입니다. 빌드는 Linux x86_64에서 수행했습니다.

| 파일 | 결과 | 실행 검증 |
|---|---|---|
| `ai-workspace-preview-0.1.0-win-x64.zip` | 생성 성공. 압축을 풀고 exe를 실행하는 배포본 | Windows에서 미검증 |
| `ai-workspace-preview-0.1.0-mac-x64.zip` | Intel Mac 앱 묶음 생성 성공 | macOS에서 미검증 |
| `ai-workspace-preview-0.1.0-mac-arm64.zip` | Apple Silicon Mac 앱 묶음 생성 성공 | macOS에서 미검증 |
| `ai-workspace-preview-0.1.0-linux-x86_64.AppImage` | 생성 성공 | AppImage 자체 실행은 미검증 |
| `ai-workspace-preview-0.1.0-linux-amd64.deb` | 생성 성공 | 시스템에 설치하지 않고 임시 추출 후 포함된 실행 파일로 창 표시 확인 |
| Windows NSIS `.exe` 설치 프로그램 | 미완료 | Linux Wine 부재 후 공식 빌드용 Wine 11 묶음으로 재시도했으나 `ntdll.dll c0000135` 오류. 실패한 중간 exe 파일은 배포에서 제거함 |
| macOS `.dmg` | 현재 미생성 | macOS GitHub Actions 작업에 구성함 |

Windows·macOS에서 해당 OS의 원래 런타임으로 앱을 실행한 결과가 아닙니다. Wine 설치 프로그램 생성 시도를 Windows 앱 시험으로 세지 않습니다. macOS ZIP은 서명·공증하지 않았으므로 Gatekeeper 등이 실행을 막을 수 있습니다.

## 동작 확인

- **단위 검사 6개:** 로그에 비밀 문자열·원문·URL·임의 오류 메시지를 넣지 않는지, 내보내기 때 재검사하는지, 로그 순환·중지·삭제, 배치·이동·복원 데이터의 일관성.
- **Linux Electron 합성 화면 검사 12개:** 4개 웹뷰, 실제 2×2·좌우 4열 위치, 네이티브 메뉴로 입력칸 지정·선택 글 전달, 원문 유지, 기존 글 보호, 다른 대상 유지, 패널 이동 후 웹뷰·입력 유지, 진단 결과 기록, 진단 원문·별칭 제외.
- **재시작 검사 4개:** 4개 탭, 사용자 별칭, 보관한 글 복원. 지정했던 DOM 입력칸은 복원됐다고 가장하지 않고 다시 지정하도록 함.
- **패키지 시작:** deb를 임시 디렉터리에 추출해 패키지에 포함된 실제 실행 파일로 빈 작업 화면이 나타나는 것을 확인.

합성 시험에서는 원문 선택 범위를 DOM으로 설정했습니다. 네이티브 메뉴를 여는 마우스 입력과 메뉴 선택 키보드 입력은 X11 실제 이벤트를 사용했습니다. 패널 이동은 앱 명령을 호출해 확인했으며 사람이 하는 드래그 제스처 전체의 사용성 검증은 아닙니다.

실제 로그인 후 ChatGPT → Suno·Canva 전달, 일반 브라우저 대비 조작 수·시간 절감, 생성 완료 알림, 모바일, 클라우드 동기화, 시장 수요는 미검증입니다.

## 화면 증거

- [2×2](evidence/01-grid.png)
- [좌우 4열](evidence/02-columns.png)
- [진단 보고서 미리 보기](evidence/03-diagnostics.png)
- [실제 네이티브 메뉴](evidence/04-native-menu.png)
- [Linux 패키지에서 실행한 빈 작업 화면](evidence/05-packaged-startup.png)
- [실행 검사](evidence/desktop-results.json), [재시작 검사](evidence/restore-results.json), [원문 없는 진단 예시](evidence/diagnostics-example.json)

모든 증거는 비민감 합성 화면입니다. 계정 로그인 정보나 개인 대화는 사용·캡처하지 않았습니다. 파일 전달·실제 서비스 화면 자동 입력 성공 증거로 확대 해석하지 않습니다.
