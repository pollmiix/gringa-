# Checkout e dominio da Aloha

Dominio principal: https://aloha-official.online
Projeto existente na Vercel: gringa-, conectado ao repositorio pollmiix/gringa-.
Nao criar outro projeto: os produtos, imagens e a funcao de pagamento continuam
no mesmo projeto e usam a STRIPE_SECRET_KEY ja cadastrada em Production.

## Enderecos e seguranca

- loja-config.js define siteUrl como o dominio principal. Esse valor tem
  prioridade sobre uma variavel SITE_URL antiga da Vercel.
- A API aceita somente a origem principal e o dominio anterior explicitamente
  cadastrado em dominioAnterior. Nao usa Host nem dominios enviados pelo cliente
  para escolher livremente uma URL de retorno.
- Os retornos de pagamento e cancelamento ficam no dominio confiavel que iniciou
  o checkout. Assim a loja antiga continua utilizavel durante a ativacao HTTPS.
- SITE_URL pode ser atualizado para https://aloha-official.online na Vercel,
  mas nao e necessario trocar ou expor a chave Stripe para mudar o dominio.
- Para testes em um dominio Preview, configure siteUrl na branch isolada de
  teste para esse dominio exato e use somente uma chave de teste nesse ambiente.

## Conferencias externas

1. Vercel > projeto gringa- > Domains: adicionar aloha-official.online ao
   projeto correto. Seguir exatamente os registros DNS mostrados pela Vercel;
   aguardar verificacao e emissao do certificado HTTPS. Nao adivinhar IPs.
2. Abrir https://aloha-official.online e confirmar que exibe esta mesma loja,
   com HTTPS valido, imagens e /api/checkout disponiveis.
3. Na Stripe, conferir empresa, nome publico, URL do site, suporte e links das
   politicas. O cadastro legal/bancario nao e alterado pelo codigo da loja.
   Conferir Google Pay/Apple Pay e cadastrar o dominio se solicitado pela
   integracao utilizada. Nao inventar um arquivo de verificacao Apple Pay.
4. No Merchant Center, verificar/reivindicar o novo dominio, atualizar a fonte
   de produtos e suas URLs, informar o novo sitemap e os links das politicas.
   Manter mercado US, precos EUR, frete gratis, entrega total de 3 a 7 dias uteis
   e impostos/taxas de importacao incluidos, conforme confirmado pelo lojista.
5. Depois que o HTTPS do novo dominio estiver funcionando, configurar o
   redirecionamento do dominio antigo na Vercel, preservando caminhos e consultas.
   Nao redirecionar clientes para um dominio cujo HTTPS ainda esteja falhando.

## Operacao

O checkout e hospedado pela Stripe. Os precos sao validados no servidor; nao
ha campos locais de cartao. Os metodos elegiveis sao controlados no Dashboard
Stripe; payment_method_types nao deve ser enviado pela API atual desta conta.
Pix e boleto permanecem desativados. Precos em EUR, imposto/importacao incluidos
no valor informado, frete zero e entrega apenas nos Estados Unidos.

A pagina de retorno consulta o pagamento no servidor. Nao ha banco proprio de
pedidos, baixa automatica de estoque, despacho ou email automatico da loja.
Acompanhar pagamentos, dados de entrega, devolucoes e reembolsos no Dashboard
Stripe e no atendimento. A visita a uma pagina de retorno nao autoriza despacho.

Nunca publicar STRIPE_SECRET_KEY no GitHub, arquivos da loja ou mensagens.
Chaves expostas precisam ser substituidas diretamente no painel.

## Verificacao local

Os testes em tests/stripe-checkout.test.cjs usam respostas Stripe simuladas e
nao fazem cobrancas. Node 24: node --test --test-isolation=none tests/stripe-checkout.test.cjs.
