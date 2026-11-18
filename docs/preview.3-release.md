# Plynt 0.1.0-preview.3 배포 확인 · 2026-11-18

[릴리스와 다운로드](https://github.com/leemh-dev/naru/releases/tag/v0.1.0-preview.3) · [GitHub Actions 실행](https://github.com/leemh-dev/naru/actions/runs/44228121617) · [릴리스 노트](releases/v0.1.0-preview.3.md)

소스 커밋 `e19f6e833c63e045d6bce541f1e20824f99fc3dc`, 태그 `v0.1.0-preview.3`에서 빌드한 설치 파일을 **Plynt** 이름으로 사전 릴리스에 게시했습니다. 게시 시각은 2026-11-18 03:10:33 UTC입니다.

## 게시 결과

| 빌드 환경 | 결과 | 게시 파일 |
|---|---|---|
| Windows GitHub 호스팅 러너 | 성공 | x64 설치 EXE·무설치 ZIP |
| macOS GitHub 호스팅 러너 | 성공 | Apple Silicon·Intel 각각 DMG·ZIP |
| Ubuntu 22.04 GitHub 호스팅 러너 | 성공 | x64 AppImage·amd64 DEB |
| Android 공식 SDK, Ubuntu 22.04 | 성공 | 디버그 서명 호환성 시험 APK |
| 릴리스 게시 작업 | 성공 | 설치 파일 9종과 `SHA256SUMS.txt` |

각 파일의 업로드 상태와 크기를 확인했습니다. GitHub API가 제공한 **자산 SHA-256 다이제스트**를 릴리스에서 내려받은 `SHA256SUMS.txt`의 값과 비교해 설치 파일 9종 모두 일치함을 확인했습니다. 이번 확인을 모든 설치 파일을 로컬에 내려받아 직접 실행한 것으로 해석하지 않습니다.

[파일명·크기·체크섬·다운로드 URL 기록](evidence/preview.3/release-verification.json) · [배포 체크섬](evidence/preview.3/SHA256SUMS.txt)

기본 자동 검사는 통과했습니다. 설치 파일 생성과 체크섬 검증은 Windows·macOS에서의 실제 앱 실행, Android 정상 로그인·길게 누르기 전달, 실제 서비스의 로그인 후 호환성을 증명하지 않습니다. 이름 변경 코드의 Linux 합성 화면 검사는 [별도 기록](plynt-rename.md)에 있습니다.

## 저장소 주소 변경 상태

`leemh-dev/naru`를 `leemh-dev/plynt`로 바꾸는 요청도 시도했지만, 인증된 GitHub CLI의 저장소 이름 변경 API가 `403 Resource not accessible by integration`으로 거부했습니다. 브라우저를 통한 사용자 로그인 연결도 제공되지 않아 이번 실행에서 주소 변경은 완료하지 못했습니다.

실제 주소가 변경되기 전까지 저장소 링크와 git 원격 주소는 현재 동작하는 `leemh-dev/naru`를 유지합니다. 사용자가 [저장소 Settings](https://github.com/leemh-dev/naru/settings)의 Repository name을 `plynt`로 변경하면, 확인 후 README·패키지 메타데이터·문서 링크와 git 원격 주소를 새 주소로 맞출 수 있습니다. 비밀번호나 토큰을 전달할 필요는 없습니다.

이전 Naru 릴리스와 검증 증거는 과거 기록으로 보존했습니다. 새 버전의 설치 파일·앱 표시 이름은 Plynt이며, 기존 데이터 경로와 앱 식별자는 연속성을 위해 유지합니다.
