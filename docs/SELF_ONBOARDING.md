# Ponte de self-onboarding

A API é responsável por catálogo, criação transacional do condomínio/administrador, confirmação de e-mail e trial. O BFF encaminha os dados e a Idempotency-Key; após confirmação, emite a sessão com os utilitários de JWT/cookie/CSRF existentes.

Configuração: API_URL, INTERNAL_SERVICE_TOKEN e JWT/cookies já existentes; SELF_ONBOARDING_WEB_ORIGIN deve ser a origem HTTPS do frontend e será incluída no CORS. POSTs públicos rejeitam origens não autorizadas. O cabeçalho Idempotency-Key é permitido no preflight. Limite específico: 15 requisições de onboarding por IP a cada 15 minutos, além do limite global; reenvio também tem intervalo de um minuto na API.

Endpoints públicos: GET /onboarding/plans, POST /onboarding/organizations, POST /onboarding/verify-email, POST /onboarding/resend-verification. Endpoints autenticados: GET /onboarding/subscription e POST /onboarding/purchase-request (administrador).

Mudança do registro legado: POST /users/register agora exige administrador autenticado, recebe apenas perfil de morador e verifica correspondência do condomínio e disponibilidade do trial antes de gravar. O cadastro público do condomínio não deve mais usar essa rota. Os códigos de erro estruturados da API são preservados sem devolver detalhes internos.

Publicar somente após a migration e a API correspondentes. A API mantém novos cadastros desligados até SELF_ONBOARDING_ENABLED=true. O processo completo de migração, e-mail e rollback está documentado em grillrentapi/docs/SELF_ONBOARDING.md.

Solicitar contratação grava a preferência; não cria checkout, não cobra e não ativa plano pago. Os novos endpoints de Stripe estão separados sob `/billing`; ver [STRIPE_BILLING.md](../../grillrentapi/docs/STRIPE_BILLING.md).

Validação: npm run build; npm test -- --runInBand; conferência ponta a ponta com frontend, BFF, API e PostgreSQL isolados.

Endereço: GET /onboarding/postal-code/:postalCode é público, valida oito dígitos e consulta exclusivamente https://viacep.com.br. Resposta normalizada: postalCode, street, neighborhood, city e stateCode. Há timeout de cinco segundos e cache limitado por cinco minutos. O formulário envia esses campos e addressNumber separadamente; a interface consulta automaticamente após 400 ms sem digitação com CEP completo e mantém rua, bairro, cidade e UF somente para leitura. Em caso de falha, solicita conferir e digitar o CEP novamente.

## Próxima entrega: pagamentos de assinaturas

O [plano central de pagamentos](../../grillrentapi/docs/PAYMENTS_PLAN.md) registra a decisão de concluir primeiro as assinaturas do Seu.Zé e adiar pagamentos de reservas. Provedor definido: Stripe com assinatura por cartão, sem Pix nesta entrega. Inclui regras comerciais, migrations, checkout, webhooks, renovação, cancelamento, conciliação e critérios de lançamento. Os endpoints de billing já estão implementados localmente; sandbox da conta e ativação comercial ainda estão pendentes.

## Assinaturas Stripe

O BFF publica GET /billing/subscription e POST /billing/checkout, /billing/checkout/expire, /billing/sync e /billing/manage. Todas as rotas exigem administrador; mutações usam a proteção JWT/CSRF existente, checkout encaminha Idempotency-Key e há rate limit próprio. A organização é resolvida pela sessão. Nenhuma chave Stripe é configurada no BFF.

O webhook Stripe recebe o corpo bruto diretamente na API, sem passar pelo BFF. API e banco devem receber a migration de billing antes da publicação. Cadastro de moradores também bloqueia assinatura suspensa ou canWrite=false, preservando o cadastro em organizações legadas.
