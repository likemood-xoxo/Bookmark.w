// 💌 BookMark.w — SillyTavern Extension
import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const extensionName = 'bookmark-w';
const defaultSettings = {
    bgStyle: 'parchment',
    showCharName: true,
    personaNames: [],
    textAlign: 'center',
    textColor: 'dark',
};

jQuery(async () => {
    loadSettings();
    injectSelectionButton();
    attachSelectionListener();
});

function loadSettings() {
    extension_settings[extensionName] = Object.assign({}, defaultSettings, extension_settings[extensionName]);
    if (!Array.isArray(extension_settings[extensionName].personaNames))
        extension_settings[extensionName].personaNames = [];
}
function S() { return extension_settings[extensionName]; }

function maskPersonaNames(text) {
    let r = text;
    (S().personaNames || []).forEach(name => {
        if (!name) return;
        const e = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        r = r.replace(new RegExp(e, 'g'), '{{user}}');
    });
    return r;
}

// ── Selection button ──────────────────────────────────────────────────────────
let selBtn = null;

function injectSelectionButton() {
    selBtn = document.createElement('div');
    selBtn.id = 'bmw-sel-btn';
    selBtn.style.cssText = [
        'position:fixed', 'z-index:2147483647', 'display:none',
        'pointer-events:auto', 'line-height:1', 'font-size:20px', 'cursor:pointer',
        'filter:drop-shadow(0 2px 8px rgba(0,0,0,0.7))',
        '-webkit-tap-highlight-color:transparent', 'touch-action:manipulation',
        'user-select:none', '-webkit-user-select:none',
    ].join(';');
    selBtn.textContent = '📖';
    selBtn.addEventListener('click', onTriggerClick);
    selBtn.addEventListener('touchend', (e) => { e.preventDefault(); onTriggerClick(); });
    document.documentElement.appendChild(selBtn);
}

let selectedText = '';
let selectedCharName = '';
let selTimer = null, hideTimer = null;

function attachSelectionListener() {
    document.addEventListener('selectionchange', () => {
        clearTimeout(selTimer);
        const text = window.getSelection()?.toString().trim() || '';
        if (text.length >= 5) {
            selTimer = setTimeout(tryShowButton, 800);
        } else {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                if (!window.getSelection()?.toString().trim()) selBtn.style.display = 'none';
            }, 400);
        }
    });
    document.addEventListener('mouseup', (e) => {
        if (e.target === selBtn) return;
        clearTimeout(selTimer);
        selTimer = setTimeout(tryShowButton, 80);
    });
}

function tryShowButton() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() || '';
    if (text.length < 5) { selBtn.style.display = 'none'; return; }
    const node = sel.focusNode || sel.anchorNode;
    const mes = node?.parentElement?.closest?.('.mes');
    selectedCharName = mes
        ? (mes.querySelector('.name_text')?.textContent?.trim() || mes.getAttribute('ch_name') || '') : '';
    selectedText = text;
    let x = window.innerWidth / 2, y = 300;
    try {
        const rects = sel.getRangeAt(0).getClientRects();
        if (rects.length) { x = rects[rects.length-1].right; y = rects[rects.length-1].bottom; }
    } catch(_) {}
    const size = 28;
    const px = Math.min(Math.max(x - size/2, 4), window.innerWidth - size - 4);
    const py = Math.min(y + 52, window.innerHeight - size - 8);
    selBtn.style.left = px + 'px';
    selBtn.style.top  = py + 'px';
    selBtn.style.display = 'block';
}

function onTriggerClick() {
    selBtn.style.display = 'none';
    openModal(maskPersonaNames(selectedText), maskPersonaNames(selectedCharName));
}

// ── Unsplash ──────────────────────────────────────────────────────────────────
const UNSPLASH_KEY = 'tBSCqbCHDM_3mFMfRhfmKBHbWpBr7KBxKxJGi0PEjg'; // demo key
let currentPhotoUrl = null;
let currentPhotoCredit = '';

async function fetchUnsplashPhoto(query) {
    try {
        const q = encodeURIComponent(query.slice(0, 60));
        const url = `https://api.unsplash.com/photos/random?query=${q}&orientation=portrait&client_id=${UNSPLASH_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        currentPhotoUrl = data.urls.regular;
        currentPhotoCredit = data.user.name;
        return currentPhotoUrl;
    } catch(_) {
        // fallback: picsum random portrait
        const seed = Math.floor(Math.random() * 1000);
        currentPhotoUrl = `https://picsum.photos/seed/${seed}/720/960`;
        currentPhotoCredit = 'Lorem Picsum';
        return currentPhotoUrl;
    }
}

function extractKeywords(text) {
    // 간단히 명사스러운 단어 추출 (4글자 이상 영단어 or 한글)
    const words = text.match(/[a-zA-Z]{4,}|[\uAC00-\uD7A3]{2,}/g) || [];
    const stopwords = new Set(['that','this','with','have','from','they','will','been','were','when','what','your','also','into','than','then','them','there','their','these','those','which']);
    const filtered = words.filter(w => !stopwords.has(w.toLowerCase())).slice(0, 3);
    return filtered.join(' ') || 'cinematic moody';
}

// ── Modal ─────────────────────────────────────────────────────────────────────
let modal = null;

function openModal(text, charName) {
    if (modal) modal.remove();
    const W = window.innerWidth, H = window.innerHeight;

    modal = document.createElement('div');
    Object.assign(modal.style, {
        position:'fixed', top:'0px', left:'0px',
        width: W+'px', height: H+'px',
        zIndex:'2147483647',
        background:'rgba(0,0,0,0.6)',
        backdropFilter:'none', WebkitBackdropFilter:'none',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        paddingTop:'52px', boxSizing:'border-box',
        overflow:'hidden', transform:'none', willChange:'auto',
    });
    const closeModal = () => { modal.remove(); modal = null; };
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // 팝업 카드
    const card = document.createElement('div');
    const cardW = Math.min(W - 32, 480);
    Object.assign(card.style, {
        width: cardW+'px', maxHeight: (H-72)+'px',
        overflowY:'auto', WebkitOverflowScrolling:'touch',
        background:'#1e1a16', borderRadius:'20px',
        padding:'16px 16px 28px', boxSizing:'border-box',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'12px',
        boxShadow:'0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,169,110,0.2)',
    });
    card.addEventListener('click', (e) => e.stopPropagation());

    // 닫기
    const closeBtn = mkBtn('✕', {
        alignSelf:'flex-end', background:'none', border:'none',
        color:'rgba(200,184,144,0.6)', fontSize:'18px', padding:'0 4px',
    });
    closeBtn.onclick = closeModal;
    closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeModal(); });

    // 캔버스
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
        width:'100%', height:'auto', display:'block',
        borderRadius:'12px',
        boxShadow:'0 4px 24px rgba(0,0,0,0.5)',
        flexShrink:'0',
    });

    // ── 배경 스타일 선택 ──
    const styleRow = document.createElement('div');
    Object.assign(styleRow.style, { display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center', flexShrink:'0', width:'100%' });

    const bgOptions = [
        ['parchment','양피지'],['dark','다크'],['linen','린넨'],['sage','세이지'],['unsplash','🖼'],
    ];

    function redraw() { renderCard(canvas, text, charName); }

    bgOptions.forEach(([bg, label]) => {
        const b = mkBtn(label, {
            background: bg === S().bgStyle ? 'rgba(201,169,110,0.28)' : 'rgba(255,255,255,0.08)',
            color:'#c8b890', border:'1px solid rgba(201,169,110,0.35)',
            borderRadius:'16px', padding:'6px 13px', fontSize:'13px',
        });
        const pick = async () => {
            styleRow.querySelectorAll('button').forEach(x => x.style.background = 'rgba(255,255,255,0.08)');
            b.style.background = 'rgba(201,169,110,0.28)';
            if (bg === 'unsplash') {
                // 이미 unsplash면 새 사진, 아니면 첫 로드
                b.textContent = '⏳';
                await fetchUnsplashPhoto(extractKeywords(text));
                b.textContent = '🖼';
                S().bgStyle = 'unsplash';
            } else {
                S().bgStyle = bg;
            }
            saveSettingsDebounced();
            redraw();
        };
        b.onclick = pick;
        b.addEventListener('touchend', (e) => { e.preventDefault(); pick(); });
        styleRow.appendChild(b);
    });

    // ── 옵션 행 ──
    const optRow = document.createElement('div');
    Object.assign(optRow.style, { display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', flexShrink:'0', width:'100%' });

    // 정렬
    const alignBtns = [['left','◀'],['center','■'],['right','▶']];
    alignBtns.forEach(([align, icon]) => {
        const b = mkBtn(icon, {
            background: S().textAlign === align ? 'rgba(201,169,110,0.28)' : 'rgba(255,255,255,0.08)',
            color:'#c8b890', border:'1px solid rgba(201,169,110,0.3)',
            borderRadius:'12px', padding:'6px 12px', fontSize:'13px',
        });
        b.title = align;
        const pick = () => {
            optRow.querySelectorAll('[data-type="align"]').forEach(x => x.style.background = 'rgba(255,255,255,0.08)');
            b.style.background = 'rgba(201,169,110,0.28)';
            S().textAlign = align; saveSettingsDebounced(); redraw();
        };
        b.dataset.type = 'align';
        b.onclick = pick;
        b.addEventListener('touchend', (e) => { e.preventDefault(); pick(); });
        optRow.appendChild(b);
    });

    // 구분선
    const sep = document.createElement('span');
    sep.style.cssText = 'color:rgba(201,169,110,0.3);font-size:18px;line-height:1;align-self:center;';
    sep.textContent = '|';
    optRow.appendChild(sep);

    // 글씨 색
    const colorBtns = [['dark','A','#1a1a1a','rgba(240,235,220,0.9)'],['white','A','#f0f0f0','rgba(30,26,22,0.9)']];
    colorBtns.forEach(([col, icon, fg, bg]) => {
        const b = mkBtn(icon, {
            background: S().textColor === col ? 'rgba(201,169,110,0.28)' : 'rgba(255,255,255,0.08)',
            color: fg, border:'1px solid rgba(201,169,110,0.3)',
            borderRadius:'12px', padding:'6px 14px', fontSize:'15px', fontWeight:'bold',
            textShadow: col === 'white' ? '0 0 6px rgba(0,0,0,0.8)' : 'none',
        });
        b.dataset.type = 'color';
        const pick = () => {
            optRow.querySelectorAll('[data-type="color"]').forEach(x => x.style.background = 'rgba(255,255,255,0.08)');
            b.style.background = 'rgba(201,169,110,0.28)';
            S().textColor = col; saveSettingsDebounced(); redraw();
        };
        b.onclick = pick;
        b.addEventListener('touchend', (e) => { e.preventDefault(); pick(); });
        optRow.appendChild(b);
    });

    // 화자 이름 체크박스
    const charRow = document.createElement('label');
    Object.assign(charRow.style, { display:'flex', alignItems:'center', gap:'8px', color:'#c8b890', fontSize:'13px', cursor:'pointer', flexShrink:'0' });
    const charChk = document.createElement('input');
    charChk.type='checkbox'; charChk.checked=S().showCharName;
    charChk.onchange = () => { S().showCharName = charChk.checked; saveSettingsDebounced(); redraw(); };
    charRow.appendChild(charChk);
    charRow.appendChild(document.createTextNode('화자 이름 표시'));

    // 페르소나 패널
    const personaToggle = mkBtn('⚙ 페르소나', {
        background:'rgba(201,169,110,0.10)', border:'1px solid rgba(201,169,110,0.25)',
        borderRadius:'14px', padding:'5px 12px', color:'#c9a96e', fontSize:'12px', flexShrink:'0',
    });
    const personaPanel = document.createElement('div');
    Object.assign(personaPanel.style, {
        display:'none', width:'100%',
        background:'rgba(0,0,0,0.25)', border:'1px solid rgba(201,169,110,0.12)',
        borderRadius:'8px', padding:'10px 12px', boxSizing:'border-box',
        flexDirection:'column', gap:'8px', flexShrink:'0',
    });
    const pSub = document.createElement('div');
    Object.assign(pSub.style, { fontSize:'11px', color:'rgba(200,184,144,0.55)', fontFamily:'sans-serif' });
    pSub.textContent = '등록한 이름은 카드에서 {{user}}로 치환됩니다.';
    const pRow2 = document.createElement('div');
    Object.assign(pRow2.style, { display:'flex', gap:'6px' });
    const pInput = document.createElement('input');
    pInput.type='text'; pInput.placeholder='페르소나 이름';
    Object.assign(pInput.style, { flex:'1', padding:'6px 10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(201,169,110,0.2)', borderRadius:'6px', color:'#e8ddc8', fontSize:'12px', outline:'none' });
    const pAdd = mkBtn('추가', { padding:'6px 12px', background:'rgba(201,169,110,0.15)', border:'1px solid rgba(201,169,110,0.3)', borderRadius:'6px', color:'#c9a96e', fontSize:'12px', whiteSpace:'nowrap' });
    pRow2.appendChild(pInput); pRow2.appendChild(pAdd);
    const pList = document.createElement('div');
    Object.assign(pList.style, { display:'flex', flexWrap:'wrap', gap:'5px', minHeight:'18px' });

    function refreshPList() {
        pList.innerHTML = '';
        if (!S().personaNames.length) {
            const em = document.createElement('span');
            Object.assign(em.style, { fontSize:'11px', opacity:'0.35', fontStyle:'italic', fontFamily:'sans-serif', color:'#e8ddc8' });
            em.textContent = '등록된 페르소나 없음'; pList.appendChild(em); return;
        }
        S().personaNames.forEach(name => {
            const tag = document.createElement('span');
            Object.assign(tag.style, { display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'rgba(201,169,110,0.12)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:'16px', fontSize:'11px', color:'#e8ddc8', fontFamily:'sans-serif' });
            tag.textContent = name + ' ';
            const rm = document.createElement('button');
            rm.textContent='✕';
            Object.assign(rm.style, { background:'none', border:'none', color:'rgba(201,169,110,0.5)', cursor:'pointer', fontSize:'9px', padding:'0', lineHeight:'1' });
            rm.onclick = () => { S().personaNames = S().personaNames.filter(n=>n!==name); saveSettingsDebounced(); refreshPList(); };
            tag.appendChild(rm); pList.appendChild(tag);
        });
    }
    refreshPList();
    const doAdd = () => {
        const v = pInput.value.trim();
        if (!v || S().personaNames.includes(v)) return;
        S().personaNames.push(v); saveSettingsDebounced(); pInput.value=''; refreshPList();
    };
    pAdd.onclick = doAdd;
    pInput.onkeydown = (e) => { if (e.key==='Enter') doAdd(); };
    personaPanel.appendChild(pSub); personaPanel.appendChild(pRow2); personaPanel.appendChild(pList);
    const toggleP = () => { personaPanel.style.display = personaPanel.style.display==='none'?'flex':'none'; };
    personaToggle.onclick = toggleP;
    personaToggle.addEventListener('touchend', (e) => { e.preventDefault(); toggleP(); });

    // PNG 저장
    const dlBtn = mkBtn('⬇ PNG 저장', {
        background:'linear-gradient(135deg,#3b2a1a,#5a3e20)', color:'#f5e9c9',
        border:'1px solid #c9a96e', borderRadius:'20px', padding:'10px 28px', fontSize:'14px', flexShrink:'0',
    });
    const doDownload = () => { const a=document.createElement('a'); a.download=`bookmark_${Date.now()}.png`; a.href=canvas.toDataURL('image/png'); a.click(); };
    dlBtn.onclick = doDownload;
    dlBtn.addEventListener('touchend', (e) => { e.preventDefault(); doDownload(); });

    // 하단 행 (화자 + 페르소나)
    const bottomRow = document.createElement('div');
    Object.assign(bottomRow.style, { display:'flex', gap:'10px', alignItems:'center', justifyContent:'center', width:'100%', flexWrap:'wrap', flexShrink:'0' });
    bottomRow.appendChild(charRow);
    bottomRow.appendChild(personaToggle);

    card.appendChild(closeBtn);
    card.appendChild(canvas);
    card.appendChild(styleRow);
    card.appendChild(optRow);
    card.appendChild(bottomRow);
    card.appendChild(personaPanel);
    card.appendChild(dlBtn);
    modal.appendChild(card);
    document.documentElement.appendChild(modal);

    // unsplash면 사진 로드 후 렌더
    if (S().bgStyle === 'unsplash' && currentPhotoUrl) {
        redraw();
    } else if (S().bgStyle === 'unsplash') {
        fetchUnsplashPhoto(extractKeywords(text)).then(() => redraw());
    } else {
        redraw();
    }
}

function mkBtn(text, styles) {
    const b = document.createElement('button');
    b.textContent = text;
    Object.assign(b.style, { cursor:'pointer', touchAction:'manipulation', WebkitTapHighlightColor:'transparent', ...styles });
    return b;
}

// ── Canvas ────────────────────────────────────────────────────────────────────
const BG_THEMES = {
    parchment: { bg:['#f5e9c9','#ede0b0'], rule:'#c9a96e', ornament:'#c9a96e' },
    dark:      { bg:['#1a1714','#2a2420'], rule:'#4a3f30', ornament:'#c9a96e' },
    linen:     { bg:['#faf6f0','#f0ebe0'], rule:'#d0c4a8', ornament:'#a08060' },
    sage:      { bg:['#e8ede0','#d8e0cc'], rule:'#9aaa88', ornament:'#6a8a58' },
};

const TEXT_COLORS = {
    dark:  { text:'#2a1f10', accent:'#6b4420' },
    white: { text:'#f5f0e8', accent:'#e8d9b8' },
};

function renderCard(canvas, text, charName) {
    const bgStyle = S().bgStyle;
    const theme = BG_THEMES[bgStyle] || BG_THEMES.parchment;
    const tColor = TEXT_COLORS[S().textColor] || TEXT_COLORS.dark;
    const align = S().textAlign || 'center';

    const chatEl = document.querySelector('#chat .mes_text') || document.querySelector('.mes_text');
    const detectedFont = chatEl ? window.getComputedStyle(chatEl).fontFamily : '"Palatino Linotype",Palatino,serif';
    const bodyFont = `italic 22px ${detectedFont}`;
    const metaFont = `14px ${detectedFont}`;

    // 3:4 비율
    const W = 720, H = 960;
    const PAD = 72, lineH = 38, paraGap = 22;

    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── 배경 ──
    if (bgStyle === 'unsplash' && currentPhotoUrl) {
        // 이미지 그리기
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // 커버핏
            const scale = Math.max(W/img.width, H/img.height);
            const sw = img.width*scale, sh = img.height*scale;
            ctx.drawImage(img, (W-sw)/2, (H-sh)/2, sw, sh);
            // 어둡게 오버레이
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0,0,W,H);
            drawCardContent(ctx, W, H, PAD, lineH, paraGap, text, charName, bodyFont, metaFont, tColor, align, { rule:'rgba(255,255,255,0.4)', ornament:'rgba(255,255,255,0.7)' });
            // 크레딧
            ctx.font = '11px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.textAlign = 'right';
            ctx.fillText('Photo: ' + currentPhotoCredit + ' / Unsplash', W-16, H-12);
        };
        img.onerror = () => {
            // fallback 단색
            ctx.fillStyle = '#1a1714'; ctx.fillRect(0,0,W,H);
            drawCardContent(ctx, W, H, PAD, lineH, paraGap, text, charName, bodyFont, metaFont, tColor, align, { rule:'#4a3f30', ornament:'#c9a96e' });
        };
        img.src = currentPhotoUrl;
        return;
    } else {
        const grad = ctx.createLinearGradient(0,0,W,H);
        grad.addColorStop(0,theme.bg[0]); grad.addColorStop(1,theme.bg[1]);
        ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    }

    addNoise(ctx,W,H,bgStyle==='dark'?0.04:0.02);
    drawCardContent(ctx, W, H, PAD, lineH, paraGap, text, charName, bodyFont, metaFont, tColor, align, theme);
}

function drawCardContent(ctx, W, H, PAD, lineH, paraGap, text, charName, bodyFont, metaFont, tColor, align, theme) {
    // 테두리
    drawBookBorder(ctx, theme, W, H);

    // 장식
    const ornY = PAD + 20;
    drawOrnament(ctx, W/2, ornY, theme.ornament, false);
    drawRule(ctx, PAD+24, ornY+22, W-PAD-24, theme.rule);

    // 문단
    ctx.font = bodyFont;
    const maxW = W - PAD*2;
    const paras = text.split(/\n\n|\n/).map(p=>p.trim()).filter(Boolean);
    const paraLines = paras.map(p => wrapText(ctx, p, maxW));

    // 총 텍스트 높이 계산 → 수직 중앙 배치
    let totalH = 0;
    paraLines.forEach((lines, i) => { totalH += lines.length*lineH; if(i<paraLines.length-1) totalH+=paraGap; });
    let curY = Math.max(ornY+50, (H - totalH) / 2);

    const ctxAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
    const textX = align === 'left' ? PAD+8 : align === 'right' ? W-PAD-8 : W/2;
    ctx.textAlign = ctxAlign;
    ctx.fillStyle = tColor.text;
    ctx.font = bodyFont;

    // 따옴표: 첫 문단 첫 줄 앞에만, 마지막 문단 마지막 줄 뒤에만
    paraLines.forEach((lines, pi) => {
        lines.forEach((line) => {
            ctx.fillText(line, textX, curY);
            curY += lineH;
        });
        if (pi < paraLines.length-1) curY += paraGap;
    });

    // 화자
    const showMeta = S().showCharName && charName;
    if (showMeta) {
        const attrY = curY + 22;
        drawRule(ctx, PAD+24, attrY-8, W-PAD-24, theme.rule);
        ctx.font = metaFont;
        ctx.fillStyle = tColor.accent;
        ctx.textAlign = 'right';
        ctx.fillText('\u2014 ' + charName, W-PAD-16, attrY+16);
    }

    // 하단 장식
    const botY = H - PAD - 24;
    drawRule(ctx, PAD+24, botY-14, W-PAD-24, theme.rule);
    drawOrnament(ctx, W/2, botY+2, theme.ornament, true);
}

function drawBookBorder(ctx,t,W,H){
    const m=14;
    ctx.strokeStyle=t.rule; ctx.lineWidth=0.8; ctx.strokeRect(m,m,W-m*2,H-m*2);
    ctx.strokeStyle=t.ornament; ctx.lineWidth=2;
    ctx.strokeRect(m+7,m+7,W-(m+7)*2,H-(m+7)*2);
    ctx.fillStyle=t.ornament;
    [[m+7,m+7],[W-m-7,m+7],[m+7,H-m-7],[W-m-7,H-m-7]].forEach(([x,y])=>ctx.fillRect(x-3,y-3,6,6));
}
function drawRule(ctx,x1,y,x2,c){
    ctx.save();ctx.strokeStyle=c;ctx.lineWidth=0.7;ctx.globalAlpha=0.55;
    ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();ctx.restore();
}
function drawOrnament(ctx,cx,cy,c,flip=false){
    ctx.save();ctx.fillStyle=c;ctx.globalAlpha=0.8;
    ctx.font=flip?'18px serif':'20px serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(flip?'\u2767':'\u2766',cx,cy);ctx.restore();
}
function addNoise(ctx,W,H,a){
    ctx.save();ctx.globalAlpha=a;
    for(let y=0;y<H;y+=2) for(let x=0;x<W;x+=2){
        const v=Math.random()>0.5?255:0;
        ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,1,1);
    }
    ctx.restore();
}
function wrapText(ctx,text,maxW){
    const words=text.split(' ');const lines=[];let cur='';
    words.forEach(w=>{
        const t=cur?cur+' '+w:w;
        if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}
        else cur=t;
    });
    if(cur)lines.push(cur);
    return lines;
}
