# Plynt Android 호환성 시험 앱

표시 이름은 Naru에서 Plynt로 변경했습니다. 기존 설치의 로컬 작업·WebView 데이터에 계속 접근할 수 있도록 Android 패키지 ID와 Java 경로는 `dev.naru.mobile.preview`로 유지합니다. APK 업데이트에는 기존 설치와 같은 서명 키도 필요합니다.

Android WebView에서 실제 서비스 화면과 **길게 누른 글 선택 → 다른 탭으로 넣기**를 검증하기 위한 별도 시험 앱입니다. 완성된 모바일 제품이나 데스크톱과 기능이 같은 앱으로 소개하지 않습니다. iOS 앱은 포함하지 않습니다.

데스크톱과 `src/input-bridge.js`의 입력칸 지정·기존 글 확인·원문 비교 로직, `src/services.json`의 공통 서비스 목록·분류을 공유합니다. Android의 창·탭·선택 메뉴·저장·진단은 네이티브 Java로 구현했습니다. 다른 회사의 설치된 앱을 내장하는 방식이 아니라 원본 웹사이트를 여는 방식입니다.

## 구현 범위

- 최대 30개 탭, 활성 탭의 은은한 하이라이트와 자동 가로 스크롤.
- 탭을 길게 눌러 별칭 변경·닫기.
- 웹의 글을 길게 눌러 선택한 뒤 Android 선택 메뉴에서 `다른 탭에 넣기`, `입력칸 지정`, `복사하고 보관` 이용.
- 입력칸을 먼저 터치하고 길게 눌러 지정하거나, 선택 메뉴가 나타나지 않으면 `··· → 현재 입력칸 지정` 이용.
- 전달할 때 대상 탭 활성화, 빈 칸 확인, 원문 일치 검사. 전송·생성 버튼은 누르지 않음.
- 이름 붙인 워크스페이스 저장·다른 이름으로 저장·새 빈 작업·전환. URL·별칭·순서·활성 탭·보관 글·최근 목적지를 기기 내 자동 저장. 입력 중인 글·스크롤·편집 상태 복원은 보장하지 않음.
- 입력칸을 아직 등록하지 않은 탭도 목적지 목록에 표시. 대상 활성화 → 빈 칸 터치 → 상단 `여기에 넣기`.
- 상단 `↗`에서 복사한 글 미리 보기·최근 목적지 재사용. ChatGPT 답변 가져오기는 합성 화면만 검증한 시험 기능.
- `All` 기본 선택, 가로 스크롤 다중 분류, 47개 서비스 아이콘과 약자, Google 브라우저 바로가기.
- 스파크 P 런처 아이콘과 빈 작업 화면. 정상 로그인 쿠키·웹 저장소 유지, 명시적 로그인 데이터 삭제.
- 진단 미리 보기·JSON 파일 저장·수집 중지·기록 삭제. 자동 업로드 없음.
- `··· → 합성 화면 2개 열기`로 계정 없이 입력·선택 동작을 시험할 수 있음.

모바일 멀티뷰, 이미지·음악·파일 업로드, 동기화, iOS 버전, 완전한 서비스 로그인 호환성은 구현·검증 범위에 포함하지 않습니다. 서비스의 iframe 입력칸은 지원하지 않습니다. 로그인 페이지에서는 입력칸 지정을 중단합니다.

## 인증과 진단

각 사이트가 제공하는 정상 로그인만 사용합니다. 비밀번호·세션 쿠키를 다른 브라우저에서 가져오지 않습니다. 외부 브라우저에서 로그인했다고 WebView에 같은 세션이 생기는 것은 아닙니다. 내장 웹뷰를 제한하는 서비스에서는 로그인되지 않을 수 있습니다.

TLS 인증서 오류는 연결을 중단합니다. 인증서 검증을 해제하거나 Google 등의 로그인 제한을 우회하지 않습니다. 원격 서비스 페이지에 네이티브 JavaScript 인터페이스를 노출하지 않습니다.

진단에는 시각·이벤트·서비스 종류·결과·오류 코드·글자 수와 Android/WebView 버전만 기록합니다. 원문·URL·별칭·비밀번호·쿠키·스크린샷·서비스 콘솔은 포함하지 않습니다. 최근 이벤트는 최대 300개이며 앱 전용 파일에 기록하고, 재실행할 때 허용된 필드만 다시 읽습니다. 수집 중지 설정도 유지합니다.

이 APK는 **디버그 서명과 WebView 디버깅이 켜진 호환성 시험용**입니다. 운영 배포용 서명·스토어 등록은 아직 구성하지 않았습니다. 비민감 시험 작업으로 먼저 확인하세요. 서명 키가 다른 빌드는 기존 설치를 바로 업데이트할 수 없습니다. 이 경우 앱 삭제는 로컬 작업 데이터를 지우므로 먼저 보관할 내용을 확인해야 합니다.

## 빌드

JDK 17 이상, Node.js, Python 3, 공식 Android SDK의 `platforms;android-35`와 `build-tools;35.0.0`이 필요합니다. Gradle이나 외부 Android 라이브러리는 사용하지 않습니다.

```sh
export ANDROID_SDK_ROOT=/path/to/android-sdk
export PLYNT_ANDROID_DEBUG_KEY=/path/outside/repository/plynt-debug.keystore
python mobile/android/build.py
```

`dist/android/plynt-<version>-android-test.apk`가 생성됩니다. 빌드 스크립트는 번들에 공통 입력 코드와 서비스 목록을 복사하고, SDK의 aapt2·javac·d8·zipalign·apksigner로 빌드·검증합니다. 서명 키는 저장소 밖에 유지하고 커밋하지 마세요.

기존 서명 키를 `PLYNT_ANDROID_DEBUG_KEY`에 지정하세요. 이전 `NARU_ANDROID_DEBUG_KEY` 설정도 호환되며, 둘 다 지정하면 새 설정을 우선합니다. 환경 변수가 없으면 기존 `/workspace/naru-android-test/naru-debug.keystore`를 사용합니다. 키가 없으면 기본적으로 빌드를 중단합니다. 개발용 새 키 생성에만 `PLYNT_INIT_DEBUG_KEY=1`을 명시하세요. 새 키는 기존 설치를 업데이트할 수 없습니다. CI 임시 키는 합성 검사 전용이며 공개 릴리스 APK에서 제외합니다.

```sh
adb install --no-incremental -r dist/android/plynt-0.1.0-preview.5-android-test.apk
adb shell am start -n dev.naru.mobile.preview/.MainActivity
```

최소 SDK 선언은 Android 8(API 26)이며, 모든 Android 버전의 호환성을 뜻하지는 않습니다. 새 동작은 Android 15(API 35), Pixel 2 x86_64 에뮬레이터와 합성 HTTPS WebView로 검사합니다. 실제 서비스 로그인 후 동작은 미검증입니다. [preview.5 검증 기록](../../docs/preview.5-validation.md)

## preview.5 업데이트와 서명

기존 공개 preview.4 APK는 CI의 임시 키로 서명되어 있습니다. 해당 키가 현재 남아 있지 않아 **preview.5와 서명이 다르며 `adb install -r`로 덮어 설치할 수 없습니다.** 패키지 ID가 같아도 서명 일치는 별도 요건입니다. 앱을 삭제하면 탭·보관 글·WebView 로그인이 사라지므로 필요한 URL과 자료부터 별도로 보관해야 합니다. 자동 데이터 이동 기능은 없습니다.

preview.5는 저장소 밖에 보관한 키를 사용합니다. 향후 업데이트도 반드시 그 키를 재사용해야 합니다. 공개 인증서 지문은 [android-signing.json](../../docs/android-signing.json)에 있으며 개인 키는 업로드하지 않습니다. 키를 별도의 안전한 장소에 백업해야 지속적인 업데이트가 가능합니다. 운영용 키 관리·스토어 서명은 아직 별도입니다.

데스크톱 자동 릴리스 생성 후 다음 명령이 로컬 APK의 서명 지문을 검사하고 APK를 첨부하며 전체 9개 설치 파일 체크섬을 갱신합니다.

```sh
python scripts/publish-android-preview.py
```

이 앱은 디버그 서명·WebView 디버깅이 켜진 시험용입니다. 실제 계정 인증 완료나 모든 서비스 입력 호환성을 보장하지 않습니다. 정상 인증 외의 우회는 하지 않습니다.

## 직접 업로드 인증이 제한된 환경

로컬 `gh release upload`가 업로드 호스트에서 401을 반환하는 환경에서는 [Android 게시 워크플로](../../.github/workflows/publish-android.yml)를 사용합니다. **개인 키를 보내지 않습니다.** 성공한 동일 태그의 CI APK와 로컬에서 서명한 공개 APK 사이의 작은 BSDIFF 차이만 전달합니다. 워크플로는 원본 실행의 성공·커밋, 복원된 APK의 SHA-256, 보관 인증서 지문을 모두 검사한 뒤 게시합니다.

`bsdiff4==1.2.6` 설치 후 CI의 `installers-android` 아티팩트 APK를 다운로드하고 다음 입력을 준비합니다.

```sh
python scripts/prepare-android-handoff.py --ci-apk /tmp/ci.apk --source-run RUN_ID --output /tmp/android-publish.json
gh api repos/OWNER/REPO/actions/workflows/publish-android.yml/dispatches --input /tmp/android-publish.json
```

APK·차이 파일·입력 JSON은 저장소에 커밋하지 않습니다. 이 경로도 APK 자체에 포함된 공개 서명만 전달하며 서명 개인 키를 CI에 저장하지 않습니다.
