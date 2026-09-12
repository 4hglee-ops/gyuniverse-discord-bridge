# Decision Baseline 예시

이 공개 저장소에는 실제 팀 데이터가 아니라 **fictional example data**만 포함되어 있습니다.

Decision Baseline은 이미 확정된 결정을 새로운 근거가 나오기 전까지 유지하기 위한 기준선입니다. Discord에 더 최근 메시지가 있다는 이유만으로 기존 결정을 자동으로 뒤집지 않습니다.

## 예시

### Confirmed

- 개발 workflow: `Work item → branch → commit → pull request → review → merge → done`

### Open

- Iteration 길이: `1주` 또는 `2주`

## 해석 규칙

- 최근에 관련 대화가 없다는 이유만으로 확정 결정을 취소하지 않습니다.
- 더 최근 메시지가 있다는 이유만으로 기존 결정을 supersede하지 않습니다.
- Proposal은 confirmed decision이 아닙니다.
- 결정이 확정되었다는 사실과 실제 구현이 완료되었다는 사실은 다릅니다.
- 변경 근거가 불명확하면 기존 confirmed decision을 유지하고 상태를 `unclear`로 두는 편이 안전합니다.

## 실제 Workspace에 적용할 때

공개 버전의 예시 기준선:

```text
src/context/decision-baseline.ts
docs/DECISION_BASELINE.example.md
```

실제 사용 시에는 `src/context/decision-baseline.ts`의 예시 데이터를 본인의 검증된 Workspace 데이터로 교체하거나, 비공개 configuration source에서 Decision Baseline을 불러오는 방식을 권장합니다.

실제 팀원의 Identity, 내부 결정사항, 비공개 Issue/Jira 정보는 Public repository에 직접 넣지 마세요.
