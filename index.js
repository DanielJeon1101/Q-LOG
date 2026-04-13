const functions = require('firebase-functions');
const fetch     = require('node-fetch');

exports.geminiProxy = functions
    .region('asia-northeast3')          // 서울 리전
    .https.onCall(async (data, context) => {

        // 로그인 유저만 허용
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
        }

        const { text, mood } = data;
        if (!text || text.trim().length < 5) {
            throw new functions.https.HttpsError('invalid-argument', '일기 내용이 너무 짧습니다.');
        }

        // API 키는 Firebase 환경 변수에서 읽음 (코드에 없음)
        const API_KEY = process.env.GEMINI_API_KEY;
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const crisisKws = ['자살','자해','죽고싶','끝내고싶'];
        if (crisisKws.some(kw => text.includes(kw))) {
            return { question: '오늘도 수고했어요. 힘들면 마음이음 1577-0199 💙', isCrisis: true };
        }

        const prompt = `당신은 따뜻한 일기 코치입니다. 아래 단계를 순서대로 생각한 뒤 최종 질문만 출력하세요.

[일기]
${text}

[생각 단계 - 출력 금지]
1단계: 감정이 가장 실린 핵심 사건을 찾는다.
2단계: 필자가 아직 말하지 않은 부분을 파악한다.
3단계: 그 빈칸을 채우도록 유도하는 열린 질문을 만든다.

[출력 규칙]
질문 한 문장만. "?" 로 끝낼 것. 다른 텍스트 금지.`;

        const res  = await fetch(URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.75, maxOutputTokens: 80 }
            })
        });

        const json = await res.json();
        const question = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return { question: question || '오늘 하루 중 가장 기억에 남는 순간은 무엇인가요?' };
    });