import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const firebaseConfig={apiKey:'AIzaSyC3xILzwEFVRfPhUGA8nbovtQrBPABZ90o',authDomain:'polepolecafe.firebaseapp.com',projectId:'polepolecafe',storageBucket:'polepolecafe.firebasestorage.app',messagingSenderId:'904738626681',appId:'1:904738626681:web:3353825a57c7bd194e88a8'};
const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb);
let user=null,master={},state={checklists:[],notes:[],prep:[],history:[],stockAdjust:[],sales:[],prices:{},checkTaskExtras:[],everydayTaskExtras:[],dailyCheckTasks:{},dailyReminderTimes:{},dailyTaskDone:{},dailyTaskPriorities:{},evaPamphlets:{}},tab='check';
const notesSeenKey=()=>`pole_notes_seen_${user?.uid||user?.email||'guest'}`;
function updateNotesBadge(){const b=document.querySelector('#tabs button[data-tab="notes"]');if(!b)return;const seen=Number(localStorage.getItem(notesSeenKey())||0),unread=Math.max(0,(state.notes||[]).length-seen);b.innerHTML=`共有ノート${unread?` <span class="notice-badge">●</span>`:''}`;b.setAttribute('aria-label',unread?`共有ノートに未確認のお知らせが${unread}件あります`:'共有ノート');}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=n=>Number(n||0).toLocaleString('ja-JP',{maximumFractionDigits:0});
const today=()=>new Date().toLocaleDateString('sv-SE');
async function rolloverDailyTasks(){state.dailyCheckTasks=state.dailyCheckTasks||{};state.dailyTaskDone=state.dailyTaskDone||{};const current=today(),carry=[];for(const [date,items] of Object.entries(state.dailyCheckTasks)){if(date>=current)continue;const latest=(state.checklists||[]).filter(c=>c.date===date).slice(-1)[0];const done=new Set([...(state.dailyTaskDone[date]||[]),...(latest?.done||[])]);for(const item of (items||[]))if(!done.has(item))carry.push(item);state.dailyCheckTasks[date]=[]}if(carry.length)state.dailyCheckTasks[current]=[...new Set([...(state.dailyCheckTasks[current]||[]),...carry])];}
const tasks=['電気類','空調','鍵','BGM','ゴミ','洗い物','発注','SNS','在庫管理入力','レジ','店休日POP'];
const everydayTasks=()=>[...tasks,...(state.everydayTaskExtras||[])];
const nav=$('#tabs');
nav.insertAdjacentHTML('beforeend','<button data-tab="sales">売上管理</button><button data-tab="recipes">商品・レシピ</button>');
async function load(){
  const d=await fetch('./data%20.json');if(!d.ok)throw new Error('data .jsonを読み込めません');
  master=await d.json();
  try{
    const s=await getDoc(doc(db,'shared','appData'));
    if(s.exists()){
      state={...state,...s.data()};
      state.dailyCheckTasks=state.dailyCheckTasks||{};
      state.dailyTaskPriorities=state.dailyTaskPriorities||{};
      state.everydayTaskExtras=state.everydayTaskExtras||[];
      // 毎日の固定項目とは別に、日ごとの追加作業を管理する。
      // 誤って登録されたソーセージ・ベーコンは、過去の日付を含めて共有データから除去する。
      let cleaned=false;
      state.dailyCheckTasks=state.dailyCheckTasks||{};
      for(const [date,items] of Object.entries(state.dailyCheckTasks)){
        const next=(items||[]).filter(t=>!['ソーセージ','ベーコン'].includes(typeof t==='string'?t:t?.name));
        if(next.length!==(items||[]).length){state.dailyCheckTasks[date]=next;cleaned=true;}
      }
      if((state.checkTaskExtras||[]).some(t=>['ソーセージ','ベーコン'].includes(t)))cleaned=true;
      state.checkTaskExtras=(state.checkTaskExtras||[]).filter(t=>!['ソーセージ','ベーコン'].includes(t));
      if(cleaned)await save();
      if(state.stockData)for(const [k,v] of Object.entries(state.stockData))if(master.stock[k])master.stock[k]=v;
      if(state.recipesData)master.recipes=state.recipesData;
      if(state.productsData)master.products=state.productsData;
      if(state.pricesData)state.prices=state.pricesData;
      if(state.manualData)master.manual=state.manualData;
    }else await save();
    await rolloverDailyTasks();
    await save();
  }catch(e){$('#loginMsg').textContent='共有データに接続できません: '+e.message}
}
async function save(){
  if(!user)return;
  // 優先順位は専用の部分更新で保存し、他画面の古いstateで上書きしない。
  const {dailyTaskPriorities,...sharedState}=state;
  await setDoc(doc(db,'shared','appData'),{...sharedState,stockData:master.stock,recipesData:master.recipes,productsData:master.products,pricesData:state.prices,manualData:master.manual,updatedAt:serverTimestamp()},{merge:true});
}
function show(){$('#tabs').hidden=!user;$('#login').hidden=!!user;$('#authState').textContent=user?(user.email||'ログイン中'):'未ログイン';if(user)render()}
onAuthStateChanged(auth,async u=>{user=u;if(u){try{await load();show()}catch(e){$('#loginMsg').textContent=e.message;show()}}else show()});
$('#loginBtn').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('#email').value,$('#password').value);$('#loginMsg').textContent=''}catch(e){$('#loginMsg').textContent=e.message}};
$('#signupBtn').onclick=async()=>{try{await createUserWithEmailAndPassword(auth,$('#email').value,$('#password').value);$('#loginMsg').textContent='登録しました'}catch(e){$('#loginMsg').textContent=e.message}};
$('#tabs').onclick=e=>{let b=e.target.closest('button[data-tab]');if(!b)return;tab=b.dataset.tab;render()};
function render(){
  if(tab==='notes')localStorage.setItem(notesSeenKey(),String((state.notes||[]).length));
  updateNotesBadge();
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  let a=$('#app');
  if(tab==='check')a.innerHTML=checkUI();
  if(tab==='stock')a.innerHTML=stockUI();
  if(tab==='prep')a.innerHTML=prepUI();
  if(tab==='manual')a.innerHTML=manualUI();
  if(tab==='notes')a.innerHTML=notesUI();
  if(tab==='records')a.innerHTML=recordsUI();
  if(tab==='sales')a.innerHTML=salesUI();
  if(tab==='recipes')a.innerHTML=recipesUI();
  wire();
}
function checkSalesHTML(date){const daily=(state.sales||[]).filter(s=>s.date===date);const total=daily.reduce((n,s)=>n+Number(s.amount||0),0);const grouped={};daily.forEach(s=>{if(!grouped[s.product])grouped[s.product]={qty:0,amount:0};grouped[s.product].qty+=Number(s.qty||0);grouped[s.product].amount+=Number(s.amount||0)});return `<div class="item"><b>売上合計：¥${yen(total)}</b>${Object.entries(grouped).map(([name,v])=>`<div>${esc(name)} ×${v.qty}　¥${yen(v.amount)}</div>`).join('')||'<div class="muted">売上登録なし</div>'}</div>`}
function dailyTaskRows(date){const order={'必須（今日中）':0,'できれば今日':1,'後回しOK':2};const priorities=state.dailyTaskPriorities?.[date]||{};return (state.dailyCheckTasks?.[date]||[]).map((t,index)=>({t,index,priority:priorities[t]||'できれば今日'})).sort((a,b)=>(order[a.priority]??1)-(order[b.priority]??1)||a.index-b.index).map(({t,priority})=>`<div class="check-row"><label class="check"><input type="checkbox" class="task daily-task" data-date="${esc(date)}" value="${esc(t)}" ${(state.dailyTaskDone?.[date]||[]).includes(t)?'checked':''}>${esc(t)}</label><select class="taskPriority" data-task="${esc(t)}" aria-label="${esc(t)}の優先順位"><option value="必須（今日中）" ${priority==='必須（今日中）'?'selected':''}>必須（今日中）</option><option value="できれば今日" ${priority==='できれば今日'?'selected':''}>できれば今日</option><option value="後回しOK" ${priority==='後回しOK'?'selected':''}>後回しOK</option></select><button type="button" class="danger" data-delete-daily-task="${esc(t)}">削除</button></div>`).join('')}
function dailyReminderHTML(date){const value=state.dailyReminderTimes?.[date]||'';const pending=state.dailyCheckTasks?.[date]||[];const now=new Date();const current=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');const due=!!value&&current>=value&&pending.length>0;return `<div class="item"><b>未完了のお知らせ時刻</b><div class="row"><input id="dailyReminderTime" type="time" value="${esc(value)}"><button id="saveReminderTime" class="sub">時刻を保存</button></div><div class="muted">毎日ではなく、日付ごとに設定できます。${due?`<br><b>未完了の作業があります：</b>${pending.map(esc).join('、')}`:''}</div></div>`}
function checkUI(){const date=today();return `<div class="card"><h2>業務チェック</h2><div id="dailyReminder">${dailyReminderHTML(date)}</div><div class="row"><input id="staff" placeholder="スタッフ名"><input id="workdate" type="date" value="${date}"></div><h3>毎日やること</h3><div id="everydayTasks">${everydayTasks().map(t=>`<div class="check-row"><label class="check"><input type="checkbox" class="task" value="${esc(t)}">${esc(t)}</label>${(state.everydayTaskExtras||[]).includes(t)?`<button type="button" class="danger" data-delete-everyday="${esc(t)}">削除</button>`:''}</div>`).join('')}</div><div class="row"><input id="newEverydayTask" placeholder="毎日やることに追加する項目"><button id="addEverydayTask" class="sub">追加</button></div><h3>今日やること</h3><div id="todayTasks">${dailyTaskRows(date)}</div><div class="row"><input id="newCheckTask" placeholder="今日追加する作業（仕込み・マネージャーからの指示など）"><button id="addCheckTask" class="sub">項目を追加</button></div><h3>売上確認</h3><div id="checkSalesSummary">${checkSalesHTML(date)}</div><p>両替</p><label><input type="radio" name="change" value="有り"> 有り</label> <label><input type="radio" name="change" value="無し"> 無し</label><h3>概況</h3><textarea id="overview"></textarea><h3>共有・発注</h3><textarea id="orderShare"></textarea><div class="actions"><button id="saveCheck">チェックを保存</button><button class="sub" id="shareCheck">LINE共有</button></div></div>`}
function stockUI(){return `<div class="card"><h2>在庫管理</h2><p class="muted">入庫・廃棄・販売を記録します。</p><input id="stockSearch" placeholder="在庫を検索"><div id="stockList">${Object.entries(master.stock||{}).map(([n,v])=>`<div class="item stockrow"><b>${esc(n)}</b><span class="pill">現在庫 ${v.current}</span><div class="row"><input type="number" min="0" step="0.1" placeholder="数量" id="qty-${encodeURIComponent(n)}"><button data-stock="in" data-name="${esc(n)}">入庫＋</button><button class="danger" data-stock="out" data-name="${esc(n)}">廃棄−</button></div></div>`).join('')}</div><p class="muted">販売の登録は「売上管理」から行います。</p></div>`}
function prepUI(){return `<div class="card"><h2>仕込み管理</h2><input id="prepName" placeholder="仕込み品目"><div class="row"><input id="prepQty" placeholder="数量"><input id="prepStaff" placeholder="担当者"></div><textarea id="prepNote" placeholder="メモ"></textarea><button id="addPrep">仕込みを登録</button></div><div class="card"><h3>仕込み項目（マニュアルより）</h3>${(master.prep||[]).map(x=>`<div class="item"><b>${esc(x.item)}</b><div>${esc(x.content)}</div><div class="muted">${esc(x.caution)}</div></div>`).join('')}${state.prep.map((p,i)=>`<div class="item"><b>${esc(p.name)}</b> ${esc(p.qty)} <span class="pill">${esc(p.status)}</span><div class="muted">${esc(p.staff)} · ${esc(p.date)}</div><button data-prepdone="${i}">完了</button></div>`).join('')}</div>`}
function manualUI(){
 const sections=master.manual||{};
 return `<div class="card"><h2>マニュアル</h2><input id="manualSearch" placeholder="項目・手順を検索"><div id="manualSections">${Object.entries(sections).map(([section,items],si)=>`<details class="manual-section"><summary><b>${esc(section)}</b></summary><div class="manual-items">${(items||[]).map((x,i)=>`<details class="manual-entry"><summary><b>${esc(x.item)}</b></summary><div class="item"><div>${esc(x.content)}</div>${x.caution?`<div class="muted">注意：${esc(x.caution)}</div>`:'' }<div class="actions"><button data-manual-edit="${si}:${i}" class="sub">編集</button><button data-manual-delete="${si}:${i}" class="danger">削除</button></div></div></details>`).join('')}</div></details>`).join('')}</div><hr><h3>項目を追加</h3><input id="manualNewSection" placeholder="見出し（例：開店準備）"><input id="manualNewItem" placeholder="項目名"><textarea id="manualNewContent" placeholder="手順・内容"></textarea><textarea id="manualNewCaution" placeholder="注意事項（任意）"></textarea><button id="manualAdd">追加して保存</button><p id="manualMsg" class="muted"></p></div>`;
}
function notesUI(){return `<div class="card"><h2>共有ノート</h2><input id="noteTitle" placeholder="タイトル"><textarea id="noteBody" placeholder="共有内容"></textarea><button id="addNote">共有ノートを投稿</button></div><div class="card">${state.notes.slice().reverse().map((n,i)=>`<div class="item"><b>${esc(n.title)}</b><div>${esc(n.body)}</div><div class="muted">${esc(n.author)} · ${esc(n.date)}</div><button class="danger" data-delnote="${state.notes.length-1-i}">削除</button></div>`).join('')}</div>`}
function recordsUI(){return `<div class="card"><h2>記録</h2><h3>業務チェック</h3>${state.checklists.map((c,i)=>`<div class="item"><b>${esc(c.date)} · ${esc(c.staff)}</b><div class="muted">完了 ${c.done.length}/${(c.taskLabels||tasks).length}</div><div class="record-unfinished"><b>未完了：</b>${(c.taskLabels||tasks).filter(t=>!(c.done||[]).includes(t)).map(t=>esc(t)).join("、")||"なし"}</div><div class="muted">${Object.entries(c.priority||{}).filter(([k,v])=>v!=='通常').map(([k,v])=>`${esc(k)}：${esc(v)}`).join(' ／ ')}</div><div>${esc(c.overview)}</div><button data-share-saved-check="${i}">この記録をLINE共有</button></div>`).join('')}<h3>在庫の履歴</h3>${state.stockAdjust.slice().reverse().map(x=>`<div class="item">${esc(x.date)} · ${esc(x.name)} ${x.delta>0?'+':''}${x.delta} (${esc(x.type)})</div>`).join('')}<h3>売上履歴</h3>${(state.sales||[]).slice().reverse().map(s=>`<div class="item">${esc(s.date)} · ${esc(s.product)} ×${s.qty} · ¥${yen(s.amount)}</div>`).join('')}<h3>仕込み履歴</h3>${state.prep.map(p=>`<div class="item">${esc(p.date)} · ${esc(p.name)} ${esc(p.qty)} ${esc(p.status)}</div>`).join('')}</div>`}
function salesTaxRate(productName,takeout){const product=(master.products||[]).find(p=>p.name===productName);const isEva=product?.category==='エヴァンゲリオン'||['初号機ブラックドーナツ','赤き覚醒Ｌ.C.Ｌ.レッドジンジャー'].includes(productName);return takeout&&!isEva?8:10}
function updateSalesTaxLabel(){const p=$('#salesProduct')?.value||'',takeout=!!$('#salesTakeout')?.checked,label=$('#salesTaxLabel');if(label)label.textContent=p?('適用税率：'+salesTaxRate(p,takeout)+'%（税込価格）'):'商品を選択してください'}
function evaSummary(date){const daily=(state.sales||[]).filter(s=>s.date===date);const donuts=daily.filter(s=>String(s.product||'').includes('ドーナツ')).reduce((n,s)=>n+Number(s.qty||0),0);const drinks=daily.filter(s=>String(s.product||'').includes('レッドジンジャー')||String(s.product||'').includes('ドリンク')).reduce((n,s)=>n+Number(s.qty||0),0);return {donuts,drinks,stickers:donuts+drinks,pamphlets:Number(state.evaPamphlets?.[date]||0)};}
function evaSummaryHTML(date){const e=evaSummary(date);return `<div>ドーナツ：${e.donuts}個</div><div>ドリンク：${e.drinks}杯</div><div>ステッカー：${e.stickers}枚</div><div>パンフレット：${e.pamphlets}部</div>`;}
function salesShareLines(date){const daily=(state.sales||[]).filter(s=>s.date===date);const total=daily.reduce((n,s)=>n+Number(s.amount||0),0);const byTax={10:0,8:0};const grouped={};daily.forEach(s=>{const rate=Number(s.taxRate||10);byTax[rate]=(byTax[rate]||0)+Number(s.amount||0);if(!grouped[s.product])grouped[s.product]={qty:0,amount:0};grouped[s.product].qty+=Number(s.qty||0);grouped[s.product].amount+=Number(s.amount||0)});const salesText=Object.entries(grouped).map(([name,v])=>`${name} ×${v.qty}　¥${yen(v.amount)}`).join('\n')||'売上登録なし';const e=evaSummary(date);return ['【売上報告】','売上合計：¥'+yen(total),'10％対象（税込）：¥'+yen(byTax[10]||0),'8％対象（税込）：¥'+yen(byTax[8]||0),'【商品別売上】',salesText,'【エヴァ集計】','ドーナツ：'+e.donuts+'個','ドリンク：'+e.drinks+'杯','ステッカー：'+e.stickers+'枚','パンフレット：'+e.pamphlets+'部'];}
function salesUI(){
 const products=master.products||[];
 const daily=(state.sales||[]).filter(s=>s.date===today());
 const total=daily.reduce((n,s)=>n+Number(s.amount||0),0);
 return `<div class="card"><h2>売上管理</h2><div class="pill">本日の売上合計 ¥${yen(total)}</div><div class="row"><input id="salesDate" type="date" value="${today()}"><select id="salesProduct"><option value="">商品を選択</option>${products.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}</select></div><label class="check"><input id="salesTakeout" type="checkbox"> テイクアウト</label><p id="salesTaxLabel" class="muted">商品を選択してください</p><div class="row"><input id="salesQty" type="number" min="1" step="1" value="1" placeholder="数量"><input id="salesPrice" type="number" min="0" step="1" placeholder="販売価格（税込・円）"></div><button id="recordSale">売上を登録・在庫を減らす</button><p class="muted">販売価格は税込で入力してください。店内は10%、テイクアウトは8%。ただしエヴァのドーナツ・ドリンクはテイクアウトでも10%です。商品ごとの価格は下で登録できます。</p></div><div class="card"><h3>エヴァ集計</h3><div id="evaSummary">${evaSummaryHTML(today())}</div><div class="row"><label for="evaPamphlets">パンフレット配布数</label><input id="evaPamphlets" type="number" min="0" step="1" value="${state.evaPamphlets?.[today()]??0}"></div><p class="muted">ドーナツ・ドリンクは売上登録数から自動集計、ステッカーは合計数です。</p></div><div class="card"><h3>商品別価格設定（税込）</h3>${products.map(p=>`<div class="row price-row"><label>${esc(p.name)}</label><input type="number" min="0" step="1" data-price="${esc(p.name)}" value="${state.prices?.[p.name]??''}" placeholder="円"><button data-saveprice="${esc(p.name)}">保存</button></div>`).join('')}</div><div class="card"><h3>売上記録</h3><div id="salesList">${(state.sales||[]).slice().reverse().map((s,i)=>`<div class="item"><b>${esc(s.date)}　${esc(s.product)}</b><div>数量 ${s.qty} × ¥${yen(s.price)} = <b>¥${yen(s.amount)}</b></div><div class="muted">${s.taxRate?((s.takeout?'テイクアウト':'店内')+'・消費税'+s.taxRate+'%（税込）'):''} ${esc(s.staff||'')}</div><button class="danger" data-delsale="${state.sales.length-1-i}">この売上を取消</button></div>`).join('')||'<p class="muted">売上記録はまだありません。</p>'}</div></div>`;
}
function recipesUI(){
 const products=master.products||[];
 return `<div class="card"><h2>商品・レシピ管理</h2><h3>商品を追加</h3><div class="row"><input id="newProduct" placeholder="商品名"><input id="newCategory" placeholder="カテゴリ"></div><button id="addProduct">商品を追加</button><h3>登録済み商品</h3><select id="recipeProduct"><option value="">商品を選択</option>${products.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}</select><div id="recipeEditor"><p class="muted">商品を選ぶと現在のレシピが表示されます。</p></div></div>`;
}
function recipeEditorHTML(name){
 const rows=master.recipes?.[name]||[];
 return `<h3>${esc(name)} の材料</h3>${rows.map((r,i)=>`<div class="row recipe-row"><input data-rname="${i}" value="${esc(r.ingredient)}" placeholder="材料名"><input data-ramount="${i}" type="number" step="0.01" value="${r.amount}" placeholder="使用量"><input data-runit="${i}" value="${esc(r.unit||'')}" placeholder="単位"><button class="danger" data-rdel="${i}">削除</button></div>`).join('')}<h3>材料を追加</h3><div class="row"><input id="newIngredient" placeholder="材料名"><input id="newAmount" type="number" min="0" step="0.01" placeholder="使用量"><input id="newUnit" placeholder="単位"></div><div class="actions"><button id="addIngredient">材料を追加</button><button id="saveRecipe">レシピを保存</button></div><p class="muted">ここで登録した材料と使用量が、売上登録時の在庫減算に使われます。材料名は在庫管理の名称と一致させてください。</p>`;
}
function wireDailyTaskChecks(date){document.querySelectorAll('.daily-task').forEach(input=>{input.onchange=async()=>{state.dailyTaskDone=state.dailyTaskDone||{};const done=new Set(state.dailyTaskDone[date]||[]);if(input.checked)done.add(input.value);else done.delete(input.value);state.dailyTaskDone[date]=[...done];await save();$('#dailyReminder').innerHTML=dailyReminderHTML(date);wireReminderTime();};});}
function wireDailyTaskPriorities(date){document.querySelectorAll('.taskPriority').forEach(select=>select.onchange=async()=>{state.dailyTaskPriorities=state.dailyTaskPriorities||{};state.dailyTaskPriorities[date]=state.dailyTaskPriorities[date]||{};state.dailyTaskPriorities[date][select.dataset.task]=select.value;try{await setDoc(doc(db,'shared','appData'),{dailyTaskPriorities:state.dailyTaskPriorities,updatedAt:serverTimestamp()},{merge:true});}catch(e){alert('優先順位を保存できませんでした: '+e.message);return;}$('#todayTasks').innerHTML=dailyTaskRows(date);wireDailyTaskChecks(date);wireDailyTaskPriorities(date);wireDailyTaskDeletes(date);});}
function wireDailyTaskDeletes(date){document.querySelectorAll('[data-delete-daily-task]').forEach(b=>b.onclick=async()=>{const name=b.dataset.deleteDailyTask;state.dailyCheckTasks[date]=(state.dailyCheckTasks[date]||[]).filter(t=>t!==name);if(state.dailyTaskPriorities?.[date])delete state.dailyTaskPriorities[date][name];await save();$('#todayTasks').innerHTML=dailyTaskRows(date);wireDailyTaskChecks(date);wireDailyTaskPriorities(date);wireDailyTaskDeletes(date);});}
function wireReminderTime(){const input=$('#dailyReminderTime'),button=$('#saveReminderTime');if(!input||!button)return;button.onclick=async()=>{const date=$('#workdate').value;state.dailyReminderTimes=state.dailyReminderTimes||{};state.dailyReminderTimes[date]=input.value;await save();$('#dailyReminder').innerHTML=dailyReminderHTML(date);wireReminderTime();alert('この日の通知時刻を保存しました');};}
function wire(){
 let el=id=>document.getElementById(id);
 if(tab==='check'){
  el('addEverydayTask').onclick=async()=>{const name=el('newEverydayTask').value.trim();if(!name){alert('項目名を入力してください');return}if(everydayTasks().includes(name)){alert('同じ項目がすでにあります');return}state.everydayTaskExtras=[...(state.everydayTaskExtras||[]),name];await save();render()};
  document.querySelectorAll('[data-delete-everyday]').forEach(b=>b.onclick=async()=>{const name=b.dataset.deleteEveryday;if(!confirm(`「${name}」を毎日やることから削除しますか？`))return;state.everydayTaskExtras=(state.everydayTaskExtras||[]).filter(t=>t!==name);await save();render()});
  el('addCheckTask').onclick=async()=>{const name=el('newCheckTask').value.trim(),date=el('workdate').value;if(!name){alert('チェック項目名を入力してください');return}if(tasks.includes(name)||(state.dailyCheckTasks?.[date]||[]).includes(name)){alert('同じ項目がすでにあります');return}state.dailyCheckTasks=state.dailyCheckTasks||{};state.dailyCheckTasks[date]=[...(state.dailyCheckTasks[date]||[]),name];state.dailyTaskPriorities=state.dailyTaskPriorities||{};state.dailyTaskPriorities[date]=state.dailyTaskPriorities[date]||{};state.dailyTaskPriorities[date][name]='できれば今日';await save();render()};
  document.querySelectorAll('[data-delete-daily-task]').forEach(b=>b.onclick=async()=>{const date=el('workdate').value,name=b.dataset.deleteDailyTask;state.dailyCheckTasks[date]=(state.dailyCheckTasks[date]||[]).filter(t=>t!==name);await save();render()});
  el('workdate').onchange=()=>{const date=el('workdate').value;el('checkSalesSummary').innerHTML=checkSalesHTML(date);el('todayTasks').innerHTML=dailyTaskRows(date);el('dailyReminder').innerHTML=dailyReminderHTML(date);wireReminderTime();wireDailyTaskChecks(date);wireDailyTaskPriorities(date);wireDailyTaskDeletes(date)};
  wireReminderTime();wireDailyTaskChecks(el('workdate').value);wireDailyTaskPriorities(el('workdate').value);
  el('saveCheck').onclick=async()=>{const date=el('workdate').value,labels=[...everydayTasks(),...new Set([...(state.dailyTaskDone?.[date]||[]),...(state.dailyCheckTasks?.[date]||[])])];let done=[...new Set([...document.querySelectorAll('.task:checked')].map(x=>x.value).concat(state.dailyTaskDone?.[date]||[]))],priority=Object.fromEntries([...document.querySelectorAll('.taskPriority')].map(x=>[x.dataset.task,x.value])),c={date,staff:el('staff').value,done,priority,taskLabels:labels,change:document.querySelector('input[name=change]:checked')?.value||'',overview:el('overview').value,orderShare:el('orderShare').value};state.checklists.push(c);await save();alert('保存しました')};
  el('shareCheck').onclick=()=>{
   const date=el('workdate').value;
   const msg=['【POLEPOLE CAFE 業務報告】','日付：'+date,'担当：'+el('staff').value,'完了：'+[...document.querySelectorAll('.task:checked')].map(x=>x.value).join('、'),'両替：'+(document.querySelector('input[name=change]:checked')?.value||'未入力'),'概況：'+(el('overview').value||''),'共有・発注：'+(el('orderShare').value||''),...salesShareLines(date)].join('\\n');
   window.location.href='https://line.me/R/share?text='+encodeURIComponent(msg);
  };
 }
 if(tab==='records'){
  document.querySelectorAll('[data-share-saved-check]').forEach(b=>b.onclick=()=>{
   const c=state.checklists[Number(b.dataset.shareSavedCheck)];if(!c)return;
   const msg=['【POLEPOLE CAFE 業務報告】','日付：'+c.date,'担当：'+(c.staff||''),'完了：'+(c.done||[]).join('、'),'両替：'+(c.change||'未入力'),'概況：'+(c.overview||''),'共有・発注：'+(c.orderShare||''),...salesShareLines(c.date)].join('\\n');
   window.location.href='https://line.me/R/share?text='+encodeURIComponent(msg);
  });
 }
 if(tab==='stock'){
  document.querySelectorAll('[data-stock]').forEach(b=>b.onclick=async()=>{let n=b.dataset.name,q=Number(el('qty-'+encodeURIComponent(n)).value||0);if(!q)return;let d=b.dataset.stock==='in'?q:-q;master.stock[n].current+=d;state.stockAdjust.push({name:n,delta:d,type:b.dataset.stock==='in'?'入庫':'廃棄',date:new Date().toLocaleString('ja-JP')});await save();render()});
  el('stockSearch').oninput=()=>document.querySelectorAll('.stockrow').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(el('stockSearch').value.toLowerCase()));
 }
 if(tab==='sales'){
  el('salesDate').onchange=()=>{const date=el('salesDate').value;el('evaSummary').innerHTML=evaSummaryHTML(date);el('evaPamphlets').value=state.evaPamphlets?.[date]??0;};
  el('evaPamphlets').onchange=async()=>{const date=el('salesDate').value;state.evaPamphlets=state.evaPamphlets||{};state.evaPamphlets[date]=Math.max(0,Math.floor(Number(el('evaPamphlets').value||0)));await save();};
  el('salesProduct').onchange=()=>{let p=el('salesProduct').value;el('salesPrice').value=state.prices?.[p]??'';updateSalesTaxLabel()};
  el('salesTakeout').onchange=updateSalesTaxLabel;
  updateSalesTaxLabel();
  document.querySelectorAll('[data-saveprice]').forEach(b=>b.onclick=async()=>{let p=b.dataset.saveprice,inp=document.querySelector(`[data-price="${CSS.escape(p)}"]`),v=Number(inp.value);if(inp.value===''||v<0){alert('価格を入力してください');return}state.prices[p]=v;await save();alert('価格を保存しました')});
  el('recordSale').onclick=async()=>{
   const p=el('salesProduct').value,q=Number(el('salesQty').value),price=Number(el('salesPrice').value),date=el('salesDate').value;
   if(!p||!date||!Number.isInteger(q)||q<1||el('salesPrice').value===''||price<0){alert('商品・日付・数量・販売価格を確認してください');return}
   const recipe=master.recipes?.[p]||[];
   if(recipe.length&&recipe.some(r=>!master.stock[r.ingredient]||!Number(r.amount))){if(!confirm('レシピに在庫未登録の材料、または使用量0の材料があります。このまま売上だけ登録しますか？'))return}
   for(const r of recipe){if(master.stock[r.ingredient]&&Number(r.amount)){const d=-Number(r.amount)*q;master.stock[r.ingredient].current+=d;state.stockAdjust.push({name:r.ingredient,delta:d,type:'販売:'+p,date:new Date().toLocaleString('ja-JP')})}}
   if(!recipe.length&&master.stock[p]){master.stock[p].current-=q;state.stockAdjust.push({name:p,delta:-q,type:'販売:'+p,date:new Date().toLocaleString('ja-JP')})}
   state.prices[p]=price;const takeout=el('salesTakeout').checked,taxRate=salesTaxRate(p,takeout),amount=q*price,taxAmount=Math.round(amount*taxRate/(100+taxRate));state.sales.push({date,product:p,qty:q,price,amount,takeout,taxRate,taxAmount,staff:user?.email||'',createdAt:new Date().toISOString()});
   await save();alert('売上を登録しました。在庫も更新しました。');render();
  };
  document.querySelectorAll('[data-delsale]').forEach(b=>b.onclick=async()=>{if(!confirm('この売上記録を削除しますか？在庫は自動では戻りません。'))return;state.sales.splice(+b.dataset.delsale,1);await save();render()});
 }
 if(tab==='recipes'){
  el('addProduct').onclick=async()=>{let name=el('newProduct').value.trim(),category=el('newCategory').value.trim();if(!name){alert('商品名を入力してください');return}if(master.products.some(p=>p.name===name)){alert('同じ商品名が登録済みです');return}master.products.push({name,category});await save();render();el('recipeProduct').value=name;el('recipeEditor').innerHTML=recipeEditorHTML(name);wireRecipeEditor(name)};
  el('recipeProduct').onchange=()=>{let name=el('recipeProduct').value;el('recipeEditor').innerHTML=name?recipeEditorHTML(name):'<p class="muted">商品を選ぶと現在のレシピが表示されます。</p>';if(name)wireRecipeEditor(name)};
 }
 if(tab==='prep'){el('addPrep').onclick=async()=>{state.prep.push({name:el('prepName').value,qty:el('prepQty').value,staff:el('prepStaff').value,note:el('prepNote').value,status:'未完了',date:new Date().toLocaleString('ja-JP')});await save();render()};document.querySelectorAll('[data-prepdone]').forEach(b=>b.onclick=async()=>{state.prep[+b.dataset.prepdone].status='完了';await save();render()})}
 if(tab==='notes'){el('addNote').onclick=async()=>{state.notes.push({title:el('noteTitle').value,body:el('noteBody').value,author:user.email,date:new Date().toLocaleString('ja-JP'),createdAt:Date.now()});await save();localStorage.setItem(notesSeenKey(),String(state.notes.length));render()};document.querySelectorAll('[data-delnote]').forEach(b=>b.onclick=async()=>{state.notes.splice(+b.dataset.delnote,1);await save();render()})}
 if(tab==='manual'){
  const sections=Object.keys(master.manual||{});
  el('manualAdd').onclick=async()=>{
   const section=el('manualNewSection').value.trim(),item=el('manualNewItem').value.trim(),content=el('manualNewContent').value.trim(),caution=el('manualNewCaution').value.trim();
   if(!section||!item||!content){el('manualMsg').textContent='見出し・項目名・内容を入力してください';return}
   if(!master.manual)master.manual={};if(!Array.isArray(master.manual[section]))master.manual[section]=[];
   master.manual[section].push({item,content,caution});await save();render();
  };
  el('manualSearch').oninput=()=>{const q=el('manualSearch').value.trim().toLowerCase();document.querySelectorAll('.manual-section').forEach(d=>{let hit=!q||d.textContent.toLowerCase().includes(q);d.hidden=!hit;if(q&&hit)d.open=true})};
  document.querySelectorAll('[data-manual-edit]').forEach(b=>b.onclick=async()=>{
   const [si,ii]=b.dataset.manualEdit.split(':').map(Number),key=Object.keys(master.manual)[si],entry=master.manual[key][ii];
   const item=prompt('項目名',entry.item);if(item===null)return;
   const content=prompt('手順・内容',entry.content);if(content===null)return;
   const caution=prompt('注意事項（不要なら空欄）',entry.caution||'');if(caution===null)return;
   if(!item.trim()||!content.trim()){alert('項目名と内容は必須です');return}
   master.manual[key][ii]={item:item.trim(),content:content.trim(),caution:caution.trim()};await save();render();
  });
  document.querySelectorAll('[data-manual-delete]').forEach(b=>b.onclick=async()=>{
   const [si,ii]=b.dataset.manualDelete.split(':').map(Number),key=Object.keys(master.manual)[si];
   if(!confirm(`「${master.manual[key][ii].item}」を削除しますか？`))return;
   master.manual[key].splice(ii,1);if(!master.manual[key].length)delete master.manual[key];await save();render();
  });
 }
}
function wireRecipeEditor(name){
 const host=$('#recipeEditor');
 host.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{const rows=readRecipeRows(host);rows.splice(+b.dataset.rdel,1);master.recipes[name]=rows;host.innerHTML=recipeEditorHTML(name);wireRecipeEditor(name)});
 host.querySelector('#addIngredient').onclick=()=>{const rows=readRecipeRows(host),ingredient=host.querySelector('#newIngredient').value.trim(),amount=Number(host.querySelector('#newAmount').value),unit=host.querySelector('#newUnit').value.trim();if(!ingredient||!host.querySelector('#newAmount').value||amount<=0){alert('材料名と使用量を入力してください');return}rows.push({ingredient,amount,unit});master.recipes[name]=rows;host.innerHTML=recipeEditorHTML(name);wireRecipeEditor(name)};
 host.querySelector('#saveRecipe').onclick=async()=>{master.recipes[name]=readRecipeRows(host);await save();alert('レシピを保存しました')};
}
function readRecipeRows(host){return [...host.querySelectorAll('[data-rname]')].map((x,i)=>({ingredient:x.value.trim(),amount:Number(host.querySelector(`[data-ramount="${i}"]`).value||0),unit:host.querySelector(`[data-runit="${i}"]`).value.trim()})).filter(r=>r.ingredient)}
