<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
    <img src="docs/logo.svg" alt="ImpactMail" width="64" height="64">
  </picture>
</p>

<h1 align="center">ImpactMail</h1>

<p align="center">
  A app de newsletters da Impact-Origin: escreve uma edição, envia-a à tua lista e publica-a na web.
</p>

O ImpactMail é um fork do [MailCheap](https://github.com/marclou/mailcheap) para uso próprio: em português, com a marca da Impact-Origin, sem planos nem faturação, e preparado para correr no [Railway](https://railway.com). Envia através da tua conta do Amazon SES ou da PostShiba.

## O que faz

- **Escrever, rever, enviar.** Um editor com comandos `/`, imagens e caixas, ou Markdown e HTML pela API e pelo MCP. A revisão mostra o que corrigir antes de enviar: assunto, texto de pré-visualização, link para cancelar a subscrição, o corte do Gmail aos 100 KB, morada, remetente.
- **Importações** dos CSV do beehiiv, Substack, Mailchimp, Kit, MailerLite, Buttondown, Ghost e EmailOctopus, com o estado e a data de inscrição de cada leitor.
- **Um site por newsletter** em `/archive/<slug>`, ou num subdomínio teu, com formulário de inscrição, página de autor e sitemap.
- **Envio a partir do teu domínio**, com os registos DKIM, return path e DMARC a adicionar e uma verificação para cada um.
- **Proteções de entregabilidade:** primeiros envios por fases, limpeza de contactos inativos, limpeza de importações (endereços inválidos, armadilhas de spam, descartáveis…), pausa e bloqueio por devoluções e denúncias, taxas de spam do Gmail pelo Google Postmaster Tools, cancelamento com um clique e confirmação de subscrição.
- **Agentes de IA:** tudo o que o dashboard faz funciona pela API REST e pelo servidor MCP.

## Deploy no Railway

### O que precisas

| Serviço | Para quê |
| --- | --- |
| [Railway](https://railway.com) | A app e a base de dados MongoDB |
| [Amazon SES](https://aws.amazon.com/ses/) ou [PostShiba](https://postshiba.com) | Enviar os emails |
| [Upstash QStash](https://upstash.com/docs/qstash) | Envio em segundo plano e agendamentos (o plano gratuito chega para começar) |
| [Resend](https://resend.com) (opcional) | Códigos de início de sessão e alertas. Sem ele, vão pelo SES ou pela PostShiba |
| [Upstash Redis](https://upstash.com/docs/redis) (opcional) | Limites partilhados entre várias réplicas |
| Amazon S3 com CloudFront, ou um token do Vercel Blob (opcional) | Carregar imagens no editor |

### 1. Projeto e base de dados

1. No Railway, cria um projeto a partir deste repositório (**Deploy from GitHub repo**). O `railway.json` define o build (`npm run build`), o arranque (`npm start`) e a verificação de saúde em `/api/health`.
2. No mesmo projeto, adiciona uma base de dados **MongoDB** (**+ New > Database > MongoDB**).
3. Em **Settings > Networking** do serviço da app, gera um domínio público (ou liga o teu). Sem `APP_URL`, a app usa o domínio do Railway (`RAILWAY_PUBLIC_DOMAIN`).

### 2. Variáveis

No separador **Variables** do serviço da app:

| Variável | Valor |
| --- | --- |
| `MONGODB_URI` | `${{MongoDB.MONGO_URL}}/impactmail?authSource=admin` (a ligação do MongoDB do Railway com o nome da base de dados) |
| `BETTER_AUTH_SECRET` | 32+ caracteres aleatórios: `openssl rand -base64 48`. Mudá-lo termina todas as sessões e estraga os links dos emails já enviados |
| `SUPPRESSION_HASH_KEY` | Outros 32+ caracteres aleatórios, nunca o mesmo valor |
| `ADMIN_EMAILS` | O teu email: só tu inicias sessão e abres `/admin` |
| `EMAIL_FROM` | Remetente dos códigos e alertas, ex.: `ImpactMail <login@mail.impact-origin.com>`, num domínio verificado no Resend ou no fornecedor |
| `APP_URL` | O URL público final, sem `/` no fim. Os links dos emails usam-no, por isso define-o antes do primeiro envio |
| `CRON_SECRET` | `openssl rand -hex 32`. Liga as tarefas periódicas (ver abaixo) |
| `RESEND_API_KEY` | Opcional: códigos e alertas pelo Resend |
| `SENDING_ENABLED` | `true` quando estiver tudo pronto. Até lá, nada é enviado aos leitores |

O [`.env.example`](.env.example) tem todas as variáveis, as opcionais incluídas. Com um segredo curto a app recusa arrancar e o `/api/health` diz porquê.

Abre `https://<o-teu-domínio>/signin` e entra com o teu email. Sem Resend nem fornecedor configurado, o código não chega: configura um dos dois primeiro.

### 3. Tarefas periódicas

No Railway o servidor corre sempre, por isso chama as suas próprias rotas de cron assim que `CRON_SECRET` está definido (`lib/scheduler.js`): `/api/cron/hourly` de hora a hora (estado da PostShiba e alertas no Telegram) e `/api/cron/postmaster` uma vez por dia (taxas de spam do Gmail). Mantém o serviço com uma réplica; se usares outro agendador, define `SCHEDULER=off`.

### 4. Fornecedor de email

`EMAIL_PROVIDER` escolhe `ses` ou `postshiba`; sem ele, usa a PostShiba quando `POSTSHIBA_API_KEY` existe e o SES nos outros casos. A conta tem um tenant próprio no fornecedor, que o ImpactMail cria.

#### Amazon SES

Usa uma única região da AWS para tudo (os exemplos usam `us-east-1`).

1. **Pede acesso de produção.** Contas novas estão na sandbox (200 emails por dia, só para destinatários verificados). Em **Account dashboard > Request production access**, escolhe Marketing e explica que os leitores se inscrevem, que devoluções e denúncias são suprimidas automaticamente e que todos os emails têm cancelamento com um clique.
2. **Cria um tópico SNS** para os eventos, ex.: `impactmail-ses-events`, com a versão de assinatura 2: `aws sns set-topic-attributes --topic-arn <topic-arn> --attribute-name SignatureVersion --attribute-value 2`. Depois cria uma subscrição HTTPS para `https://<a-tua-app>/api/webhooks/ses`, com raw message delivery desligado. A app confirma a subscrição sozinha.
3. **Cria um utilizador IAM** com esta política e uma chave de acesso:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:GetAccount",
        "ses:CreateTenant",
        "ses:GetTenant",
        "ses:DeleteTenant",
        "ses:TagResource",
        "ses:CreateTenantResourceAssociation",
        "ses:DeleteTenantResourceAssociation",
        "ses:UpdateReputationEntityPolicy",
        "ses:UpdateReputationEntityCustomerManagedStatus",
        "ses:CreateConfigurationSet",
        "ses:CreateConfigurationSetEventDestination",
        "ses:DeleteConfigurationSet",
        "ses:CreateEmailIdentity",
        "ses:GetEmailIdentity",
        "ses:PutEmailIdentityMailFromAttributes",
        "ses:DeleteEmailIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

4. **Adiciona as variáveis:** `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_AWS_ACCOUNT_ID` (os 12 dígitos da conta) e `SES_SNS_TOPIC_ARN`.

Sem Resend, os códigos e alertas saem pelo SES a partir de `EMAIL_FROM`, por isso o domínio dele tem de estar verificado na conta AWS (**Identities > Create identity > Domain**, com Easy DKIM).

#### PostShiba

1. **Chave:** uma chave de acesso total em `POSTSHIBA_API_KEY` e o id da equipa em `POSTSHIBA_TEAM_ID`.
2. **Clusters:** o id do cluster `bulk` em `POSTSHIBA_BULK_CLUSTER_ID` e, opcionalmente, um `transactional` em `POSTSHIBA_TRANSACTIONAL_CLUSTER_ID`. Define `SEND_RATE_PER_SECOND` como o limite por hora do cluster a dividir por 3600.
3. **Webhook:** um endpoint para a equipa em `https://<a-tua-app>/api/webhooks/postshiba` com os eventos `processed`, `delivered`, `deferred`, `bounce`, `dropped`, `spamreport` e `unsubscribe`. O segredo vai para `POSTSHIBA_WEBHOOK_SECRET`.
4. **Chave de encriptação:** `CREDENTIALS_ENCRYPTION_KEY`, gerada uma vez com `openssl rand -base64 32`.

### 5. QStash

Na [consola da Upstash](https://console.upstash.com/qstash), copia `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY` (e `QSTASH_URL` se escolheste outra região). O QStash chama `APP_URL/api/jobs/...` para cada lote, por isso a app tem de estar acessível na internet.

### 6. Ligar o envio

1. Em **Domínios**, adiciona o domínio de envio. Usa um subdomínio, como `mail.impact-origin.com`, e adiciona os registos DNS indicados.
2. Cria a newsletter, com o remetente nesse domínio e uma morada postal (aparece no rodapé dos emails).
3. Define `SENDING_ENABLED=true`.
4. Envia-te um teste e depois envia.

### Opcional

- **Imagens:** um bucket S3 privado atrás do CloudFront (`IMAGES_S3_*`, `IMAGES_CDN_URL`, `IMAGES_CLOUDFRONT_DISTRIBUTION_ID`), ou um store do Vercel Blob com `BLOB_READ_WRITE_TOKEN`, que funciona fora da Vercel. Sem nenhum, os carregamentos ficam desligados.
- **Início de sessão com Google:** um cliente OAuth com o redirect `<APP_URL>/api/auth/callback/google`, em `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Com `CREDENTIALS_ENCRYPTION_KEY` e `CRON_SECRET`, o mesmo cliente liga o Google Postmaster Tools em `/admin` (redirect `<APP_URL>/api/admin/postmaster/callback`).
- **Alertas no Telegram:** `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.
- **Limites partilhados:** `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`, se correres mais de uma réplica.

## API e MCP

Cria uma chave na página **Chaves de API** e envia-a como `Authorization: Bearer <chave>`.

```bash
curl -X POST https://<a-tua-app>/api/v1/contacts \
  -H "Authorization: Bearer $IMPACTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","source":"website"}'
```

```bash
claude mcp add --transport http --scope user impactmail https://<a-tua-app>/mcp \
  --header "Authorization: Bearer $IMPACTMAIL_API_KEY"
```

A documentação completa está em `/docs` na tua app, com o documento OpenAPI em `/api/v1/openapi.json`.

## Desenvolvimento

Precisas do Node.js 22+ e do MongoDB:

```bash
npm install
cp .env.example .env.local   # define MONGODB_URI, BETTER_AUTH_SECRET, SUPPRESSION_HASH_KEY, ADMIN_EMAILS, EMAIL_FROM
npm run dev
```

Sem `RESEND_API_KEY`, em desenvolvimento o código de início de sessão aparece na consola do servidor. Antes de enviar alterações:

```bash
npm test       # os testes de integração arrancam o seu próprio mongod: tem de estar no PATH (ou em MONGOD_PATH)
npm run lint
npm run build
```

## Licença

[GNU Affero General Public License v3.0](LICENSE). Baseado no MailCheap, Copyright (C) 2026 Marc Lou. Se disponibilizares a app a outras pessoas, a AGPL pede que lhes ofereças o código da tua versão: o link "Código-fonte" (`SOURCE_URL` em `lib/site.js`) aponta para este repositório.
