// pag-de-gastos.js
// Este archivo contiene la lógica JS de la app (antes en <script> en el HTML)

// Elementos
const tbody = document.querySelector('#gastos-table tbody');
const registroTbody = document.querySelector('#registro-table tbody');
const btnAdd = document.getElementById('add-row');
const btnAddReg = document.getElementById('add-reg-row');
const btnSaveReg = document.getElementById('btn-save-reg');
const tabGastos = document.getElementById('tab-gastos');
const tabRegistro = document.getElementById('tab-registro');
const tabTiendas = document.getElementById('tab-tiendas');
const viewGastos = document.getElementById('view-gastos');
const viewRegistro = document.getElementById('view-registro');
const viewTiendas = document.getElementById('view-tiendas');
const tiendasCards = document.getElementById('tiendas-cards');
const tiendaDetail = document.getElementById('tienda-detail');
const tiendaBack = document.getElementById('tienda-back');
const tiendaDetailName = document.getElementById('tienda-detail-name');
const tiendaDetailList = document.getElementById('tienda-detail-list');
const btnClear = document.getElementById('btn-clear');

const STORAGE_KEY = 'pagGastos:v1';

function formatCurrency(v){ return '$' + Number(v||0).toFixed(2); }

function createCellInput(type, attrs={}){ const td=document.createElement('td'); const input=document.createElement('input'); input.type=type; Object.keys(attrs).forEach(k=>input.setAttribute(k, attrs[k])); td.appendChild(input); return {td,input}; }

function normalizeStoreName(s){ if(!s) return ''; s = s.toString().trim(); if(!s) return ''; s = s.toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

// debounce
function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
const autoSave = debounce(()=>saveState(), 500);

function addRow(name='', store='', price='', qty=1){
  const tr=document.createElement('tr');
  const {td:tdName,input:inName}=createCellInput('text',{}); inName.placeholder='Artículo'; inName.value=name; tr.appendChild(tdName);
  const {td:tdStore,input:inStore}=createCellInput('text',{}); inStore.placeholder='Tienda'; inStore.classList.add('store'); inStore.value=store; tr.appendChild(tdStore);
  const {td:tdPrice,input:inPrice}=createCellInput('number',{step:'0.01',min:'0'}); inPrice.classList.add('price'); inPrice.placeholder='Precio'; inPrice.value = price===''? '' : Number(price).toFixed(2); tr.appendChild(tdPrice);
  const {td:tdQty,input:inQty}=createCellInput('number',{step:'1',min:'0'}); inQty.classList.add('qty'); inQty.value = qty||0; tr.appendChild(tdQty);
  const tdTotal=document.createElement('td'); tdTotal.className='right'; tdTotal.textContent = formatCurrency(0); tr.appendChild(tdTotal);
  const tdAct=document.createElement('td'); tdAct.className = 'actions';
  const bSave=document.createElement('button'); bSave.className='btn'; bSave.textContent='Guardar'; bSave.style.marginRight='8px';
  const bDel=document.createElement('button'); bDel.className='btn btn-danger'; bDel.textContent='Eliminar';
  tdAct.appendChild(bSave); tdAct.appendChild(bDel); tr.appendChild(tdAct);

  function update(){ const p=parseFloat(inPrice.value)||0; const q=parseInt(inQty.value)||0; tdTotal.textContent=formatCurrency(p*q); updateGrandTotal(); }

  inPrice.addEventListener('input', ()=>{
    const raw = inPrice.value.toString().trim();
    const m = raw.match(/^(\s*-?\d+(?:[\.,]\d+)?)(?:\s*[x×*]\s*(\d+))?\s*$/);
    if(m){ const pv=parseFloat(m[1].replace(',','.')); if(!isNaN(pv)) inPrice.value = pv; if(m[2]) inQty.value = parseInt(m[2],10); }
    // Si el usuario modifica el precio, asegurarnos de que el botón muestre "Guardar"
    if (bSave && bSave.textContent !== 'Guardar') bSave.textContent = 'Guardar';
    update(); autoSave();
  });
  inQty.addEventListener('input', ()=>{ inQty.value = Math.max(0, parseInt(inQty.value)||0); update(); autoSave(); });
  inQty.addEventListener('input', ()=>{ if (bSave && bSave.textContent !== 'Guardar') bSave.textContent = 'Guardar'; inQty.value = Math.max(0, parseInt(inQty.value)||0); update(); autoSave(); });
  inName.addEventListener('input', ()=>{ if (bSave && bSave.textContent !== 'Guardar') bSave.textContent = 'Guardar'; autoSave(); });
  inStore.addEventListener('input', ()=>{ if (bSave && bSave.textContent !== 'Guardar') bSave.textContent = 'Guardar'; autoSave(); });

  bDel.addEventListener('click', ()=>{ tr.remove(); updateGrandTotal(); updateStoresView(); saveState(); });
  bSave.addEventListener('click', ()=>{
    const saving = bSave.textContent === 'Guardar';
    if (saving){
      // Guardar: normalizar y bloquear campos
      inStore.value = normalizeStoreName(inStore.value);
      inPrice.value = (parseFloat(inPrice.value)||0).toFixed(2);
      inQty.value = parseInt(inQty.value)||0;
      inName.disabled = true; inPrice.disabled=true; inQty.disabled=true; inStore.disabled=true;
      bSave.textContent = 'Editar';
      update(); saveState(); updateStoresView();
    } else {
      // Editar: desbloquear
      inName.disabled = false; inPrice.disabled=false; inQty.disabled=false; inStore.disabled=false;
      bSave.textContent = 'Guardar';
      inName.focus();
    }
  });

  tbody.appendChild(tr); update(); saveState();
}

const grandTotalEl = document.getElementById('grand-total');
function updateGrandTotal(){ let s=0; tbody.querySelectorAll('tr').forEach(tr=>{ const t=tr.querySelector('td.right'); if(!t) return; const n=parseFloat(t.textContent.replace(/[^0-9.-]+/g,''))||0; s+=n; }); if(grandTotalEl) grandTotalEl.textContent = formatCurrency(s); }

// Registro
function createRegistroRow(article='', store='', price=''){
  const tr = document.createElement('tr');
  const tdA = document.createElement('td');
  const inA = document.createElement('input'); inA.type = 'text'; inA.value = article; tdA.appendChild(inA); tr.appendChild(tdA);

  const tdS = document.createElement('td');
  const inS = document.createElement('input'); inS.type = 'text'; inS.value = store; tdS.appendChild(inS); tr.appendChild(tdS);

  const tdP = document.createElement('td');
  const inP = document.createElement('input'); inP.type = 'number'; inP.step = '0.01'; inP.min = '0'; inP.value = price===''? '' : Number(price).toFixed(2);
  inP.classList.add('price'); tdP.appendChild(inP); tr.appendChild(tdP);

  const tdT = document.createElement('td'); tdT.className = 'right'; tdT.textContent = formatCurrency(parseFloat(inP.value||0)); tr.appendChild(tdT);

  const tdAct = document.createElement('td'); tdAct.className = 'actions';
  const bEdit = document.createElement('button'); bEdit.className = 'btn'; bEdit.textContent = 'Editar'; bEdit.style.marginRight = '8px';
  const bDel = document.createElement('button'); bDel.className = 'btn btn-danger'; bDel.textContent = 'Eliminar';
  tdAct.appendChild(bEdit); tdAct.appendChild(bDel); tr.appendChild(tdAct);

  inP.addEventListener('input', ()=>{ if (bEdit && bEdit.textContent !== 'Guardar') bEdit.textContent = 'Guardar'; tdT.textContent = formatCurrency(parseFloat(inP.value)||0); autoSave(); comparePrices(); updateStoresView(); });
  inA.addEventListener('input', ()=>{ if (bEdit && bEdit.textContent !== 'Guardar') bEdit.textContent = 'Guardar'; autoSave(); comparePrices(); updateStoresView(); });
  inS.addEventListener('input', ()=>{ if (bEdit && bEdit.textContent !== 'Guardar') bEdit.textContent = 'Guardar'; autoSave(); updateStoresView(); });
  bDel.addEventListener('click', ()=>{ tr.remove(); comparePrices(); updateStoresView(); saveState(); });
  bEdit.addEventListener('click', ()=>{
    // Alterna entre modo edición y guardado
    inA.disabled = !inA.disabled;
    inS.disabled = !inS.disabled;
    inP.disabled = !inP.disabled;
    if(!inA.disabled){
      // Entrando a editar
      bEdit.textContent = 'Guardar';
      inA.focus();
    } else {
      // Saliendo de editar -> guardar valores
      inP.value = (parseFloat(inP.value)||0).toFixed(2);
      bEdit.textContent = 'Editar';
      saveState();
    }
  });

  registroTbody.appendChild(tr); comparePrices(); updateStoresView(); saveState();
}

function comparePrices(){ registroTbody.querySelectorAll('tr').forEach(tr=>tr.classList.remove('best-price','higher-price')); const groups = {}; registroTbody.querySelectorAll('tr').forEach(tr=>{ const a=(tr.querySelector('td:nth-child(1) input')?.value||'').trim().toLowerCase(); const p=parseFloat(tr.querySelector('td:nth-child(3) input')?.value)||0; if(!a) return; groups[a]=groups[a]||[]; groups[a].push({tr,p}); }); Object.values(groups).forEach(list=>{ let min=Infinity; list.forEach(i=>min=Math.min(min,i.p)); list.forEach(i=>{ if(Math.abs(i.p-min)<0.0001) i.tr.classList.add('best-price'); else i.tr.classList.add('higher-price'); }); }); }

function updateStoresView(){
  if(!tiendasCards) return;
  const map = new Map();

  // Primero: registros (registro-table)
  registroTbody.querySelectorAll('tr').forEach(tr=>{
    const a = (tr.querySelector('td:nth-child(1) input')?.value||'').trim();
    const s = (tr.querySelector('td:nth-child(2) input')?.value||'').trim();
    const p = parseFloat(tr.querySelector('td:nth-child(3) input')?.value)||0;
    if(!s) return;
    const key = s.toLowerCase();
    const display = normalizeStoreName(s);
    if(!map.has(key)) map.set(key,{display,articles:[]});
    if(a) map.get(key).articles.push({name:a,price:p});
  });

  // Segundo: incluir tiendas detectadas en la tabla de gastos (tbody)
  tbody.querySelectorAll('tr').forEach(tr=>{
    const article = (tr.querySelector('td:nth-child(1) input')?.value||'').trim();
    const store = (tr.querySelector('td:nth-child(2) input')?.value||'').trim();
    const price = parseFloat(tr.querySelector('td:nth-child(3) input')?.value)||0;
    if(!store) return;
    const key = store.toLowerCase();
    const display = normalizeStoreName(store);
    if(!map.has(key)) map.set(key,{display,articles:[]});
    if(article) map.get(key).articles.push({name:article,price:price});
  });

  tiendasCards.innerHTML='';
  Array.from(map.values()).forEach(obj=>{
    const card=document.createElement('div'); card.className='store-card';
    const h=document.createElement('h4'); h.textContent=obj.display; card.appendChild(h);
    const p=document.createElement('p'); p.textContent = obj.articles.length + ' artículo(s)'; card.appendChild(p);
    card.addEventListener('click', ()=>showStoreDetail(obj.display,obj.articles));
    tiendasCards.appendChild(card);
  });
}

function showStoreDetail(name, articles){ tiendaDetailName.textContent = name; tiendaDetailList.innerHTML=''; if(!articles || articles.length===0){ tiendaDetailList.textContent='No hay artículos.'; } else { const ul=document.createElement('ul'); articles.forEach(a=>{ const li=document.createElement('li'); li.textContent = a.name + ' ('+formatCurrency(a.price)+')'; ul.appendChild(li); }); tiendaDetailList.appendChild(ul); } tiendasCards.style.display='none'; tiendaDetail.style.display='block'; }
if(tiendaBack) tiendaBack.addEventListener('click', ()=>{ tiendaDetail.style.display='none'; tiendasCards.style.display='grid'; });

function saveState(){ try{ const gastos=[]; tbody.querySelectorAll('tr').forEach(tr=>{ const article = tr.querySelector('td:nth-child(1) input')?.value||''; const store = tr.querySelector('td:nth-child(2) input')?.value||''; const price = parseFloat(tr.querySelector('td:nth-child(3) input')?.value)||0; const qty = parseInt(tr.querySelector('td:nth-child(4) input')?.value)||0; gastos.push({article,store,price,qty}); }); const registro=[]; registroTbody.querySelectorAll('tr').forEach(tr=>{ registro.push({article: tr.querySelector('td:nth-child(1) input')?.value||'', store: tr.querySelector('td:nth-child(2) input')?.value||'', price: parseFloat(tr.querySelector('td:nth-child(3) input')?.value)||0}); }); localStorage.setItem(STORAGE_KEY, JSON.stringify({gastos,registro,savedAt:Date.now()})); }catch(e){ console.error(e); } }

function loadState(){ try{ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return false; const obj = JSON.parse(raw); tbody.innerHTML=''; registroTbody.innerHTML=''; (obj.gastos||[]).forEach(it=>addRow(it.article||'', it.store||'', it.price||0, it.qty||0)); (obj.registro||[]).forEach(it=>createRegistroRow(it.article||'', it.store||'', it.price||0)); updateStoresView(); return true; }catch(e){ console.error(e); return false; } }

btnAdd && btnAdd.addEventListener('click', ()=>addRow()); btnAddReg && btnAddReg.addEventListener('click', ()=>createRegistroRow());
btnSaveReg && btnSaveReg.addEventListener('click', ()=>{ saveState(); alert('Registros guardados en el almacenamiento local.'); });
tabGastos.addEventListener('click', ()=>{ viewGastos.style.display=''; viewRegistro.style.display='none'; viewTiendas.style.display='none'; tabGastos.classList.add('btn-primary'); tabRegistro.classList.remove('btn-primary'); tabTiendas.classList.remove('btn-primary'); });
tabRegistro.addEventListener('click', ()=>{ viewGastos.style.display='none'; viewRegistro.style.display=''; viewTiendas.style.display='none'; tabRegistro.classList.add('btn-primary'); tabGastos.classList.remove('btn-primary'); tabTiendas.classList.remove('btn-primary'); });
tabTiendas.addEventListener('click', ()=>{ viewGastos.style.display='none'; viewRegistro.style.display='none'; viewTiendas.style.display=''; tabTiendas.classList.add('btn-primary'); tabGastos.classList.remove('btn-primary'); tabRegistro.classList.remove('btn-primary'); updateStoresView(); });
btnClear.addEventListener('click', ()=>{ if(confirm('Borrar todos los datos locales?')){ localStorage.removeItem(STORAGE_KEY); tbody.innerHTML=''; registroTbody.innerHTML=''; updateStoresView(); } });

// arranque
document.addEventListener('DOMContentLoaded', ()=>{ if(!loadState()) addRow(); });
