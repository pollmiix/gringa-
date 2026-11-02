# Arquivo de produtos do Google Merchant Center

Link publico: https://aloha-official.online/google-products.xml

No campo "Inserir um link para o arquivo", colar esse endereco. Escolher idioma
English, mercado United States, moeda EUR e a conversao de moeda do Google
quando aplicavel. Nao cadastrar usuario ou senha: o arquivo e publico.
Pode manter a busca automatica diaria. O arquivo e regenerado a cada publicacao
na Vercel a partir dos precos, disponibilidade e catalogo publicados.

## Conteudo

- Todos os 242 produtos, incluindo o vale-presente.
- 1.995 itens: cada tamanho e uma variacao separada, com ID estavel e agrupamento.
- 1.737 fotos locais em alta resolucao: principal e angulos adicionais.
- Titulos, descricoes detalhadas em ingles e links no dominio novo.
- As mesmas descricoes nas paginas de produto e nos dados estruturados.
- Variantes abrem com o tamanho escolhido, sem adicionar itens automaticamente.
- Preco antes do desconto extra em price e valor final atual em sale_price,
  em EUR e coerentes com o carrinho e a API de pagamento.
- Marca do fabricante ALOHAS e MPNs dos SKUs do catalogo do fabricante;
  o nome do lojista Aloha nao substitui a marca do produto.
- Cor, material, publico e padrao quando presentes no cadastro. Calcados em EU.
- Categorias do Google, estado new, estoque confirmado pelo lojista e frete US
  gratuito. Configurar no Merchant o prazo total de 3 a 7 dias uteis do site.

## Pendencias reais antes de anunciar

1. **Impostos nos EUA:** o Google exige que price para US nao inclua impostos,
   inclusive de importacao. O lojista confirmou que seus precos incluem tudo
   e nao informou a separacao desses valores. O arquivo preserva os valores
   reais do site; nao inventa aliquotas nem muda precos sem autorizacao.
   Definir o tratamento fiscal correto e alinhar feed, pagina e checkout antes
   dos anuncios. A geracao tecnica nao certifica essa conformidade.
2. **Genero nao informado:** Meran Cream Trousers, East Rift Burgundy Leather
   Boots, Nagano Checks Brown Blazer e Kathy Checks Brown Pants continuam no
   arquivo, sem gender. Confirmar o publico real para completar os campos
   exigidos nos EUA; nao usar unisex como substituto de desconhecido.
3. **GTIN/EAN:** a origem nao contem codigos de barras. Nao foram inventados
   e identifier_exists=no nao foi usado. Obter do fabricante os codigos
   autenticos por tamanho quando atribuidos, para evitar limitacoes.
4. **Vale-presente:** confirmar autorizacao para vender/resgatar o vale ALOHAS,
   valor de resgate, entrega e condicoes. Nao ha emissao automatica de vales.
   O arquivo inclui o item conforme o pedido de todos os produtos; isso nao
   comprova que o vale pode ser cumprido pela operacao da Aloha.
5. Confirmar direitos sobre imagens, autenticidade, estoque real e entrega.
   Revisar diagnosticos do Merchant. O arquivo nao garante aprovacao do Google.

## Manutencao

merchant-data.js guarda os fatos e SKUs extraidos do catalogo existente.
product-descriptions.js gera descricoes compartilhadas. O gerador
scripts/build-merchant-feed.cjs usa os arquivos publicados para gerar o XML;
nao depende de catalog-source. Rodar npm run build depois de alterar o cadastro.
A Vercel executa o gerador automaticamente a cada publicacao.

Os testes comparam todos os precos finais com a API de checkout e verificam
todos os produtos, tamanhos e fotos. As descricoes assistidas por IA usam
structured_description com trained_algorithmic_media no formato do Google.
As imagens nao foram criadas nem modificadas por IA.

Referencias oficiais:
- https://support.google.com/merchants/answer/7052112?hl=en
- https://support.google.com/merchants/answer/14987622?hl=en
- https://support.google.com/merchants/answer/6324468
- https://support.google.com/merchants/answer/6324370?hl=en
- https://support.google.com/merchants/answer/6324461?hl=en
