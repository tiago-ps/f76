(function(){
  const inv=window.F76_INVENTARIO;
  if(!inv||!Array.isArray(inv.records))return;
  const norm=s=>String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const data=inv.records;
  const owned=new Map();
  data.forEach(item=>{
    const key=norm(item.catalogKey||item.name);
    if(!key)return;
    const current=owned.get(key)||{count:0,locations:new Set()};
    current.count+=Number(item.quantity)||1;
    current.locations.add(item.location);
    owned.set(key,current);
  });
  const css=document.createElement("style");
  css.textContent="#f76-inv-button{position:fixed;z-index:99990;right:16px;bottom:16px;padding:12px 18px;border:1px solid #a4bd60;border-radius:30px;background:#29391f;color:#fff;font-weight:bold;cursor:pointer}#f76-inv-overlay{display:none;position:fixed;z-index:99991;inset:0;background:#000c;padding:12px;align-items:center;justify-content:center}#f76-inv-overlay.open{display:flex}#f76-inv-panel{width:min(720px,100%);max-height:90vh;overflow:auto;background:#1b2119;color:#eee;border:1px solid #63744b;border-radius:14px;padding:16px;font:14px Arial}#f76-inv-panel h2{color:#c5e477;margin:0 0 12px}#f76-inv-panel input,#f76-inv-panel select{background:#10150f;color:#fff;border:1px solid #657452;border-radius:7px;padding:10px;min-width:0}#f76-inv-controls{display:grid;grid-template-columns:1fr 150px;gap:8px}#f76-inv-controls input{width:100%}.f76-inv-entry{padding:12px 2px;border-top:1px solid #3d4935}.f76-inv-entry b{font-size:15px}.f76-inv-entry small{display:block;color:#b9c4ad;margin-top:5px}.f76-inv-entry ul{color:#d8e8b8;margin:7px 0;padding-left:20px}.f76-owned-badge{display:inline-block;margin:4px 0 4px 7px;padding:3px 7px;border:1px solid #829c51;border-radius:12px;background:#29391f;color:#d9f29c;font:600 11px/1.3 Arial,sans-serif;vertical-align:middle;white-space:nowrap}";
  document.head.appendChild(css);

  // Marca somente títulos cujo texto corresponda exatamente ao nome do inventário.
  // A busca é conservadora para evitar marcar cards de armas apenas semelhantes.
  function markOwnedTitles(){
    if(!owned.size)return;
    document.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*="title"],[class*="name"]').forEach(el=>{
      if(el.closest("#f76-inv-overlay")||el.querySelector(".f76-owned-badge")||el.dataset.f76OwnedChecked)return;
      const key=norm(el.textContent);
      const match=owned.get(key);
      if(!match)return;
      el.dataset.f76OwnedChecked="1";
      const badge=document.createElement("span");
      badge.className="f76-owned-badge";
      const places=[];
      if(match.locations.has("personagem"))places.push("Personagem");
      if(match.locations.has("bau"))places.push("Baú");
      badge.textContent="Na coleção · "+places.join(" + ")+(match.count>1?" · ×"+match.count:"");
      badge.title="Item encontrado no inventário exportado";
      el.appendChild(badge);
    });
  }

  const button=document.createElement("button");button.id="f76-inv-button";button.textContent="Meu inventário";
  const overlay=document.createElement("div");overlay.id="f76-inv-overlay";
  const panel=document.createElement("section");panel.id="f76-inv-panel";
  const heading=document.createElement("h2");heading.textContent="Meu inventário";
  const controls=document.createElement("div");controls.id="f76-inv-controls";
  const search=document.createElement("input");search.placeholder="Buscar arma ou efeito";search.type="search";
  const select=document.createElement("select");
  [["all","Todos os locais"],["personagem","Personagem"],["bau","Baú"]].forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;select.appendChild(o)});
  const close=document.createElement("button");close.textContent="Fechar";close.style.cssText="float:right;background:#303b29;color:white;border:1px solid #71815e;padding:8px;border-radius:7px";
  const summary=document.createElement("p");const results=document.createElement("div");
  controls.append(search,select);panel.append(close,heading,controls,summary,results);overlay.appendChild(panel);document.body.append(button,overlay);
  function render(){
    const term=norm(search.value);
    const found=data.filter(x=>(select.value==="all"||x.location===select.value)&&(!term||norm([x.name,(x.effects||[]).join(" "),x.description].join(" ")).includes(term)));
    const units=found.reduce((n,x)=>n+(Number(x.quantity)||1),0);
    summary.textContent=found.length+" registros · "+units+" unidades";
    results.replaceChildren();
    found.forEach(x=>{
      const row=document.createElement("article");row.className="f76-inv-entry";
      const name=document.createElement("b");name.textContent=x.name||"Item sem nome";
      const meta=document.createElement("small");meta.textContent=(x.location==="bau"?"Baú":"Personagem")+" · Quantidade "+(x.quantity||1)+(x.level?" · Nível "+x.level:"")+(x.legendaryStars?" · "+x.legendaryStars+" estrelas":"");
      row.append(name,meta);
      if(x.effects&&x.effects.length){const ul=document.createElement("ul");x.effects.forEach(effect=>{const li=document.createElement("li");li.textContent=effect;ul.appendChild(li)});row.appendChild(ul)}
      results.appendChild(row);
    });
    if(!found.length)results.textContent="Nenhum item encontrado.";
  }
  button.addEventListener("click",()=>{overlay.classList.add("open");render()});
  close.addEventListener("click",()=>overlay.classList.remove("open"));
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("open")});
  search.addEventListener("input",render);select.addEventListener("change",render);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")overlay.classList.remove("open")});
  markOwnedTitles();
  new MutationObserver(markOwnedTitles).observe(document.documentElement,{childList:true,subtree:true});
})();