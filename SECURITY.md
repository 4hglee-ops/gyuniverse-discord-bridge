# Security Policy

Gyuniverse Discord Bridge는 Discord 대화를 AI가 읽고 검색할 수 있도록 연결하는 **Read-only Bridge**입니다. 공개 저장소와 실제 운영 환경을 분리하고, Secret과 Workspace-specific data를 코드 밖에서 관리하는 것을 기본 원칙으로 합니다.

## Secrets

다음 값은 Git repository에 커밋하지 않습니다.

```text
DISCORD_BOT_TOKEN
MCP_SHARED_SECRET
MCP_OAUTH_TEAM_CODE
MCP_OAUTH_SIGNING_SECRET
GPT_ACTIONS_API_KEY
배포 플랫폼 Credential
```

실제 값은 환경변수 또는 배포 플랫폼의 encrypted secret store를 사용해 관리하세요.

## 운영 환경 권장사항

- Static bearer 인증에는 전용 `MCP_SHARED_SECRET` 사용
- OAuth approval에는 별도 `MCP_OAUTH_TEAM_CODE` 사용
- OAuth / Checkpoint 서명에는 별도 고엔트로피 `MCP_OAUTH_SIGNING_SECRET` 사용
- 위 Secret 값을 서로 재사용하지 않기
- Discord Bot에는 필요한 최소 Guild / Channel Read 권한만 부여
- Bridge는 기본적으로 Read-only로 유지
- Write capability를 추가하려면 별도 설계·리뷰·권한 검증 과정을 거치기
- Secret 노출이 의심되면 즉시 폐기하고 새 값으로 rotation

## Public Repository Boundary

이 공개 저장소에는 다음 정보를 포함하지 않습니다.

- Production Workspace Identity
- 실제 팀 Decision Record
- Private Discord message
- Jira account ID
- Production endpoint credential
- Access / Refresh token
- 배포 Secret

실제 Workspace-specific data는 Private configuration 또는 별도 Private repository에서 관리하세요.

## Checkpoint / OAuth Token 주의사항

Signed checkpoint token과 OAuth envelope은 무결성을 검증하기 위한 용도입니다. **암호화 저장소가 아닙니다.**

따라서 다음 값을 checkpoint state나 문서 예시에 포함하지 마세요.

- Password
- API key
- Bearer credential
- OAuth token
- Discord Bot token
- 기타 민감한 raw message content

## Security Issue Reporting

보안 문제가 발견된 경우 실제 Credential, exploit detail, 민감한 재현 정보를 Public Issue에 게시하지 마세요.

가능하면 repository owner에게 비공개 방식으로 먼저 전달하고, Credential 노출이 의심되는 경우에는 보고와 동시에 관련 Secret을 rotation하는 것을 권장합니다.
