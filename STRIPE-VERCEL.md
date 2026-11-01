# Ativar o checkout na Vercel

O checkout abre uma página hospedada pela Stripe. O servidor confere produtos,
tamanhos, quantidades e preços usando o catálogo e loja-config.js publicados.
Nenhum dado de cartão passa pelos arquivos da loja.

1. Na Vercel, abra o projeto correspondente a gringa-olive.vercel.app.
2. Em Settings > Environment Variables, adicione STRIPE_SECRET_KEY com o token
   completo da chave restrita rk_live_... criada para pagamentos únicos. Cadastre
   apenas em Production. Não use o identificador mk_..., nem a chave pk_live_....
3. Adicione SITE_URL com o valor https://gringa-olive.vercel.app.
4. Salve e faça Redeploy da implantação mais recente para aplicar as variáveis.

Nunca coloque a chave privada no GitHub, em loja-config.js ou no chat.
Se não guardou o token completo quando ele foi exibido, crie outra chave na
Stripe e configure o novo token diretamente na Vercel.

## Conferência antes de receber pagamentos

- Os preços atuais estão em EUR; alterar a moeda não converte os valores.
- O catálogo é uma cópia local, sem consulta de estoque ou reserva de produtos.
  Confira preços, estoque, pré-vendas e prazos antes de abrir as vendas.
- O servidor oferece frete gratuito aos dez países listados no checkout.
  Frete pago ainda precisa ser implementado. Não há cálculo automático de
  impostos; configure a tributação adequada antes de abrir as vendas.
- O checkout oferece cart?es, Apple Pay, Google Pay e Link. A API permite
  somente os tipos card e link nas novas sess?es; as carteiras Apple Pay e
  Google Pay usam o suporte a cart?o e dependem do dispositivo/navegador.
- Pix e boleto foram removidos da loja e n?o s?o permitidos nas novas sess?es,
  mesmo que permane?am habilitados no painel da Stripe. Sess?es antigas n?o
  s?o alteradas por esta atualiza??o. Os pre?os continuam em EUR.
- A chave precisa permitir criar e consultar Checkout Sessions e as operações
  de pagamento correspondentes. O modelo Pagamentos únicos é o ponto de partida.
- Faça primeiro uma implantação de teste com uma chave rk_test_.../sk_test_...
  no ambiente Preview, SITE_URL apontando ao domínio exato dessa implantação,
  e cartões de teste da Stripe. Não use cartão real para testes.
- A conta Stripe deve estar liberada para receber pagamentos reais.

## Pedidos e confirmação

A página de retorno consulta a Stripe no servidor antes de mostrar pagamento
confirmado; parâmetros de URL não comprovam pagamento. O carrinho é preservado
para não apagar itens adicionados em outra aba.

Esta integração não possui banco de pedidos, e-mail de confirmação próprio,
baixa de estoque ou despacho automático. Acompanhe cada pagamento e os dados
de entrega no Dashboard da Stripe e processe o pedido manualmente. Antes de
automatizar o despacho, implemente um webhook com validação de assinatura,
registro persistente do pedido e tratamento idempotente de eventos. Não use
a visita à página de retorno como gatilho para enviar mercadorias.

## Publicação

O repositório deve estar conectado ao projeto Vercel, com branch de produção
main. As funções api/checkout.js são publicadas junto com os arquivos estáticos.
Não configure um diretório de saída que exclua essas funções.

## Verificação local

Com Node.js 24 instalado: npm test. Os testes usam respostas simuladas da Stripe
e não fazem cobranças nem precisam de credenciais.
