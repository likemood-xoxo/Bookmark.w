// BookMark.w - SillyTavern Extension
import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT = 'bookmark-w';
const DEF = { bgStyle:'parchment', showCharName:true, personaNames:[], textAlign:'center', textColor:'dark', fontSize:0, orientation:'portrait' };

jQuery(async () => { loadSettings(); injectBtn(); attachListener(); });

function loadSettings() {
    extension_settings[EXT] = Object.assign({}, DEF, extension_settings[EXT]);
    if (!Array.isArray(extension_settings[EXT].personaNames)) extension_settings[EXT].personaNames = [];
}
function S() { return extension_settings[EXT]; }
function save() { saveSettingsDebounced(); }

function mask(text) {
    let r = text;
    (S().personaNames||[]).forEach(n => {
        if (!n) return;
        r = r.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),'{{user}}');
    });
    return r;
}

// -- Selection button --
let selBtn = null;
function injectBtn() {
    selBtn = document.createElement('div');
    Object.assign(selBtn.style, {
        position:'fixed', zIndex:'2147483647', display:'none',
        pointerEvents:'auto', lineHeight:'1', fontSize:'20px', cursor:'pointer',
        filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.7))',
        WebkitTapHighlightColor:'transparent', touchAction:'manipulation',
        userSelect:'none', WebkitUserSelect:'none',
    });
    selBtn.textContent = '🔖';
    selBtn.addEventListener('click', trigger);
    selBtn.addEventListener('touchend', e => { e.preventDefault(); trigger(); });
    document.documentElement.appendChild(selBtn);
}

let selText = '', selHtml = '', selChar = '', selTimer = null, hideTimer = null;

function attachListener() {
    document.addEventListener('selectionchange', () => {
        clearTimeout(selTimer);
        const t = window.getSelection()?.toString().trim() || '';
        if (t.length >= 5) {
            selTimer = setTimeout(tryShow, 750);
        } else {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                if (!window.getSelection()?.toString().trim()) selBtn.style.display = 'none';
            }, 400);
        }
    });
    // 모바일 touchend
    document.addEventListener('touchend', e => {
        if (e.target === selBtn) return;
        clearTimeout(selTimer); selTimer = setTimeout(tryShow, 600);
    }, { passive: true });
    // 데스크탑 mouseup
    document.addEventListener('mouseup', e => {
        if (e.target === selBtn) return;
        clearTimeout(selTimer); selTimer = setTimeout(tryShow, 80);
    });
}

function tryShow() {
    const sel = window.getSelection();
    const t = sel?.toString().trim() || '';
    if (t.length < 5) { selBtn.style.display = 'none'; return; }
    const node = sel.focusNode || sel.anchorNode;
    const mes = node?.parentElement?.closest?.('.mes');
    // 이모지/특수문자 제거하고 텍스트만 추출
    const rawName = mes ? (mes.querySelector('.name_text')?.textContent?.trim() || mes.getAttribute('ch_name') || '') : '';
    selChar = rawName.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '').trim();
    const range = sel.getRangeAt(0);
const clone = range.cloneContents();

const temp = document.createElement('div');
temp.appendChild(clone);

selHtml = temp.innerHTML;
selText = t;
    let x = window.innerWidth/2, y = 300;
    try { const r = sel.getRangeAt(0).getClientRects(); if (r.length) { x=r[r.length-1].right; y=r[r.length-1].bottom; } } catch(_){}
    const sz = 28;
    const btnX = Math.min(
    Math.max(x - sz / 2, 4),
    window.innerWidth - sz - 4
);

let btnY = y + 12;

// 아래 공간 부족하면 선택 영역 위에 표시
if (btnY + sz > window.innerHeight - 8) {
    btnY = Math.max(8, y - sz - 12);
}

selBtn.style.left = btnX + 'px';
selBtn.style.top = btnY + 'px';
    selBtn.style.display = 'block';
}

function trigger() {
    selBtn.style.display = 'none';
    openModal(
        htmlToMarkdown(selHtml || selText),
        mask(selChar)
    );
}

// -- Unsplash --
let photoUrl = null, photoCredit = '';
async function fetchPhoto(query) {
    try {
        const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query.slice(0,60))}&orientation=portrait&client_id=tBSCqbCHDM_3mFMfRhfmKBHbWpBr7KBxKxJGi0PEjg`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        photoUrl = d.urls.regular; photoCredit = d.user.name;
    } catch(_) {
        photoUrl = `https://picsum.photos/seed/${Math.floor(Math.random()*1000)}/720/960`;
        photoCredit = 'Lorem Picsum';
    }
    return photoUrl;
}
function keywords(text) {
    const w = text.match(/[a-zA-Z]{4,}|[\uAC00-\uD7A3]{2,}/g)||[];
    const stop = new Set(['that','this','with','have','from','they','will','been','were','when','what','your','also','into','than','them','their']);
    return w.filter(x=>!stop.has(x.toLowerCase())).slice(0,3).join(' ')||'cinematic moody';
}

// -- Modal --
let modal = null;
function openModal(text, charName) {
    if (modal) modal.remove();
    const W = window.innerWidth, H = window.innerHeight;
    modal = document.createElement('div');
    Object.assign(modal.style, {
        position:'fixed', top:'0px', left:'0px', width:W+'px', height:H+'px',
        zIndex:'2147483647', background:'rgba(0,0,0,0.6)',
        backdropFilter:'none', WebkitBackdropFilter:'none',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        paddingTop:'52px', boxSizing:'border-box',
        overflow:'hidden', transform:'none', willChange:'auto',
    });
    const close = () => { modal.remove(); modal = null; };
    modal.addEventListener('click', e => { if (e.target===modal) close(); });

    const card = document.createElement('div');
    const cW = Math.min(W-32, 480);
    Object.assign(card.style, {
        width:cW+'px', maxHeight:(H-72)+'px', overflowY:'auto', WebkitOverflowScrolling:'touch',
        background:'#1e1a16', borderRadius:'20px', padding:'16px 16px 28px',
        boxSizing:'border-box', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px',
        boxShadow:'0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,169,110,0.2)',
    });
    card.addEventListener('click', e => e.stopPropagation());

    // 닫기
    const closeBtn = mkBtn('✕', { alignSelf:'flex-end', background:'none', border:'none', color:'rgba(200,184,144,0.6)', fontSize:'18px', padding:'0 4px' });
    closeBtn.onclick = close;
    closeBtn.addEventListener('touchend', e => { e.preventDefault(); close(); });

    // 캔버스
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { width:'100%', height:'auto', display:'block', borderRadius:'12px', boxShadow:'0 4px 24px rgba(0,0,0,0.5)', flexShrink:'0' });

    const redraw = () => renderCard(canvas, text, charName);

    // 배경 스타일 버튼
    const styleRow = mkRow();
    const bgOpts = [['parchment','양피지'],['dark','다크'],['linen','린넨'],['sage','세이지'],['unsplash','🖼']];
    bgOpts.forEach(([bg, label]) => {
        const b = mkBtn(label, { background: bg===S().bgStyle?'rgba(201,169,110,0.28)':'rgba(255,255,255,0.08)', color:'#c8b890', border:'1px solid rgba(201,169,110,0.35)', borderRadius:'16px', padding:'6px 13px', fontSize:'13px' });
        const pick = async () => {
            styleRow.querySelectorAll('button').forEach(x => x.style.background='rgba(255,255,255,0.08)');
            b.style.background='rgba(201,169,110,0.28)';
            if (bg==='unsplash') { b.textContent='⏳'; await fetchPhoto(keywords(text)); b.textContent='🖼'; }
            S().bgStyle = bg; save(); redraw();
        };
        b.onclick = pick; b.addEventListener('touchend', e=>{e.preventDefault();pick();});
        styleRow.appendChild(b);
    });

    // 옵션 행 (정렬 + 글씨 색)
    const optRow = mkRow();
    // 정렬
    [['left','◀'],['center','■'],['right','▶']].forEach(([a,icon]) => {
        const b = mkBtn(icon, { background:S().textAlign===a?'rgba(201,169,110,0.28)':'rgba(255,255,255,0.08)', color:'#c8b890', border:'1px solid rgba(201,169,110,0.3)', borderRadius:'12px', padding:'6px 12px', fontSize:'13px' });
        b.dataset.type='align';
        const pick = () => { optRow.querySelectorAll('[data-type="align"]').forEach(x=>x.style.background='rgba(255,255,255,0.08)'); b.style.background='rgba(201,169,110,0.28)'; S().textAlign=a; save(); redraw(); };
        b.onclick=pick; b.addEventListener('touchend',e=>{e.preventDefault();pick();});
        optRow.appendChild(b);
    });
    // 구분
    const sep = document.createElement('span');
    Object.assign(sep.style,{color:'rgba(201,169,110,0.3)',fontSize:'18px',lineHeight:'1',alignSelf:'center'});
    sep.textContent='|'; optRow.appendChild(sep);
    // 글씨 색
    [['dark','#2a1f10'],['white','#f0f0f0']].forEach(([col,fg]) => {
        const b = mkBtn('A', { background:S().textColor===col?'rgba(201,169,110,0.28)':'rgba(255,255,255,0.08)', color:fg, border:'1px solid rgba(201,169,110,0.3)', borderRadius:'12px', padding:'6px 14px', fontSize:'15px', fontWeight:'bold' });
        b.dataset.type='color';
        const pick = () => { optRow.querySelectorAll('[data-type="color"]').forEach(x=>x.style.background='rgba(255,255,255,0.08)'); b.style.background='rgba(201,169,110,0.28)'; S().textColor=col; save(); redraw(); };
        b.onclick=pick; b.addEventListener('touchend',e=>{e.preventDefault();pick();});
        optRow.appendChild(b);
    });

    // 방향 선택 (세로/가로)
    const orientRow = mkRow();
    [['portrait','세로 3:4'],['landscape','가로 4:3']].forEach(([ori, label]) => {
        const b = mkBtn(label, {
            background: S().orientation===ori ? 'rgba(201,169,110,0.28)' : 'rgba(255,255,255,0.08)',
            color:'#c8b890', border:'1px solid rgba(201,169,110,0.35)',
            borderRadius:'16px', padding:'6px 14px', fontSize:'13px',
        });
        b.dataset.ori = ori;
        const pick = () => {
            orientRow.querySelectorAll('button').forEach(x => x.style.background='rgba(255,255,255,0.08)');
            b.style.background='rgba(201,169,110,0.28)';
            S().orientation=ori; save(); redraw();
        };
        b.onclick=pick; b.addEventListener('touchend',e=>{e.preventDefault();pick();});
        orientRow.appendChild(b);
    });

    // 글씨 크기 슬라이더
    const sizeRow = document.createElement('div');
    Object.assign(sizeRow.style, { display:'flex', alignItems:'center', gap:'10px', width:'100%', flexShrink:'0', padding:'0 4px', boxSizing:'border-box' });
    const sizeLabel = document.createElement('span');
    Object.assign(sizeLabel.style, { color:'rgba(200,184,144,0.7)', fontSize:'12px', whiteSpace:'nowrap', minWidth:'44px' });
    sizeLabel.textContent = S().fontSize ? S().fontSize+'px' : '자동';
    const slider = document.createElement('input');
    slider.type='range'; slider.min='0'; slider.max='30'; slider.step='1'; slider.value=S().fontSize||0;
    Object.assign(slider.style, { flex:'1', accentColor:'#c9a96e', cursor:'pointer' });
    const resetBtn = mkBtn('↺', { background:'none', border:'none', color:'rgba(201,169,110,0.6)', fontSize:'16px', padding:'0 2px' });
    slider.oninput = () => { const v=parseInt(slider.value); S().fontSize=v; save(); sizeLabel.textContent=v?v+'px':'자동'; redraw(); };
    const doReset = () => { slider.value=0; S().fontSize=0; save(); sizeLabel.textContent='자동'; redraw(); };
    resetBtn.onclick=doReset; resetBtn.addEventListener('touchend',e=>{e.preventDefault();doReset();});
    sizeRow.appendChild(sizeLabel); sizeRow.appendChild(slider); sizeRow.appendChild(resetBtn);

    // 화자 + 페르소나
    const bottomRow = mkRow();
    const charLbl = document.createElement('label');
    Object.assign(charLbl.style,{display:'flex',alignItems:'center',gap:'8px',color:'#c8b890',fontSize:'13px',cursor:'pointer'});
    const charChk = document.createElement('input'); charChk.type='checkbox'; charChk.checked=S().showCharName;
    charChk.onchange = () => { S().showCharName=charChk.checked; save(); redraw(); };
    charLbl.appendChild(charChk); charLbl.appendChild(document.createTextNode('화자 이름'));

    const pToggle = mkBtn('⚙ 페르소나', { background:'rgba(201,169,110,0.10)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:'14px', padding:'5px 12px', color:'#c9a96e', fontSize:'12px' });
    bottomRow.appendChild(charLbl); bottomRow.appendChild(pToggle);

    // 페르소나 패널
    const pPanel = document.createElement('div');
    Object.assign(pPanel.style,{ display:'none', width:'100%', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(201,169,110,0.12)', borderRadius:'8px', padding:'10px 12px', boxSizing:'border-box', flexDirection:'column', gap:'8px', flexShrink:'0' });
    const pSub = document.createElement('div');
    Object.assign(pSub.style,{fontSize:'11px',color:'rgba(200,184,144,0.55)',fontFamily:'sans-serif'});
    pSub.textContent='등록한 이름은 카드에서 {{user}}로 치환됩니다.';
    const pInputRow = mkRow();
    const pInput = document.createElement('input'); pInput.type='text'; pInput.placeholder='페르소나 이름';
    Object.assign(pInput.style,{flex:'1',padding:'6px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(201,169,110,0.2)',borderRadius:'6px',color:'#e8ddc8',fontSize:'12px',outline:'none'});
    const pAdd = mkBtn('추가',{padding:'6px 12px',background:'rgba(201,169,110,0.15)',border:'1px solid rgba(201,169,110,0.3)',borderRadius:'6px',color:'#c9a96e',fontSize:'12px',whiteSpace:'nowrap'});
    pInputRow.appendChild(pInput); pInputRow.appendChild(pAdd);
    const pList = document.createElement('div');
    Object.assign(pList.style,{display:'flex',flexWrap:'wrap',gap:'5px',minHeight:'18px'});

    function refreshP() {
        pList.innerHTML='';
        if (!S().personaNames.length) { const e=document.createElement('span'); Object.assign(e.style,{fontSize:'11px',opacity:'0.35',fontStyle:'italic',fontFamily:'sans-serif',color:'#e8ddc8'}); e.textContent='등록된 페르소나 없음'; pList.appendChild(e); return; }
        S().personaNames.forEach(n=>{
            const tag=document.createElement('span');
            Object.assign(tag.style,{display:'inline-flex',alignItems:'center',gap:'4px',padding:'2px 8px',background:'rgba(201,169,110,0.12)',border:'1px solid rgba(201,169,110,0.25)',borderRadius:'16px',fontSize:'11px',color:'#e8ddc8',fontFamily:'sans-serif'});
            tag.textContent=n+' ';
            const rm=document.createElement('button'); rm.textContent='✕';
            Object.assign(rm.style,{background:'none',border:'none',color:'rgba(201,169,110,0.5)',cursor:'pointer',fontSize:'9px',padding:'0',lineHeight:'1'});
            rm.onclick=()=>{S().personaNames=S().personaNames.filter(x=>x!==n);save();refreshP();};
            tag.appendChild(rm); pList.appendChild(tag);
        });
    }
    refreshP();
    const doAdd=()=>{const v=pInput.value.trim();if(!v||S().personaNames.includes(v))return;S().personaNames.push(v);save();pInput.value='';refreshP();};
    pAdd.onclick=doAdd; pInput.onkeydown=e=>{if(e.key==='Enter')doAdd();};
    pPanel.appendChild(pSub); pPanel.appendChild(pInputRow); pPanel.appendChild(pList);
    const toggleP=()=>{pPanel.style.display=pPanel.style.display==='none'?'flex':'none';};
    pToggle.onclick=toggleP; pToggle.addEventListener('touchend',e=>{e.preventDefault();toggleP();});

    // PNG 저장
    const dlBtn = mkBtn('⬇ PNG 저장',{background:'linear-gradient(135deg,#3b2a1a,#5a3e20)',color:'#f5e9c9',border:'1px solid #c9a96e',borderRadius:'20px',padding:'10px 28px',fontSize:'14px',flexShrink:'0'});
    const dl=()=>{
    canvas.toBlob(async (blob)=>{
        const file = new File(
            [blob],
            `bookmark_${Date.now()}.png`,
            {type:'image/png'}
        );

        // iOS Safari / PWA 대응
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (
    isIOS &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({files:[file]})
) {
    try {
        await navigator.share({
            files:[file],
            title:'Bookmark'
        });
        toastr.success('🔖 저장 완료!');
        return;
    } catch(e) {
        if(e.name === 'AbortError') return;
    }
}

// 기존 다운로드 유지 (갤럭시 / PC)
const a=document.createElement('a');
a.download=file.name;
a.href=URL.createObjectURL(blob);
document.body.appendChild(a);
a.click();

setTimeout(()=>{
    URL.revokeObjectURL(a.href);
    a.remove();
},1000);

toastr.success('🔖 저장 완료!');
    }, 'image/png');
};
    dlBtn.onclick = dl;

    card.appendChild(closeBtn); card.appendChild(canvas); card.appendChild(styleRow);
    card.appendChild(orientRow); card.appendChild(optRow); card.appendChild(sizeRow); card.appendChild(bottomRow); card.appendChild(pPanel); card.appendChild(dlBtn);
    modal.appendChild(card); document.documentElement.appendChild(modal);

    if (S().bgStyle==='unsplash' && !photoUrl) fetchPhoto(keywords(text)).then(redraw);
    else redraw();
}

function mkBtn(txt, styles) {
    const b=document.createElement('button'); b.textContent=txt;
    Object.assign(b.style,{cursor:'pointer',touchAction:'manipulation',WebkitTapHighlightColor:'transparent',...styles}); return b;
}
function mkRow() {
    const d=document.createElement('div');
    Object.assign(d.style,{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center',flexShrink:'0',width:'100%'}); return d;
}

// -- Canvas --
const THEMES = {
    parchment:{bg:['#f5e9c9','#ede0b0'],rule:'#c9a96e',ornament:'#c9a96e'},
    dark:{bg:['#1a1714','#2a2420'],rule:'#4a3f30',ornament:'#c9a96e'},
    linen:{bg:['#faf6f0','#f0ebe0'],rule:'#d0c4a8',ornament:'#a08060'},
    sage:{bg:['#e8ede0','#d8e0cc'],rule:'#9aaa88',ornament:'#6a8a58'},
};
const TCOLORS = {
    dark:{text:'#2a1f10',accent:'#6b4420'},
    white:{text:'#f5f0e8',accent:'#e8d9b8'},
};

function renderCard(canvas, text, charName) {
    const bg = S().bgStyle;
    const theme = THEMES[bg] || THEMES.parchment;
    const tc = TCOLORS[S().textColor] || TCOLORS.dark;
    const align = S().textAlign || 'center';

    const chatEl = document.querySelector('#chat .mes_text') || document.querySelector('.mes_text');
    const font = chatEl ? window.getComputedStyle(chatEl).fontFamily : '"Palatino Linotype",Palatino,serif';

    const isLand = S().orientation==='landscape';
    const W = isLand ? 960 : 720;
    const baseH = isLand ? 720 : 960; // 기본(최소) 높이 -> 짧은 글은 정확히 이 비율 유지
    const PAD = 64;

    const paras = text.split(/\n\n|\n/).map(p=>p.trim()).filter(Boolean);
    const manualFs = S().fontSize || 0;

    // -- 상/하단 고정 장식 영역 크기 --
    const ornY = PAD + 20;
    const topFixed = ornY + 52;      // 테두리~본문 시작 전까지 (상단 고정)
    const bottomFixed = PAD + 26;    // 룰선~테두리까지 (H 기준 상대 위치라 H가 늘어도 자동 유지됨)
    const GAP = 34;                   // 본문(화자명 포함)과 하단 장식 사이 여백
    const nameBlock = (S().showCharName && charName) ? 54 : 0; // 화자명 줄 예상 높이

    // 실제 캔버스 크기를 정하기 전에 폰트/높이부터 측정
    const measCtx = document.createElement('canvas').getContext('2d');
    function measureAt(f) {
        const l = Math.round(f*1.72), g = Math.round(f*1.0);
        let tot = 0;
        paras.forEach((p,i)=>{
            const lines = wrapTokens(measCtx, tokenizeStyled(p), W-PAD*2, f, font);
            tot += lines.length*l;
            if(i<paras.length-1) tot+=g;
        });
        return { tot, l, g };
    }

    let fs, lh, pg, totH;
    if (manualFs >= 8) {
        const r = measureAt(manualFs);
        fs = manualFs; lh = r.l; pg = r.g; totH = r.tot;
    } else {
        const avail = baseH - topFixed - bottomFixed - GAP - nameBlock;
        let picked = null;
        for (let f=22; f>=13; f--) {
            const r = measureAt(f);
            if (r.tot <= avail) { picked = { f, ...r }; break; }
        }
        // 13px로 줄여도 안 들어가면: 폰트는 13px로 고정하고 아래에서 캔버스 높이를 늘림
        if (!picked) picked = { f:13, ...measureAt(13) };
        fs = picked.f; lh = picked.l; pg = picked.g; totH = picked.tot;
    }

    // 기본 높이 안에 안 들어가면, 상/하단 장식 위치는 그대로 두고 본문 박스만큼만 세로로 확장
    // (극단적으로 긴 텍스트에 대비해 기본 높이의 3배로 상한을 둠)
    const neededH = topFixed + totH + nameBlock + GAP + bottomFixed;
    const H = Math.max(baseH, Math.min(Math.round(neededH), baseH * 3));

    // -- 고화질 렌더링: 논리 크기(W,H)는 유지하고 실제 픽셀 밀도만 올림 --
    const SCALE = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    canvas.width = Math.round(W * SCALE);
    canvas.height = Math.round(H * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bodyFont=`${fs}px ${font}`;
    const metaFont=`${Math.max(11,fs-8)}px ${font}`;

    // 배경 그리기
    if (bg==='unsplash' && photoUrl) {
        const img=new Image(); img.crossOrigin='anonymous';
        img.onload=()=>{
            const sc=Math.max(W/img.width,H/img.height);
            ctx.drawImage(img,(W-img.width*sc)/2,(H-img.height*sc)/2,img.width*sc,img.height*sc);
            ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H);
            drawContent(ctx,W,H,PAD,lh,pg,paras,charName,bodyFont,metaFont,tc,align,{rule:'rgba(255,255,255,0.4)',ornament:'rgba(255,255,255,0.7)'});
            ctx.font='11px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textAlign='right';
            ctx.fillText('Photo: '+photoCredit+' / Unsplash',W-16,H-12);
        };
        img.onerror=()=>{ ctx.fillStyle='#1a1714'; ctx.fillRect(0,0,W,H); drawContent(ctx,W,H,PAD,lh,pg,paras,charName,bodyFont,metaFont,tc,align,THEMES.dark); };
        img.src=photoUrl; return;
    }
    const grad=ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,theme.bg[0]); grad.addColorStop(1,theme.bg[1]);
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    addNoise(ctx,W,H,bg==='dark'?0.04:0.02);
    drawContent(ctx,W,H,PAD,lh,pg,paras,charName,bodyFont,metaFont,tc,align,theme);
}

function drawContent(ctx,W,H,PAD,lh,pg,paras,charName,bodyFont,metaFont,tc,align,theme) {
    drawBorder(ctx,theme,W,H);
    const ornY=PAD+20;
    drawOrnament(ctx,W/2,ornY,theme.ornament,false);
    drawRule(ctx,PAD+24,ornY+22,W-PAD-24,theme.rule);

    const sizeMatch = bodyFont.match(/(\d+)px/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 18;
    const fontName = bodyFont.replace(/^[\d.]+px\s*/, '');

    const paraLines = paras.map(p => wrapTokens(ctx, tokenizeStyled(p), W-PAD*2, size, fontName));
    let totH=0; paraLines.forEach((l,i)=>{ totH+=l.length*lh; if(i<paraLines.length-1)totH+=pg; });
    let curY=Math.max(ornY+52,(H-totH)/2);

    const tx=align==='left'?PAD+8:align==='right'?W-PAD-8:W/2;
    ctx.fillStyle=tc.text;

    paraLines.forEach((lines,pi)=>{
        lines.forEach(tokens=>{ drawTokenLine(ctx,tokens,tx,curY,size,fontName,align); curY+=lh; });
        if(pi<paraLines.length-1) curY+=pg;
    });

    if (S().showCharName && charName) {
        const ay=curY+22;
        drawRule(ctx,PAD+24,ay-8,W-PAD-24,theme.rule);
        ctx.font=metaFont; ctx.fillStyle=tc.accent; ctx.textAlign='right';
        ctx.fillText('\u2014 '+charName,W-PAD-16,ay+16);
    }
    drawRule(ctx,PAD+24,H-PAD-26,W-PAD-24,theme.rule);
    drawOrnament(ctx,W/2,H-PAD-14,theme.ornament,true);
}

function drawBorder(ctx,t,W,H){
    const m=14;
    ctx.strokeStyle=t.rule;ctx.lineWidth=0.8;ctx.strokeRect(m,m,W-m*2,H-m*2);
    ctx.strokeStyle=t.ornament;ctx.lineWidth=2;ctx.strokeRect(m+7,m+7,W-(m+7)*2,H-(m+7)*2);
    ctx.fillStyle=t.ornament;
    [[m+7,m+7],[W-m-7,m+7],[m+7,H-m-7],[W-m-7,H-m-7]].forEach(([x,y])=>ctx.fillRect(x-3,y-3,6,6));
}
function drawRule(ctx,x1,y,x2,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=0.7;ctx.globalAlpha=0.55;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();ctx.restore();}
function drawOrnament(ctx,cx,cy,c,flip){ctx.save();ctx.fillStyle=c;ctx.globalAlpha=0.8;ctx.font=flip?'18px serif':'20px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(flip?'\u2767':'\u2766',cx,cy);ctx.restore();}
function addNoise(ctx,W,H,a){ctx.save();ctx.globalAlpha=a;for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){const v=Math.random()>0.5?255:0;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,1,1);}ctx.restore();}
function htmlToMarkdown(html){
    const div=document.createElement('div');
    div.innerHTML=html;

    div.querySelectorAll('strong,b').forEach(e=>{
        e.replaceWith(
            document.createTextNode(
                '**' + e.textContent + '**'
            )
        );
    });

    div.querySelectorAll('em,i').forEach(e=>{
        e.replaceWith(
            document.createTextNode(
                '*' + e.textContent + '*'
            )
        );
    });

    div.querySelectorAll('code').forEach(e=>{
        e.replaceWith(
            document.createTextNode(
                '`' + e.textContent + '`'
            )
        );
    });

    return div.innerText;
}
// 텍스트를 **볼드**/*이탤릭*/`코드` 스타일이 붙은 토큰 배열로 분해.
// 공백은 원문에 있는 만큼만(연속 공백은 1칸으로 정규화) 별도 토큰으로 유지 —
// 예전처럼 마크 문자를 다시 조립했다가 재파싱하지 않으므로 공백이 중복되지 않음.
function tokenizeStyled(text) {
    const runs = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|[^*`]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m[2]) runs.push({ text:m[2], bold:true,  italic:false, code:false });
        else if (m[3]) runs.push({ text:m[3], bold:false, italic:true,  code:false });
        else if (m[4]) runs.push({ text:m[4], bold:false, italic:false, code:true  });
        else runs.push({ text:m[0], bold:false, italic:false, code:false });
    }

    const tokens = [];
    runs.forEach(r => {
        const parts = r.text.split(/(\s+)/).filter(p => p.length > 0);
        parts.forEach(p => {
            const isSpace = /^\s+$/.test(p);
            tokens.push({
                text: isSpace ? ' ' : p, // 연속 공백은 1칸으로 정규화
                bold: r.bold, italic: r.italic, code: r.code,
                space: isSpace,
            });
        });
    });
    return tokens;
}

function tokenWidth(ctx, tok, size, fontName) {
    ctx.font = (tok.bold?'bold ':'') + (tok.italic?'italic ':'') + size + 'px ' + fontName;
    return ctx.measureText(tok.text).width;
}

// 토큰 배열을 주어진 폭(maxW)에 맞춰 줄 단위로 분해
function wrapTokens(ctx, tokens, maxW, size, fontName) {
    const lines = [];
    let line = [];
    let lineW = 0;

    tokens.forEach(tok => {
        if (tok.space && line.length === 0) return; // 줄 맨 앞 공백은 무시
        const w = tokenWidth(ctx, tok, size, fontName);

        if (line.length > 0 && lineW + w > maxW) {
            while (line.length && line[line.length-1].space) {
                lineW -= tokenWidth(ctx, line[line.length-1], size, fontName);
                line.pop();
            }
            lines.push(line);
            line = [];
            lineW = 0;
            if (tok.space) return; // 새 줄 시작에 공백 스킵
        }

        line.push(tok);
        lineW += w;
    });

    while (line.length && line[line.length-1].space) line.pop();
    if (line.length) lines.push(line);
    return lines;
}

// 스타일이 적용된 토큰 한 줄을 캔버스에 그리기
function drawTokenLine(ctx, tokens, x, y, size, fontName, align) {
    let totalW = 0;
    tokens.forEach(t => { totalW += tokenWidth(ctx, t, size, fontName); });

    let curX;
    if (align==='center') curX = x - totalW/2;
    else if (align==='right') curX = x - totalW;
    else curX = x;

    ctx.textAlign = 'left';
    tokens.forEach(t => {
        ctx.font = (t.bold?'bold ':'') + (t.italic?'italic ':'') + size + 'px ' + fontName;
        if (t.code) {
            const w = ctx.measureText(t.text).width;
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillRect(curX-2, y-size+2, w+4, size+2);
            ctx.restore();
        }
        ctx.fillText(t.text, curX, y);
        curX += ctx.measureText(t.text).width;
    });
    ctx.textAlign = 'left';
}

