/**
 * MoodWeather 프로토타입 핵심 로직 엔진 v2.5.2
 */

// 카카오 SDK 초기화 예외 처리
try {
    Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY_HERE');
} catch(e) {
    console.log("카카오 샌드박스 가상 런타임 진입");
}

// 100가지 기분 위로 문구 아카이브 데이터
const quoteDatabase = {
    '지침': [
        "지친 하루의 끝에는 항상 내가 서있을게요.", "오늘 하루도 버텨내느라 정말 고생 많았어요.",
        "가끔은 아무것도 하지 않고 숨을 골라도 괜찮아요.", "지친 당신의 어깨 위에 따스한 햇살이 내려앉기를.",
        "애쓰지 않아도 돼요. 당신은 이미 충분히 잘해내고 있으니까.", "잠시 멈춰 서서 무거운 짐을 내려놓으세요.",
        "완벽하지 않아도 괜찮아요. 지친 숨을 가다듬어요 우리.", "지나간 오늘에게 미련을 두지 말고 편히 쉬어요.",
        "지친 마음에 포근한 담요를 덮어줄게요.", "한 걸음 늦어도 괜찮으니, 무리하지 말아요.",
        "오늘의 피로가 내일의 걸림돌이 되지 않도록 푹 쉬어봐요.", "당신의 수고를 내가 가장 잘 알고 있어요.",
        "토닥토닥, 오늘 하루도 참 장하다 우리 포근이.", "아무 생각 없이 깊은 잠에 빠져들어도 좋은 밤이에요.",
        "당신의 지친 하루 끝에 작은 온기가 닿기를 바래요.", "쉬어가는 것은 멈추는 것이 아니라 준비하는 거예요.",
        "마음이 방전되었다면, 오늘은 온전히 자신만을 위해 써요.", "숨이 차오를 땐 잠시 멈춰 하늘을 봐요.",
        "오늘 하루 흘린 땀방울이 예쁜 꽃으로 피어날 거예요.", "더 잘하려고 하지 마요. 지금도 충분히 빛나요."
    ],
    '불안함': [
        "일어나지 않은 일로 오늘의 나를 괴롭히지 말아요.", "불안이라는 구름 뒤엔 언제나 맑은 하늘이 숨어있어요.",
        "천천히 숨을 들이쉬고 내쉬어봐요. 당신은 안전해요.", "모든 것이 다 잘 될 거예요. 걱정의 무게를 덜어내요.",
        "불안한 마음이 들 땐 귀여운 것만 생각하기로 해요 우리.", "당신의 속도대로 걸어가면 돼요. 조급해 마요.",
        "흔들려도 괜찮아요. 깊게 뿌리내리는 중이니까요.", "어둠 속에서도 당신이라는 별은 길을 잃지 않아요.",
        "그 어떤 파도도 당신을 무너뜨릴 수는 없답니다.", "지금의 걱정들은 눈 녹듯 스르르 사라질 거예요.",
        "마음의 소란을 잠재울 수 있는 평화가 찾아오기를.", "불안해하는 당신의 손을 꼭 잡아주고 싶어요.",
        "너무 많은 생각은 마음을 다치게 해요. 단순해져 봐요.", "당신은 생각보다 훨씬 더 강하고 단단한 사람이에요.",
        "한 치 앞이 보이지 않아도 당신의 내일은 밝을 거예요.", "걱정 한 조각, 위로 한 스푼에 모두 녹여 보낼게요.",
        "스스로를 믿어봐요. 당신은 언제나 이겨냈잖아요.", "불안함은 잠시 머무는 손님일 뿐, 곧 떠날 거예요.",
        "따뜻한 온기가 당신의 떨리는 마음을 감싸안아 주기를.", "길을 헤매는 시간조차 나중엔 아름다운 여정이 돼요."
    ],
    '평온함': [
        "잔잔한 호수처럼 평온한 지금 이 순간을 만끽해요.", "바람에 살랑이는 나뭇잎처럼 마음이 평화롭네요.",
        "따뜻한 차 한 잔에 마음의 평온을 담아 보냅니다.", "이 고요함이 당신의 지친 영혼을 치유해주기를.",
        "평온함 속에서 비로소 진정한 나를 마주하게 돼요.", "아무런 걱정 없는 오늘, 참 감사하고 소중해요.",
        "맑은 하늘을 닮은 당신의 마음이 오래 지속되길.", "소소하고 조용한 일상 속에 숨어있는 행복을 찾아요.",
        "마음의 서랍을 정리하고 아늑함을 가득 채워 넣어요.", "따사로운 햇볕 아래 나른한 고양이처럼 평화롭게.",
        "오늘 하루는 강물처럼 흘러가는 대로 두어도 좋아요.", "마음에 잔잔한 미소가 번지는 편안한 시간이에요.",
        "욕심을 비워내니 비로소 평온함이 찾아오네요.", "지금 이 부드러운 공기를 온전히 느껴보세요.",
        "내면의 고요함이 외면의 소음을 모두 잊게 해주길.", "가장 편안한 자세로 숨을 쉬어봐요. 참 좋네요.",
        "바람이 달콤하고 햇살이 포근한, 완벽한 평온함이에요.", "당신의 소박한 평화가 깨어지지 않기를 기도해요.",
        "차분하게 가라앉은 마음이 참 귀하고 예깝니다.", "그저 흘러가는 대로, 마음을 편히 내려놓으세요."
    ],
    '기분 좋음': [
        "당신의 밝은 미소가 주변을 온통 환하게 만들어요.", "오늘처럼 기분 좋은 에너지가 매일 가득하기를!",
        "두 뺨에 스치는 바람마저 기분 좋게 속삭이는 날씨예요.", "하늘을 날아갈 것 같은 이 기분을 다이어리에 적어봐요.",
        "오늘 하루는 당신이 세상의 주인공이 된 것만 같아요.", "콧노래가 절로 나오는 싱그러운 하루의 시작이네요.",
        "행복은 멀리 있지 않아요. 바로 지금 당신의 미소 속에 있어요.", "기분 좋은 설렘이 가슴속 가득 피어나는 날이군요.",
        "달콤한 솜사탕을 닮은 하루를 선물할게요.", "당신의 긍정적인 기운이 나에게도 전해져 행복해요.",
        "반짝반짝 빛나는 오늘을 마음껏 즐기세요!", "웃음소리가 끊이지 않는 마법 같은 하루가 될 거예요.",
        "행운의 요정이 오늘 온종일 당신 곁을 맴돌 예정이에요.", "발걸음 가볍게, 가고 싶은 곳 어디든 떠나봐요.",
        "당신의 좋은 기분이 주변의 모든 슬픔을 이겨낼 거예요.", "오늘의 행복한 순간을 마음속 보물상자에 꼭 넣어두세요.",
        "좋은 생각만 하니 정말 좋은 일만 일어나는 날이네요.", "햇살마저 당신의 행복을 축하해주는 것 같아요.",
        "매일이 오늘 같기를, 당신의 기분 좋은 하루를 응원해요.", "싱글벙글, 웃는 모습이 가장 예쁜 당신이랍니다."
    ],
    '집중 필요': [
        "한 번에 하나씩 차근차근 해내면 돼요. 서두르지 마요.", "당신의 작은 노력이 모여 거대한 기적을 만들 거예요.",
        "지금 이 순간의 몰입이 더 멋진 내일을 선물할 거예요.", "주변의 소음은 잠시 끄고, 내면의 소리에 집중해봐요.",
        "연필 끝에 묻어나는 열정이 참 아름답게 느껴집니다.", "흩어진 마음의 조각들을 하나로 모을 시간이에요.",
        "당신의 가능성을 믿어요. 끝까지 힘을 내봐요 우리.", "조금씩 나아가는 발걸음이 결국 목적지에 닿게 해줄 거예요.",
        "지금 투자하는 이 시간이 결코 헛되지 않을 것임을 믿어요.", "깊은 몰입 속에서 숨겨진 당신의 능력을 발견해보세요.",
        "생각을 정리하고, 오롯이 눈앞의 한 걸음에만 집중해요.", "지치지 않는 끈기가 당신의 가장 큰 무기랍니다.",
        "오늘 뿌린 집중의 씨앗이 내일 창대한 열매를 맺을 거예요.", "마음을 가다듬고 정돈된 호흡으로 시작해볼까요?",
        "누가 뭐라 해도 당신의 길은 가치 있어요. 몰입하세요.", "포기하지 않고 나아가는 뚝심이 참 멋진 사람.",
        "잡념은 잠시 서랍 속에 넣어두고 칠판을 보듯 집중해요.", "시작이 반이에요. 이미 절반은 멋지게 성공한 셈이죠.",
        "당신의 집중하는 눈빛 속에서 무한한 미래가 보여요.", "한 걸음씩 밀고 나아가다 보면 어느새 끝이 보일 거예요."
    ]
};

const screenOrder = ['view-home', 'view-mood', 'view-quote', 'view-settings'];
let activeQuoteGlobal = "완벽한 하루가 아니어도 괜찮아요.";

/**
 * 선언적 화면 슬라이딩 모션 컨트롤러
 */
function navTo(targetScreenId) {
    const currentActiveScreen = document.querySelector('.app-screen.active');
    if (!currentActiveScreen || currentActiveScreen.id === targetScreenId) return;

    const targetIndex = screenOrder.indexOf(targetScreenId);
    
    screenOrder.forEach((screenId) => {
        const screenEl = document.getElementById(screenId);
        if (!screenEl) return;

        if (screenId === targetScreenId) {
            screenEl.className = 'app-screen active';
        } else {
            const thisIndex = screenOrder.indexOf(screenId);
            screenEl.className = thisIndex < targetIndex ? 'app-screen previous' : 'app-screen next';
        }
    });

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navId = Object.keys({ 'nav-home': 'view-home', 'nav-mood': 'view-mood', 'nav-quote': 'view-quote', 'nav-settings': 'view-settings' }).find(key => {
        return { 'nav-home': 'view-home', 'nav-mood': 'view-mood', 'nav-quote': 'view-quote', 'nav-settings': 'view-settings' }[key] === targetScreenId;
    });
    if (navId) document.getElementById(navId).classList.add('active');
}

/**
 * 감정 버튼 선택 로직
 */
function selectMood(moodName) {
    const quotes = quoteDatabase[moodName];
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const selectedQuote = quotes[randomIndex];

    activeQuoteGlobal = selectedQuote;
    document.getElementById('detail-quote-display').innerHTML = `[${moodName}] <br><br> "${selectedQuote}"`;
    document.getElementById('home-quote-text').innerText = `“${selectedQuote}”`;

    setTimeout(() => { navTo('view-quote'); }, 200);
}

/**
 * 카카오톡 공유 핸들러
 */
function shareKakao() {
    const userName = localStorage.getItem('moodweather_name') || "포근이";
    if (typeof Kakao !== 'undefined' && Kakao.isInitialized()) {
        Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: '📋 MoodWeather 감성 위로 배달',
                description: `"${activeQuoteGlobal}" - ${userName}님이 보낸 메시지`,
                imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400',
                link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
            },
        });
    } else {
        alert(`💬 [카카오톡 공유 프로토타입 전송]\n\n"${activeQuoteGlobal}"`);
    }
}

/**
 * 이름 변경 보관함 연동
 */
function saveName() {
    const nameInput = document.getElementById('name-input').value.trim();
    const finalName = nameInput || "포근이";

    localStorage.setItem('moodweather_name', finalName);
    document.getElementById('user-display-name').innerText = finalName;
    
    alert(`반가워요, ${finalName}님! 이름 데이터가 기억되었습니다.`);
    navTo('view-home');
}

/**
 * 테마색 변경 인프라
 */
function changeTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('moodweather_theme', themeName);

    document.querySelectorAll('.theme-opt').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.theme-opt.${themeName}`);
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * 글꼴 스케일 크기 제어
 */
function changeFontSize(sizeName) {
    document.body.setAttribute('data-fontsize', sizeName);
    localStorage.setItem('moodweather_fontsize', sizeName);

    document.querySelectorAll('.font-opt').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`font-${sizeName}`).classList.add('active');
}

/**
 * 라이프사이클 복원 스크립트
 */
document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('moodweather_name') || "포근이";
    document.getElementById('name-input').value = savedName === "포근이" ? "" : savedName;
    document.getElementById('user-display-name').innerText = savedName;

    const savedTheme = localStorage.getItem('moodweather_theme') || "default";
    changeTheme(savedTheme);

    const savedFontSize = localStorage.getItem('moodweather_fontsize') || "medium";
    changeFontSize(savedFontSize);
});