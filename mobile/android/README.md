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
- URL·별칭·보관 글의 기기 내 저장. 입력 중인 글의 재실행·화면 회전 후 복원은 보장하지 않음.
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

기존 서명 키를 `PLYNT_ANDROID_DEBUG_KEY`에 지정하세요. 이전 `NARU_ANDROID_DEBUG_KEY` 설정도 호환되며, 둘 다 지정하면 새 설정을 우선합니다. 환경 변수가 없으면 기존 `/workspace/naru-android-test/naru-debug.keystore`를 우선 사용하고, 없을 때만 `/workspace/plynt-android-test/plynt-debug.keystore`를 만듭니다. CI의 임시 키는 기존 설명대로 빌드마다 달라질 수 있습니다.

```sh
adb install --no-incremental -r dist/android/plynt-0.1.0-preview.4-android-test.apk
adb shell am start -n dev.naru.mobile.preview/.MainActivity
```

최소 SDK 선언은 Android 8(API 26)이며, 다른 Android 버전의 실행 호환성이 검증됐다는 의미는 아닙니다. 실제 시험 환경과 결과는 [검증 기록](../../docs/preview.2-validation.md)에 구분해 기록합니다.

## preview.4 바로가기 변경

`+` 메뉴에 8개 분류 선택과 한글·영문 검색을 추가했습니다. 데스크톱과 같은 47개 서비스 목록을 사용하며 웹 주소 직접 입력도 유지합니다. 탭에는 서비스 약자와 별칭이 표시됩니다. 이번 변경의 APK 빌드와 번들 목록 일치는 확인했지만, **Android에서 새 메뉴의 실제 터치·키보드 동작과 서비스 로그인은 미검증**입니다. [변경·검증 기록](../../docs/preview.4-validation.md)
