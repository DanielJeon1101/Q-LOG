// ═══════════════════════════════════════════════════════════════════
//  Q-Log New Feature Module
//  1. 연속 기록 스트릭 (Streak)
//  2. 배지 시스템 (Badge System)
//  3. 감정 식물 키우기 (Emotion Plant)
//  4. 하루 요약 한 줄 (Daily Summary)
// ═══════════════════════════════════════════════════════════════════

window.QLogFeatures = (function() {

    // ─── 스트릭 계산 ───────────────────────────────────────────────
    function calcStreak(logs) {
        if (!logs || logs.length === 0) return { current: 0, longest: 0, todayDone: false };

        const uniqueDays = new Set();
        logs.forEach(l => {
            const d = l.date instanceof Date ? l.date : new Date(l.date);
            uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });

        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const todayDone = uniqueDays.has(todayKey);

        // 연속일 계산
        let current = 0;
        const checkDate = new Date();
        if (!todayDone) checkDate.setDate(checkDate.getDate() - 1);

        while (true) {
            const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
            if (!uniqueDays.has(key)) break;
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // 최장 기록
        const sortedDays = [...uniqueDays].map(k => {
            const [y, m, d] = k.split('-').map(Number);
            return new Date(y, m, d);
        }).sort((a, b) => a - b);

        let longest = 1, tempLong = 1;
        for (let i = 1; i < sortedDays.length; i++) {
            const diff = (sortedDays[i] - sortedDays[i-1]) / (1000 * 60 * 60 * 24);
            if (diff === 1) { tempLong++; longest = Math.max(longest, tempLong); }
            else tempLong = 1;
        }

        return { current, longest, todayDone };
    }

    // ─── 배지 정의 ─────────────────────────────────────────────────
    const BADGES = [
        { id: 'first',      emoji: '🌱', name: '첫 걸음',      desc: '첫 일기를 작성했어요',             check: (l, s) => l.length >= 1 },
        { id: 'day3',       emoji: '🔥', name: '3일 연속',      desc: '3일 연속 일기를 썼어요',           check: (l, s) => s.current >= 3 },
        { id: 'day7',       emoji: '⚡', name: '7일 연속',      desc: '7일 연속! 대단해요',               check: (l, s) => s.current >= 7 },
        { id: 'day30',      emoji: '💎', name: '30일 연속',     desc: '30일 연속의 전설!',                check: (l, s) => s.current >= 30 },
        { id: 'count10',    emoji: '📚', name: '10개의 이야기', desc: '일기 10개를 작성했어요',           check: (l, s) => l.length >= 10 },
        { id: 'count50',    emoji: '📖', name: '50개의 이야기', desc: '일기 50개를 작성했어요',           check: (l, s) => l.length >= 50 },
        { id: 'count100',   emoji: '🏆', name: '100개의 이야기',desc: '일기 100개! 레전드!',             check: (l, s) => l.length >= 100 },
        { id: 'allMood',    emoji: '🌈', name: '감정 마스터',   desc: '6가지 감정을 모두 기록했어요',     check: (l, s) => new Set(l.map(x=>x.mood)).size >= 6 },
        { id: 'longWrite',  emoji: '✍️', name: '장편 작가',    desc: '500자 이상의 일기를 썼어요',       check: (l, s) => l.some(x => x.text && x.text.length >= 500) },
        { id: 'nightOwl',   emoji: '🦉', name: '야행성 작가',   desc: '자정~오전 6시 사이에 일기를 썼어요', check: (l, s) => l.some(x => { const h = new Date(x.date).getHours(); return h >= 0 && h < 6; }) },
        { id: 'happy10',    emoji: '😀', name: '행복 전도사',   desc: '행복 일기를 10번 썼어요',          check: (l, s) => l.filter(x=>x.mood==='😀').length >= 10 },
        { id: 'longest',    emoji: '🎯', name: '최장 기록',     desc: '최장 연속 기록을 세웠어요',        check: (l, s) => s.longest >= 7 },
        { id: 'tagger',     emoji: '🏷️','name': '태그 달인',   desc: '태그를 10번 이상 사용했어요',     check: (l, s) => l.filter(x => x.tags && x.tags.length > 0).length >= 10 },
    ];

    function getEarnedBadges(logs, streak) {
        return BADGES.filter(b => b.check(logs, streak));
    }

    function getNewBadges(logs, streak, uid) {
        const key = `qlog_badges_${uid}`;
        const prev = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
        const earned = getEarnedBadges(logs, streak);
        const newOnes = earned.filter(b => !prev.has(b.id));
        if (newOnes.length > 0) {
            const allIds = earned.map(b => b.id);
            localStorage.setItem(key, JSON.stringify(allIds));
        }
        return newOnes;
    }

    // ─── 감정 식물 상태 계산 ──────────────────────────────────────
    const PLANT_STAGES = [
        { level: 0,  emoji: '🌰', name: '씨앗',     desc: '아직 싹이 트지 않았어요' },
        { level: 1,  emoji: '🌱', name: '새싹',     desc: '작은 싹이 돋아났어요!' },
        { level: 2,  emoji: '🪴', name: '화분',     desc: '잎이 하나 생겼어요' },
        { level: 3,  emoji: '🌿', name: '초록잎',   desc: '무럭무럭 자라고 있어요' },
        { level: 4,  emoji: '🌾', name: '풀숲',     desc: '건강하게 자라고 있어요!' },
        { level: 5,  emoji: '🌸', name: '꽃봉오리', desc: '꽃이 피려 하고 있어요!' },
        { level: 6,  emoji: '🌺', name: '만개',     desc: '아름다운 꽃이 피었어요!' },
        { level: 7,  emoji: '🌳', name: '나무',     desc: '튼튼한 나무가 되었어요!' },
        { level: 8,  emoji: '🌲', name: '큰 나무',  desc: '숲의 주인이 되었어요!' },
        { level: 9,  emoji: '🏔️', name: '신목',    desc: '전설의 나무! 엄청나요!' },
    ];

    const MOOD_SCORE = { '😀': 3, '🙂': 2, '😐': 0, '😢': -1, '😡': -2, '😫': -1 };

    function calcPlant(logs) {
        if (!logs || logs.length === 0) return { stage: PLANT_STAGES[0], score: 0, trend: 'neutral' };

        // 최근 30일 기록 기반으로 점수 계산
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const recent = logs.filter(l => l.date >= cutoff);

        let score = 0;
        recent.forEach(l => {
            score += (MOOD_SCORE[l.mood] || 0);
            score += 1; // 작성 자체에 +1
        });

        // 연속 기록 보너스
        const streak = calcStreak(logs);
        score += Math.min(streak.current * 2, 20);

        // 점수를 0~100 범위로 정규화
        const normalized = Math.max(0, Math.min(100, score * 2 + 30));
        const stageIdx = Math.min(Math.floor(normalized / 11), PLANT_STAGES.length - 1);

        // 최근 3일 트렌드
        const last3 = logs.slice(0, 3);
        const trendScore = last3.reduce((s, l) => s + (MOOD_SCORE[l.mood] || 0), 0);
        const trend = trendScore > 0 ? 'growing' : trendScore < -2 ? 'wilting' : 'neutral';

        return { stage: PLANT_STAGES[stageIdx], score: normalized, trend };
    }

    // ─── 하루 요약 저장/불러오기 ────────────────────────────────
    function saveDailySummary(uid, text, date) {
        const key = `qlog_summary_${uid}`;
        const all = JSON.parse(localStorage.getItem(key) || '{}');
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        all[dateKey] = { text, ts: Date.now() };
        localStorage.setItem(key, JSON.stringify(all));
    }

    function getDailySummary(uid, date) {
        const key = `qlog_summary_${uid}`;
        const all = JSON.parse(localStorage.getItem(key) || '{}');
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return all[dateKey] || null;
    }

    function getAllSummaries(uid) {
        const key = `qlog_summary_${uid}`;
        return JSON.parse(localStorage.getItem(key) || '{}');
    }

    return { calcStreak, BADGES, getEarnedBadges, getNewBadges, PLANT_STAGES, calcPlant, saveDailySummary, getDailySummary, getAllSummaries };

})();