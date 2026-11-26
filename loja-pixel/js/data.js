/* =====================================================================
   BANCO DE DADOS SIMULADO + API FALSA
   ---------------------------------------------------------------------
   COMO TROCAR PLACEHOLDERS POR IMAGENS
   Coloque os arquivos em img/ e preencha o campo com o caminho relativo
   a essa pasta. Campo vazio ("" ou []) = placeholder com o tamanho ideal.

   STORE.logo ........ "logo.png"                 (proporção ~4,6:1; exibida com 44px de altura)
   game.banner ....... "banners/oneshot.jpg"      (1600x560, carrossel e topo da coleção)
   game.tile ......... "tiles/oneshot.jpg"        (600x600, "Navegue por jogo")
   categoria.img ..... "categorias/roupas.jpg"    (400x400)
   produto.imgs ...... ["produtos/oneshot-roupas-1.jpg", "produtos/oneshot-roupas-2.jpg"]
                       (800x800; a 1ª é a capa, a 2ª aparece ao passar o mouse,
                        até 4 fotos na galeria da página do produto)
   URLs completas (https://...) também funcionam.
   ===================================================================== */
const IMG_BASE = "img/";
const STORE = { name: "IndieDrop", logo: "logo.png", freteGratis: 300, aviso: "Frete grátis no PAC em compras acima de R$ 300 (simulado)" };

const DB = {
  games: [
    { id: "oneshot", name: "Oneshot", tag: "Uma aventura sobre um gatinho e uma lâmpada.", c1: "#b86a0c", c2: "#f2b134", emoji: "💡", banner: "", tile: "" },
    { id: "stardew-valley", name: "Stardew Valley", tag: "Uma vida tranquila no campo.", c1: "#2f8a3e", c2: "#8fd16a", emoji: "🌱", banner: "", tile: "" },
    { id: "slime-rancher", name: "Slime Rancher", tag: "Cuide de slimes em um rancho distante.", c1: "#c4307f", c2: "#ff8fc7", emoji: "🟣", banner: "", tile: "" }
  ],
  categories: [
    { id: "roupas", name: "Roupas", emoji: "👕", img: "" },
    { id: "pelucias", name: "Pelúcias", emoji: "🧸", img: "" },
    { id: "pins", name: "Pins", emoji: "📌", img: "" },
    { id: "posteres", name: "Pôsteres", emoji: "🖼️", img: "" },
    { id: "musica", name: "Música", emoji: "💿", img: "" },
    { id: "casa", name: "Casa", emoji: "🏠", img: "" },
    { id: "acessorios", name: "Acessórios", emoji: "🎒", img: "" }
  ],
  products: [],
  orders: []
};

// Catálogo simétrico: cada jogo tem exatamente 1 produto em cada categoria, com o mesmo preço e estoque.
// [categoria, preço, estoque, novo?, descrição]
const MODELO = [
  ["roupas", 119.9, 12, 0, "Camiseta de algodão macio. Descrição de exemplo."],
  ["pelucias", 149.9, 8, 1, "Pelúcia de 25 cm. Medidas ilustrativas."],
  ["pins", 39.9, 40, 0, "Pin metálico esmaltado com fecho de borboleta."],
  ["posteres", 69.9, 6, 0, "Impressão A3 em papel fosco."],
  ["musica", 229.9, 5, 0, "Edição dupla em vinil colorido."],
  ["casa", 59.9, 22, 0, "Cerâmica de 350 ml, segura para micro-ondas."],
  ["acessorios", 44.9, 0, 0, "Chaveiro de metal com acabamento envelhecido."]
];
// Nome e emoji de cada item, na mesma ordem de MODELO
const ITENS = {
  "oneshot": [["Camiseta Lâmpada", "👕"], ["Pelúcia Gatinho", "🐱"], ["Pin Lâmpada Solar", "💡"], ["Pôster Torre do Relógio", "🖼️"], ["Vinil Trilha Sonora", "💿"], ["Caneca Mundo Escuro", "🍵"], ["Chaveiro Lanterna", "🔦"]],
  "stardew-valley": [["Camiseta Fazendeiro", "👕"], ["Pelúcia Galinha", "🐔"], ["Pin Colheita", "🥕"], ["Pôster Mapa da Fazenda", "🗺️"], ["Vinil Trilha Sonora", "💿"], ["Caneca Café da Manhã", "☕"], ["Chaveiro Enxada", "⛏️"]],
  "slime-rancher": [["Camiseta Rancheiro", "👕"], ["Pelúcia Slime Rosa", "🟣"], ["Pin Slime Brilhante", "✨"], ["Pôster Rancho Distante", "🌌"], ["Vinil Trilha Sonora", "💿"], ["Caneca Rancho", "☕"], ["Chaveiro Slime Azul", "🔵"]]
};
Object.entries(ITENS).forEach(([game, itens]) => MODELO.forEach((m, i) => DB.products.push({
  id: game + "-" + m[0], game, name: itens[i][0], cat: m[0], price: m[1], stock: m[2], emoji: itens[i][1], desc: m[4], novo: !!m[3],
  imgs: [] // ← ex.: ["produtos/oneshot-roupas-1.jpg", "produtos/oneshot-roupas-2.jpg"]
})));

/* Páginas de ajuda (links do rodapé). Texto genérico: edite à vontade. */
DB.pages = {
  envios: { title: "Envios", text: ["Enviamos para todo o Brasil. Prazo e valor do frete são calculados pelo CEP, no carrinho (simulado).", "Pedidos acima de R$ " + STORE.freteGratis + " têm frete grátis na modalidade PAC.", "O código de rastreio é enviado por e-mail quando o pedido sai."] },
  trocas: { title: "Trocas e devoluções", text: ["Você pode pedir troca ou devolução em até 7 dias após o recebimento.", "O produto deve estar sem uso e na embalagem original.", "O reembolso é feito na mesma forma de pagamento (simulado)."] },
  contato: { title: "Contato", text: ["Dúvidas sobre pedidos ou produtos? Escreva para contato@indiedrop.exemplo.", "Respondemos em até 2 dias úteis. Este endereço é apenas um exemplo."] }
};

/* Frete simulado: o 1º dígito do CEP define a região. [região, PAC R$, PAC dias, SEDEX R$, SEDEX dias] */
const REGIOES = {
  0: ["Grande São Paulo", 22.9, [3, 5], 39.9, [1, 2]], 1: ["Interior de São Paulo", 22.9, [3, 5], 39.9, [1, 2]],
  2: ["Rio de Janeiro e Espírito Santo", 26.9, [4, 6], 44.9, [2, 3]], 3: ["Minas Gerais", 26.9, [4, 6], 44.9, [2, 3]],
  4: ["Bahia e Sergipe", 32.9, [6, 9], 54.9, [3, 4]], 5: ["Nordeste", 36.9, [7, 10], 59.9, [3, 5]],
  6: ["Norte e Nordeste", 42.9, [8, 12], 69.9, [4, 6]], 7: ["Centro-Oeste", 32.9, [5, 8], 52.9, [2, 4]],
  8: ["Paraná e Santa Catarina", 28.9, [4, 7], 46.9, [2, 3]], 9: ["Rio Grande do Sul", 30.9, [5, 8], 49.9, [2, 4]]
};

/* ---- API falsa: toda leitura/escrita passa por aqui (troque por fetch num backend real) ---- */
const wait = ms => new Promise(r => setTimeout(r, ms));
const api = {
  async products({ game, cat, q, sort, novo } = {}) {
    await wait(120);
    let r = DB.products.filter(p => (!game || p.game === game) && (!cat || p.cat === cat) && (!novo || p.novo) &&
      (!q || (p.name + " " + DB.categories.find(c => c.id === p.cat).name).toLowerCase().includes(q.toLowerCase())));
    if (sort === "menor") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "maior") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  },
  // Num site real: ViaCEP (endereço) + API dos Correios ou Melhor Envio (preço e prazo)
  async frete(cep) {
    await wait(400);
    if (!/^\d{8}$/.test(cep) || /^(\d)\1{7}$/.test(cep)) throw new Error("CEP inválido. Digite os 8 números.");
    const [regiao, pac, dPac, sedex, dSedex] = REGIOES[cep[0]], dias = x => x[0] + " a " + x[1] + " dias úteis";
    return { regiao, opcoes: [{ id: "pac", nome: "PAC", preco: pac, dias: dias(dPac) }, { id: "sedex", nome: "SEDEX", preco: sedex, dias: dias(dSedex) }] };
  },
  async product(id) { await wait(60); return DB.products.find(p => p.id === id); },
  async checkout(lines, frete) {
    await wait(500);
    if (!frete) throw new Error("Calcule o frete pelo CEP antes de finalizar.");
    for (const l of lines) { const p = DB.products.find(x => x.id === l.id); if (!p || p.stock < l.qty) throw new Error("Estoque insuficiente: " + (p ? p.name : l.id)); }
    lines.forEach(l => DB.products.find(x => x.id === l.id).stock -= l.qty);
    const order = { id: "PED-" + Math.floor(1000 + Math.random() * 9000), lines, frete, at: new Date().toISOString() };
    DB.orders.push(order);
    return order;
  }
};
