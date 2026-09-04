# Vercel / TypeScript Typecheck Investigation

기준일: 2026-09-04

## 현상

Vercel Preview/Production 빌드에서 각 Serverless Function 빌드 시 다음 진단이 반복된다.

```text
TS2688: Cannot find type definition file for 'node'.
The file is in the program because:
Entry point of type library 'node' specified in compilerOptions
```

현재 `tsconfig.json`에는 다음 설정이 있다.

```json
"types": ["node"]
```

`@types/node`는 현재 `devDependencies`에 있다.

Vercel은 이 TypeScript 진단을 출력하면서도 기존 배포는 `READY`로 완료하고 있다. 즉 런타임 장애는 아니지만 빌드 계약이 깨끗하지 않다.

## 1차 가설

Vercel의 개별 Function 빌드 단계에서 `@types/node`가 devDependency로만 존재해 타입 라이브러리 탐색에 실패하는 것으로 보인다.

## 1차 실험

`@types/node`를 `dependencies`로 이동하는 변경을 Preview에서 시험했다.

결과:

- package.json만 변경한 상태에서는 `ERR_PNPM_OUTDATED_LOCKFILE`로 설치 실패
- 원인은 Vercel CI의 frozen-lockfile 모드에서 package.json과 pnpm-lock.yaml importer가 불일치했기 때문
- 해당 실험 브랜치는 master 기준으로 되돌렸으며 production에는 영향 없음

## 다음 수정안

`@types/node`를 dependencies로 이동하려면 반드시 아래 두 파일을 같이 변경한다.

1. `package.json`
2. `pnpm-lock.yaml`

lockfile importer에서:

```yaml
dependencies:
  '@types/node':
    specifier: ^26.4.1
    version: 26.4.1
```

으로 이동하고 기존 devDependencies 항목에서는 제거한다.

그 뒤 검증 순서:

1. Vercel Preview install 성공
2. build log에서 `TS2688` 제거 확인
3. Preview `READY` 확인
4. 기존 Discord MCP / GPT Actions endpoints smoke check
5. PR merge
6. Production build log 재확인

## 현재 상태

`IN PROGRESS`

Production은 기존 정상 커밋을 사용하고 있으며, Jira/Discord 기능에는 영향이 없다.
