# Plynt 소개 페이지·스토어 배포 검토

후속 개발: 소개 페이지와 앱 수정은 [preview.6 검증 기록](preview.6-validation.md)을 확인하세요. 아래는 제작 전 검토의 기록입니다.

검토일: 2026-11-19. 대상: `0.1.0-preview.5`의 현재 코드·배포 설정과 아래 공식 문서. 이번 작업은 검토 문서만 작성하며, 웹사이트 제작·Pages 활성화·앱 수정·스토어 등록·결제는 진행하지 않습니다.

## 결론

**현재 무료 시험판의 소개·사용법·다운로드 안내는 GitHub Pages로 시작하기에 적합합니다.** 설치 파일은 기존 GitHub Releases에 두고 페이지에서 연결하면 됩니다.

**스토어 배포는 플랫폼별로 가능성을 검토할 수 있지만, 지금 배포한 파일을 그대로 올릴 준비는 되어 있지 않습니다.** Android는 API 수준·배포 형식·서명 개선이 필요하고, iOS 앱은 아직 없습니다. Windows와 Mac도 스토어별 패키징과 서명·심사 준비가 별도입니다. 심사 통과 여부는 미확정입니다.

## 확인한 사실

| 대상 | 현재 상태 | 근거 |
|---|---|---|
| 저장소 | 공개 `leemh-dev/naru`, Pages 미활성화(`has_pages=false`), 홈페이지 미설정 | GitHub 저장소 API 읽기 확인 |
| Android | `targetSdkVersion=35`, `debuggable=true`, 디버그 인증서로 서명한 APK | `mobile/android/AndroidManifest.xml`, `mobile/android/build.py` |
| Android 스토어 빌드 | 현재 빌드 스크립트는 APK를 만들며 AAB 제출 경로 없음 | `mobile/android/build.py` |
| Windows | NSIS EXE·ZIP, `signExecutable=false` | `package.json` |
| Mac | 일반 Electron DMG·ZIP, `identity=null`, MAS 빌드 설정 없음 | `package.json` |
| iOS | iOS 앱·Xcode 프로젝트·스토어 빌드 경로 없음 | 현재 프로젝트 구성과 README |
| 로그인·전달 검증 | 합성 화면 검사와 합성 쿠키 복원 검사는 통과. 실제 서비스 계정 로그인 후 전체 전달 흐름은 미검증 | `docs/preview.5-validation.md` |
| 개인정보 안내 | README에 설명은 있으나 스토어용 공개 개인정보처리방침·지원 페이지·앱 내 해당 링크는 별도 준비 필요 | 현재 파일과 메뉴 확인 |
| 이름 변경·사이드바 | 수정 계획에 기록된 예정 기능 | `docs/modification-plan.md` |

개발자 계정의 보유 여부·개인/조직 유형·심사 이력·유료 가입 상태는 이번 검토에서 확인하지 않았습니다.

## 소개 페이지: GitHub Pages 사용 판단

GitHub Pages는 저장소의 HTML·CSS·JavaScript를 게시하는 정적 웹 호스팅이며, 공개 저장소는 GitHub Free에서도 사용할 수 있습니다.[1] 현재 저장소를 그대로 사용하면 기본 주소는 `https://leemh-dev.github.io/plynt/` 형식입니다. **아직 게시된 주소가 아니며**, 나중에 별도 도메인을 연결할 수도 있습니다.

권장 구성은 다음과 같습니다.

1. **목적:** 여러 AI의 작업 화면을 오가고 글을 옮기는 수고를 줄이는 앱이라는 한 문장과 설명.
2. **대표 기능:** 작업 탭·워크스페이스 저장, 복사한 글 미리 보기·다른 탭 입력, 데스크톱 멀티뷰.
3. **화면 예시:** Android와 데스크톱 실제 앱 화면. 합성 시험 화면이면 그 사실을 표시하고 개인 대화·계정정보는 사용하지 않음.
4. **다운로드:** Android 시험 APK, Windows, Mac CPU별, Linux 버튼을 Releases 파일에 연결. 현재 서명·업데이트 제한도 설치 전에 확인할 수 있도록 안내.
5. **사용법·FAQ:** 정상 로그인, 입력칸 지정, 기존 초안 보호, 전송·생성은 사용자가 직접 수행한다는 동작 설명.
6. **지원·개인정보:** 문의/오류 제보 경로, 개인정보처리방침, 변경 기록.
7. **예정 기능:** 사이드바와 저장된 워크스페이스 이름 변경은 현재 기능과 구분.

자체 계정·결제·클라우드 동기화 서버가 없는 현재 소개 페이지에는 별도 백엔드가 필요하지 않습니다. 설치 파일을 Pages 저장소에 복제하지 않고 Releases로 연결하면 배포 위치와 체크섬을 일원화할 수 있습니다.

GitHub Pages는 온라인 사업·전자상거래·상업적 SaaS 운영용 무료 호스팅으로 사용하는 것을 제한하고, 비밀번호·카드번호 같은 민감한 거래에도 사용하지 말라고 안내합니다.[2] **현재 무료 프로젝트 소개·문서·다운로드 안내**와 **향후 유료 서비스 영업·결제·계정 운영**은 구분해야 합니다. 후자로 확대할 때는 해당 용도를 허용하는 호스팅을 다시 선택하는 편이 적절합니다.

## Android: Google Play

**등록 가능성을 검토할 가치는 있지만 현재 APK 그대로 제출하는 것은 적합하지 않습니다.** 확인된 기술적 차이는 다음과 같습니다.

- 현재 `targetSdkVersion`은 35입니다. 공식 문서상 **2026-08-31부터 일반 신규 앱·업데이트는 Android 16 / API 36 이상**을 대상으로 해야 하며, 안내된 연장일 2026-11-01도 검토일보다 이전입니다.[3] SDK 숫자를 바꾸는 것뿐 아니라 Android 16에서 실제 동작을 다시 확인해야 합니다.
- 신규 앱은 **Android App Bundle(AAB)**로 제출해야 합니다.[4] 현재 APK를 확장자만 바꿔 제출할 수는 없습니다. 스토어용 빌드·버전 관리 경로가 필요합니다.
- 현재 앱은 디버그 빌드·디버그 서명입니다. 공개 배포용 설정, 업로드 키와 Play App Signing, 키 백업·복구 및 업데이트 경로를 정해야 합니다.[5] 기존 시험판 설치에서 스토어 버전으로 이동할 때도 서명·데이터 유지 조건을 확인해야 합니다.
- 개발자 등록은 공식 안내상 **미화 25달러 일회성**입니다.[6] **2023-11-13 이후 개설한 개인 계정**이면 프로덕션 접근 신청 전에 **테스터 12명이 최소 14일 연속 참여하는 비공개 테스트**가 필요합니다.[7] 조직 계정 등 모든 계정에 동일하게 적용되는 조건은 아닙니다.
- 공개 개인정보처리방침, Data safety 신고, 지원 연락처, 콘텐츠 등급, 스크린샷과 정확한 기능 설명을 준비해야 합니다.[8][9]

정책상 주의할 핵심은 웹뷰 자체의 사용 여부보다 앱의 목적과 가치입니다. Google은 웹사이트 소유자·관리자 허가 없이 그 사이트의 웹뷰 제공을 주목적으로 하는 앱과 독자적 가치가 없는 반복 콘텐츠를 제한합니다.[10] Plynt가 제공하는 작업 저장·전환·자료 전달을 실제로 안정적으로 쓸 수 있어야 하며, 연결 서비스의 약관·표시 권한과 로그인 호환성을 별도로 확인해야 합니다. 사용자의 휴대폰 권한 허용만으로 서비스 제공자의 허용을 대신할 수는 없습니다.

## iPhone/iPad: Apple App Store

**현재는 제출할 iOS 앱이 없습니다.** Android APK나 Electron 데스크톱 파일을 그대로 iPhone용으로 올릴 수는 없습니다. iOS용 화면·탭·선택 메뉴·저장·정상 인증 흐름을 구현하고 검증해야 합니다. 서비스 목록이나 일부 JavaScript 로직은 재사용 후보지만 이식 성공을 확인한 상태는 아닙니다.

공식 심사 기준은 다음과 같습니다.[11]

- **4.2 / 4.2.2:** 재포장한 웹사이트 이상의 유용성과 앱다운 기능을 요구하고, 주로 링크 모음·웹 클리핑·콘텐츠 집계에 그치는 앱을 제한합니다.
- **2.5.6:** 웹을 탐색하는 앱은 적절한 WebKit 프레임워크를 사용하는 것이 기본입니다. 별도 대체 엔진 권한은 지역·요건에 따른 예외이며, 현재 Electron 코드를 그대로 사용한다는 근거가 아닙니다.
- **5.2.2:** 제3자 서비스 콘텐츠의 사용·접근·표시에 서비스 약관상 허용이 필요하고, 요청 시 권한 증빙을 요구할 수 있습니다.
- **5.1.1:** 공개 개인정보처리방침 링크를 App Store Connect와 앱 내부에 제공해야 합니다.

Apple Developer Program은 공식 안내상 **연 99달러**이며 지역별 가격·면제 조건은 다릅니다.[12] 현재 업로드 SDK 기준도 별도 충족해야 합니다. 공식 안내는 iOS 등에 대해 2026-04-28부터 Xcode 26 이상과 해당 26 SDK 이상을 요구합니다.[13] 가입이나 빌드 성공이 심사 통과를 보장하지는 않습니다.

따라서 지금은 iOS 스토어 출시를 약속하기보다 Android 실사용 검증 후 iOS 구현 범위와 비용을 판단하는 편이 타당합니다.

## 데스크톱 스토어

| 대상 | 판단 | 현재 파일과의 차이 |
|---|---|---|
| Microsoft Store | 기존 Windows 앱을 기반으로 준비 가능 | 현재 서명 없는 EXE는 EXE/MSI 제출 요건을 충족하지 못함. 해당 경로는 신뢰된 CA 서명, 고정된 버전별 HTTPS 다운로드 주소, 무인 설치 등이 필요. MSIX로 별도 패키징하는 경로도 검토 가능 |
| Mac App Store | Electron으로 제출하는 공식 경로는 있으나 별도 작업 필요 | MAS용 Electron 빌드, 배포 서명·프로비저닝·App Sandbox 권한 설정과 실제 동작 검증 필요. 현재 일반 DMG를 올리는 것만으로 해결되지 않음 |
| Linux | 현재 Releases 배포를 유지 가능 | 배포판별 패키지 저장소나 Flathub 등은 별도 경로. 이번에는 해당 심사·등록 조건까지 조사하지 않음 |

Microsoft의 EXE/MSI와 MSIX 요건은 서로 다릅니다. Store 제출 MSIX는 Store가 서명하는 경로가 있어, 모든 방식에 외부 코드 서명 인증서 구매가 필수라고 일반화하면 안 됩니다.[14][15]

Electron은 Mac App Store 배포를 지원하지만 일반 `darwin` 빌드는 App Sandbox에서 실행할 수 없고 MAS 빌드가 필요하다고 안내합니다.[16] 이는 Chromium/Electron의 렌더러 sandbox 옵션과 별개의 Apple 플랫폼 요구입니다. Mac에서 직접 배포할 때의 Developer ID 서명·공증과 Mac App Store 심사도 서로 다른 절차입니다.

## 개인정보·서비스 연결의 확인 범위

현재 로컬 저장·진단 원문 제외 정책은 스토어 준비에 도움이 되지만, 그것만으로 데이터 신고가 끝나는 것은 아닙니다. 워크스페이스의 URL·보관 글·쿠키, 사용자가 명시적으로 선택한 글 전달, 진단 내보내기와 제3자 페이지 이용을 구분해 설명해야 합니다.

Google Data safety 공식 문서는 앱이 코드/동작을 통제하는 웹뷰의 데이터 처리와 사용자가 공개 웹을 탐색하는 웹뷰를 구분합니다. 공개 웹 탐색에는 신고 예외가 있지만, 이를 이유로 Plynt의 입력 보조·향후 분석 SDK까지 일괄적으로 ‘데이터 수집 없음’으로 처리할 수는 없습니다.[9] 현재 동작을 기준으로 항목별 검토가 필요합니다.

이번 검토에서 47개 서비스의 약관·로고 사용 권한을 전부 확인하지 않았고, 실제 계정 로그인 시험이나 스토어 사전 심사도 하지 않았습니다. 앱 이름 변경·사이드바 추가는 UI 개선이지 심사 승인 보장은 아닙니다.

## 권장 순서

1. **소개 페이지:** GitHub Pages + 기존 Releases 링크, 현재 지원 범위와 예정 기능을 구분한 안내부터 준비.
2. **사용성 검증:** 계획된 수정과 실제 Android 기기의 로그인·자료 전달·저장 복원 확인. 그 결과로 스토어 설명과 지원 서비스 범위를 확정.
3. **첫 모바일 스토어:** 기존 Android 코드를 활용해 Google Play용 정식 빌드·서명·정책 자료와 계정 유형별 테스트 준비.
4. **데스크톱:** 직접 다운로드 경로를 유지하면서 Windows Store를 검토하고, Mac은 직접 배포 서명·공증과 MAS 중 적합한 경로를 선택.
5. **iOS:** Android 실사용 결과를 보고 별도 개발 여부 판단.

소개 페이지는 현재 앱을 설명하고 시험 사용자를 안내할 수 있는 단계입니다. 스토어는 위 준비가 필요하며, 승인 가능성을 확률로 단정하거나 모든 AI 서비스 지원을 약속할 근거는 아직 없습니다.

## 공식 출처

1. [GitHub Pages 개요](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
2. [GitHub Pages 사용 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
3. [Google Play 대상 API 기준](https://support.google.com/googleplay/android-developer/answer/11926878?hl=ko), [Android Developers 교차 확인](https://developer.android.com/google/play/requirements/target-sdk)
4. [Android App Bundle 안내](https://developer.android.com/guide/app-bundle)
5. [Android 앱 서명·디버그 인증서 제한](https://developer.android.com/studio/publish/app-signing)
6. [Google Play 개발자 등록](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
7. [신규 개인 계정 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
8. [Google Play 사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
9. [Data safety와 WebView 범위](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
10. [Google Play Webviews and Affiliate Spam](https://support.google.com/googleplay/android-developer/answer/9899034?hl=en)
11. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
12. [Apple Developer Program 등록·요금](https://developer.apple.com/programs/enroll/)
13. [Apple 제출 요구사항](https://developer.apple.com/news/upcoming-requirements/)
14. [Microsoft Store EXE/MSI 제출 요건](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements)
15. [MSIX 서명과 Store 배포](https://learn.microsoft.com/en-us/windows/msix/package/signing-package-overview)
16. [Electron Mac App Store 제출 안내](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide)

Google API 기준의 영문 도움말 URL은 이번 가져오기에서 본문이 반환되지 않아, 한국어 공식 도움말과 Android Developers 공식 페이지를 교차 확인했습니다. 계정 전용 Play Console/App Store Connect 내부 설정은 확인하지 않았습니다.
