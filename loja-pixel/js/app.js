const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const brl = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const gameOf = id => DB.games.find(g => g.id === id), catOf = id => DB.categories.find(c => c.id === id);
const grad = g => `linear-gradient(135deg,${g.c1},${g.c2})`;
const title = t => document.title = t ? t + " – " + STORE.name : STORE.name + " – Loja de jogos";
const url = p => /^(https?:|data:)/.test(p) ? p : IMG_BASE + p;

/* Slot de imagem: <img> se houver caminho; senão, placeholder com o tamanho ideal */
function slot(path, cls, label, bg, emoji, extra) {
  if (path) return `<div class="slot ${cls}"><img src="${url(path)}" alt="${label}" loading="lazy">${extra || ""}</div>`;
  return `<div class="slot ph ${cls}" style="background:${bg}"><span class="em">${emoji || ""}</span><small>${label}</small></div>`;
}
const pSlot = (p, i = 0, hover = false, cls = "sq") => slot(p.imgs[i], cls, i ? `Foto ${i + 1} · 800×800` : "Foto do produto · 800×800", grad(gameOf(p.game)), p.emoji,
  hover && p.imgs[1] ? `<img class="hov" src="${url(p.imgs[1])}" alt="" loading="lazy">` : "");
const badge = p => !p.stock ? `<span class="badge off">Esgotado</span>` : p.novo ? `<span class="badge">Novo</span>` : p.stock <= 5 ? `<span class="badge">Últimas unidades</span>` : "";
const card = p => `<a class="card" href="#p-${p.id}">${pSlot(p, 0, true)}${badge(p)}<div class="info"><div class="mut">${gameOf(p.game).name}</div><h3>${p.name}</h3><div class="price">${brl(p.price)}</div></div></a>`;

/* ---------- Estado ---------- */
let curFrete = null, cep = "", fretes = null, freteId = "pac", lastOrder = null, cart = [], filt = { sort: "", cat: "" }, lastR = null, timer, hi = 0;
try { cart = JSON.parse(localStorage.getItem("bau-cart") || "[]"); } catch (e) { cart = []; }
try { cep = localStorage.getItem("bau-cep") || ""; } catch (e) {}
const saveCart = () => { try { localStorage.setItem("bau-cart", JSON.stringify(cart)); } catch (e) {} };
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); }

/* ---------- Cabeçalho ---------- */
$("#topbar").textContent = STORE.aviso;
$("#logo").innerHTML = STORE.logo ? `<img src="${url(STORE.logo)}" alt="${STORE.name}">` : `<i>B</i>${STORE.name}`;
function renderNav(r) {
  const cur = id => r === id ? 'aria-current="page"' : "";
  $("#nav").innerHTML = DB.games.map(g => `<a href="#${g.id}" ${cur(g.id)}>${g.name}</a>`).join("") +
    `<hr>` + DB.categories.map(c => `<a href="#c-${c.id}" ${cur("c-" + c.id)}>${c.name}</a>`).join("");
}

$("#fGames").innerHTML = DB.games.map(g => `<a href="#${g.id}">${g.name}</a>`).join("");
$("#fHelp").innerHTML = Object.entries(DB.pages).map(([k, p]) => `<a href="#ajuda-${k}">${p.title}</a>`).join("");

/* ---------- Telas ---------- */
const hero = () => `<section class="hero" aria-label="Destaques"><div class="slides" id="slides">${DB.games.map(g =>
  `<div class="slide">${slot(g.banner, "wide", "Banner do jogo · 1600×560", grad(g), g.emoji)}<div class="cap"><h1>${g.name}</h1><p>${g.tag}</p><a class="btn" href="#${g.id}">Ver coleção</a></div></div>`).join("")}</div>
  <button class="arrow prev" aria-label="Anterior">‹</button><button class="arrow next" aria-label="Próximo">›</button></section>`;
function startHero() {
  const n = DB.games.length, go = i => { hi = (i + n) % n; $("#slides").style.transform = `translateX(-${hi * 100}%)`; };
  hi = 0; $(".prev").onclick = () => go(hi - 1); $(".next").onclick = () => go(hi + 1);
  if (!matchMedia("(prefers-reduced-motion:reduce)").matches) timer = setInterval(() => go(hi + 1), 6000);
}
async function home() {
  title();
  const [novos, top] = await Promise.all([api.products({ novo: true }), api.products({ sort: "maior" })]);
  $("#app").innerHTML = hero() + `<div class="wrap">
    <h2 class="sec">Navegue por jogo</h2><div class="tiles">${DB.games.map(g => `<a class="gtile" href="#${g.id}">${slot(g.tile, "sq", "Tile do jogo · 600×600", grad(g), g.emoji)}<h3>${g.name}</h3></a>`).join("")}</div>
    <h2 class="sec">Novidades</h2><div class="grid">${novos.map(card).join("")}</div>
    <h2 class="sec">Compre por categoria</h2><div class="cats">${DB.categories.map(c => `<a class="cat" href="#c-${c.id}">${slot(c.img, "sq", "Categoria · 400×400", "var(--soft)", c.emoji)}<b>${c.name}</b></a>`).join("")}</div>
    <h2 class="sec">Destaques</h2><div class="grid">${top.slice(0, 8).map(card).join("")}</div></div>`;
  startHero();
}
async function catalog({ game, cat }) {
  const g = game && gameOf(game), c = cat && catOf(cat);
  title(g ? g.name : c.name);
  const base = await api.products({ game, cat }), list = await api.products({ game, cat: cat || filt.cat, sort: filt.sort });
  const chips = game ? [...new Set(base.map(p => p.cat))] : [];
  $("#app").innerHTML = (g ? `<div class="bn">${slot(g.banner, "wide", "Banner da coleção · 1600×560", grad(g), g.emoji)}<div class="cap"><h1>${g.name}</h1><p>${g.tag}</p></div></div>` : `<div class="wrap"><h1 class="pt">${c.name}</h1></div>`) +
    `<div class="wrap"><div class="tools">${g ? `<button class="chip" data-cat="" aria-pressed="${!filt.cat}">Tudo</button>` + chips.map(id => `<button class="chip" data-cat="${id}" aria-pressed="${filt.cat === id}">${catOf(id).name}</button>`).join("") : `<span class="mut">${list.length} produtos</span>`}
    <select id="sort" aria-label="Ordenar"><option value="">Ordenar</option><option value="menor" ${filt.sort === "menor" ? "selected" : ""}>Menor preço</option><option value="maior" ${filt.sort === "maior" ? "selected" : ""}>Maior preço</option></select></div>
    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<div class="empty">Nenhum produto nesta categoria. Escolha outra.</div>`}</div>`;
  $$(".chip").forEach(b => b.onclick = () => { filt.cat = b.dataset.cat; route(); });
  $("#sort").onchange = e => { filt.sort = e.target.value; route(); };
}
async function productPage(id) {
  const p = await api.product(id);
  if (!p) { $("#app").innerHTML = `<div class="wrap empty">Produto não encontrado. <a href="#inicio">Voltar ao início</a></div>`; return; }
  title(p.name);
  const g = gameOf(p.game), size = p.cat === "roupas", rel = (await api.products({ game: p.game })).filter(x => x.id !== id).slice(0, 4);
  $("#app").innerHTML = `<div class="wrap"><nav class="crumb"><a href="#inicio">Início</a> / <a href="#${g.id}">${g.name}</a> / ${p.name}</nav>
    <div class="pp"><div class="gal"><div id="gmain">${pSlot(p, 0)}</div><div class="thumbs">${[0, 1, 2, 3].map(i => `<button data-i="${i}" aria-label="Foto ${i + 1}">${pSlot(p, i)}</button>`).join("")}</div></div>
    <div class="buy">${badge(p)}<span class="mut">${g.name} · ${catOf(p.cat).name}</span><h1>${p.name}</h1><div class="price big">${brl(p.price)}</div><p>${p.desc}</p>
      ${size ? `<label>Tamanho <select id="sz"><option>P</option><option>M</option><option>G</option><option>GG</option></select></label>` : ""}
      <label>Quantidade <input id="qt" type="number" min="1" max="${p.stock || 1}" value="1"></label>
      <button class="btn full" id="add" ${p.stock ? "" : "disabled"}>${p.stock ? "Adicionar ao carrinho" : "Esgotado"}</button>
      <p class="mut">${p.stock ? (p.stock <= 5 ? `Restam apenas ${p.stock} unidades.` : "Em estoque.") : "Sem estoque no momento."}</p></div></div>
    <h2 class="sec">Mais de ${g.name}</h2><div class="grid">${rel.map(card).join("")}</div></div>`;
  $$(".thumbs button").forEach(b => b.onclick = () => $("#gmain").innerHTML = pSlot(p, +b.dataset.i));
  $("#add").onclick = () => addToCart(p, size ? $("#sz").value : null, Math.max(1, +$("#qt").value || 1));
}
function infoPage(k) {
  const p = DB.pages[k]; if (!p) return home();
  title(p.title);
  $("#app").innerHTML = `<div class="wrap"><div class="doc"><h1 class="pt">${p.title}</h1>${p.text.map(t => `<p>${t}</p>`).join("")}</div></div>`;
}
function orderPage(o) {
  title("Pedido " + o.id);
  const rows = o.lines.map(l => { const p = DB.products.find(x => x.id === l.id);
    return `<div class="it">${pSlot(p, 0, false, "mini")}<div class="t"><b>${p.name}</b><span class="mut">${l.size ? "Tam. " + l.size + " · " : ""}${l.qty} × ${brl(p.price)}</span></div><b>${brl(p.price * l.qty)}</b></div>`; }).join("");
  const sub = o.lines.reduce((s, l) => s + DB.products.find(x => x.id === l.id).price * l.qty, 0), f = o.frete, total = sub + f.valor;
  $("#app").innerHTML = `<div class="wrap"><div class="doc"><h1 class="pt">Compra concluída</h1><p>Pedido <b>${o.id}</b> registrado (simulado). Numa loja real, você receberia a confirmação por e-mail.</p>${rows}<div class="row sum"><span>Frete ${f.nome} · ${f.dias} · CEP ${f.cep}</span><span>${f.valor ? brl(f.valor) : "Grátis"}</span></div><div class="row tot"><b>Total</b><b>${brl(total)}</b></div><a class="btn" href="#inicio">Continuar comprando</a></div></div>`;
}
async function search(q) {
  const list = await api.products({ q }); title("Busca");
  $("#app").innerHTML = `<div class="wrap"><h1 class="pt">Resultados para “${q.replace(/[<>&"]/g, "")}”</h1>` +
    (list.length ? `<div class="grid" style="margin-top:18px">${list.map(card).join("")}</div>` : `<div class="empty">Nada encontrado. Tente outro nome ou categoria.</div>`) + `</div>`;
}

/* ---------- Rotas (hash simples: #inicio, #jogo, #c-categoria, #p-produto, #ajuda-pagina, #pedido) ---------- */
async function route() {
  clearInterval(timer);
  const r = location.hash.slice(1) || "inicio";
  if (r !== lastR) { filt = { sort: "", cat: "" }; $("#q").value = ""; lastR = r; window.scrollTo(0, 0); }
  renderNav(r);
  const q = $("#q").value.trim();
  if (q) return search(q);
  if (r === "pedido") return lastOrder ? orderPage(lastOrder) : home();
  if (r.startsWith("ajuda-")) return infoPage(r.slice(6));
  if (r.startsWith("p-")) return productPage(r.slice(2));
  if (r.startsWith("c-") && catOf(r.slice(2))) return catalog({ cat: r.slice(2) });
  if (gameOf(r)) return catalog({ game: r });
  return home();
}
window.addEventListener("hashchange", route);
$("#q").addEventListener("input", route);

/* ---------- Carrinho ---------- */
function addToCart(p, size, qty) {
  const key = p.id + (size ? "|" + size : ""), l = cart.find(x => x.key === key), have = l ? l.qty : 0;
  if (have + qty > p.stock) return toast("Estoque máximo: " + p.stock + " unidades.");
  l ? l.qty += qty : cart.push({ key, id: p.id, size, qty });
  saveCart(); drawCart(); cartOpen(true);
}
function drawCart() {
  $("#cnt").textContent = cart.reduce((s, l) => s + l.qty, 0);
  let total = 0;
  $("#items").innerHTML = cart.length ? cart.map(l => {
    const p = DB.products.find(x => x.id === l.id); total += p.price * l.qty;
    return `<div class="it">${pSlot(p, 0, false, "mini")}<div class="t"><b>${p.name}</b><span class="mut">${l.size ? "Tam. " + l.size + " · " : ""}${brl(p.price)}</span></div>
      <div class="q"><button data-k="${l.key}" data-d="-1" aria-label="Diminuir">−</button><span>${l.qty}</span><button data-k="${l.key}" data-d="1" aria-label="Aumentar">+</button></div></div>`;
  }).join("") : `<div class="empty">Seu carrinho está vazio. Escolha um produto para começar.</div>`;
  const falta = STORE.freteGratis - total;
  $("#ship").innerHTML = total ? (falta > 0 ? `Faltam ${brl(falta)} para frete grátis no PAC<div class="bar"><i style="width:${Math.min(100, total / STORE.freteGratis * 100)}%"></i></div>` : "Você ganhou frete grátis no PAC!") : "";
  const opts = cart.length && fretes ? fretes.opcoes.map(o => ({ ...o, valor: o.id === "pac" && total >= STORE.freteGratis ? 0 : o.preco })) : [];
  const sel = opts.find(o => o.id === freteId) || opts[0]; curFrete = sel || null;
  $("#fretes").innerHTML = opts.length ? `<p class="mut">Entrega para: ${fretes.regiao}</p>` + opts.map(o => `<label class="opt"><input type="radio" name="fr" value="${o.id}" ${sel === o ? "checked" : ""}><span><b>${o.nome}</b> · ${o.dias}</span><b>${o.valor ? brl(o.valor) : "Grátis"}</b></label>`).join("") : "";
  $("#sub").textContent = brl(total);
  $("#frt").textContent = !cart.length ? "—" : sel ? (sel.valor ? brl(sel.valor) : "Grátis") : "Calcule pelo CEP";
  $("#total").textContent = brl(total + (sel ? sel.valor : 0)); $("#checkout").disabled = !cart.length || !sel;
}
const maskCep = v => v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
async function calcFrete(quiet) {
  const raw = $("#cep").value.replace(/\D/g, "");
  try { fretes = await api.frete(raw); cep = raw; try { localStorage.setItem("bau-cep", raw); } catch (e) {} }
  catch (err) { fretes = null; if (!quiet) toast(err.message); }
  drawCart();
}
$("#cep").addEventListener("input", e => e.target.value = maskCep(e.target.value));
$("#cepForm").addEventListener("submit", e => { e.preventDefault(); calcFrete(); });
$("#fretes").addEventListener("change", e => { freteId = e.target.value; drawCart(); });
$("#items").addEventListener("click", e => {
  const b = e.target.closest("button[data-k]"); if (!b) return;
  const l = cart.find(x => x.key === b.dataset.k), p = DB.products.find(x => x.id === l.id), d = +b.dataset.d;
  if (d > 0 && l.qty >= p.stock) return toast("Estoque máximo atingido.");
  l.qty += d; if (l.qty <= 0) cart = cart.filter(x => x !== l);
  saveCart(); drawCart();
});
function cartOpen(on) { $("#drawer").classList.toggle("open", on); $("#overlay").classList.toggle("show", on); }
$("#openCart").onclick = () => cartOpen(true);
$("#closeCart").onclick = $("#overlay").onclick = () => cartOpen(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") cartOpen(false); });
$("#checkout").onclick = async () => {
  const b = $("#checkout"); b.disabled = true; b.textContent = "Processando…";
  try {
    const o = await api.checkout(cart.map(l => ({ id: l.id, qty: l.qty, size: l.size })), curFrete && { ...curFrete, cep: maskCep(cep) });
    lastOrder = o; cart = []; saveCart(); cartOpen(false);
    if (location.hash === "#pedido") route(); else location.hash = "pedido";
  } catch (err) { toast(err.message); }
  b.textContent = "Finalizar compra"; drawCart();
};
$("#news").addEventListener("submit", e => { e.preventDefault(); e.target.reset(); toast("Inscrição simulada. Nada foi enviado."); });

if (cep) { $("#cep").value = maskCep(cep); calcFrete(true); }
drawCart(); route();
