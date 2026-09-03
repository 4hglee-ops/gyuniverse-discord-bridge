const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gyuniverse Discord Assistant - 개인정보 보호 정책</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { max-width: 760px; margin: 0 auto; padding: 48px 24px 72px; line-height: 1.7; }
    h1 { line-height: 1.25; }
    h2 { margin-top: 2rem; }
    code { padding: .12rem .35rem; border-radius: .3rem; background: rgba(127,127,127,.14); }
    .muted { opacity: .7; }
  </style>
</head>
<body>
  <h1>Gyuniverse Discord Assistant 개인정보 보호 정책</h1>
  <p class="muted">최종 업데이트: 2026-09-03</p>

  <p>Gyuniverse Discord Assistant는 사용자가 명시적으로 요청할 때 설정된 Discord 서버의 정보를 읽어 ChatGPT에서 정리·요약할 수 있도록 하는 읽기 전용 도구입니다.</p>

  <h2>1. 처리하는 정보</h2>
  <p>요청을 처리하기 위해 Discord API에서 다음 정보를 일시적으로 가져올 수 있습니다.</p>
  <ul>
    <li>서버 및 텍스트 채널의 ID와 이름</li>
    <li>요청한 채널의 최근 메시지 내용</li>
    <li>메시지 작성자 ID와 표시 이름</li>
    <li>메시지 작성 시각</li>
    <li>첨부파일의 이름, URL, 콘텐츠 유형 등 메타데이터</li>
  </ul>

  <h2>2. 사용 목적</h2>
  <p>위 정보는 사용자가 요청한 Discord 채널의 최근 대화를 조회하고, 논의사항·결정사항·후속 작업 등을 ChatGPT가 이해하고 정리할 수 있도록 하기 위해 사용됩니다.</p>

  <h2>3. 저장 및 보관</h2>
  <p>이 브리지의 애플리케이션 코드는 Discord 메시지 내용을 별도 데이터베이스에 의도적으로 저장하지 않습니다. 요청 시 Discord에서 데이터를 가져와 응답한 뒤 처리 흐름이 종료됩니다. 다만 Vercel, Discord, OpenAI 등 사용 중인 외부 서비스는 각자의 정책에 따라 요청 메타데이터나 서비스 로그를 처리할 수 있습니다.</p>

  <h2>4. 인증 및 접근</h2>
  <p>GPT Actions API와 MCP 엔드포인트는 각각 별도의 비밀 인증값으로 보호됩니다. Discord Bot Token과 API 키는 서버 측 환경변수로 관리되며 클라이언트 응답에 노출하도록 설계되어 있지 않습니다.</p>

  <h2>5. Discord 권한</h2>
  <p>현재 버전은 읽기 전용이며 Discord의 채널 조회와 메시지 기록 조회를 위해 필요한 최소 권한만 사용합니다. 메시지 작성·수정·삭제 기능은 제공하지 않습니다.</p>

  <h2>6. 제3자 서비스</h2>
  <p>서비스 제공 과정에서 Discord API, Vercel 및 ChatGPT/OpenAI가 사용됩니다. 각 서비스의 데이터 처리는 해당 제공자의 정책이 적용될 수 있습니다.</p>

  <h2>7. 정책 변경</h2>
  <p>검색, 스레드, 첨부파일 처리 또는 쓰기 기능 등 새로운 기능이 추가되어 데이터 처리 방식이 달라질 경우 이 정책을 함께 업데이트합니다.</p>

  <h2>8. 문의</h2>
  <p>이 도구의 데이터 처리나 접근 권한에 대한 문의는 Gyuniverse Discord Assistant 운영자에게 문의해 주세요.</p>
</body>
</html>`;

export function GET(): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
