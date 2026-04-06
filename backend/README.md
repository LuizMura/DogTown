# DogTown Instagram API

Backend simples para buscar postagens do Instagram sem expor token no front-end.

## 1. Instalar dependencias

```bash
cd backend
npm install
```

## 2. Configurar variaveis

Copie `.env.example` para `.env` e preencha:

- `INSTAGRAM_ACCESS_TOKEN` (token long-lived)
- `IG_TOKEN_REFRESH_INTERVAL_MS` (opcional, padrao: `86400000` = 24h)

`INSTAGRAM_USER_ID` pode ficar preenchido apenas como referencia, mas a API usa o endpoint `me/media` do Instagram Basic Display.

### Renovacao automatica de token

O backend tenta renovar automaticamente o token long-lived do Instagram:

- Periodicamente (por padrao, a cada 24h)
- Antes de buscar feed, respeitando o intervalo configurado
- Com uma nova tentativa quando detecta erro de autenticacao do token

Observacao: quando a renovacao retorna um novo token, ele tambem e salvo em `backend/.env` (chave `INSTAGRAM_ACCESS_TOKEN`) para sobreviver a reinicios do servidor.

## 3. Rodar a API

```bash
npm start
```

O servidor ficara em `http://localhost:3000/` e tambem expora a API em `http://localhost:3000/api/instagram-feed`.

Tambem expoe endpoints de analytics para o painel admin:

- `POST /api/analytics/event`
- `GET /api/analytics/summary`

## 4. Abrir o site

Com o servidor rodando, abra:

```text
http://localhost:3000/
```

## 5. Integrar no front-end

No front-end, o arquivo `js/instagram-feed.js` busca por padrao em `/api/instagram-feed`.

Se seu HTML estiver em outro host/porta, adicione antes do script:

```html
<script>
  window.DOGTOWN_INSTAGRAM_API = "http://localhost:3000/api/instagram-feed";
</script>
```

## Endpoint

`GET /api/instagram-feed`

Query params opcionais:

- `limit` (quantidade por lote; padrao no backend)
- `after` (cursor da pagina anterior para buscar proximos posts)

Resposta:

```json
{
  "source": "instagram",
  "pagination": {
    "nextCursor": "QVFI..."
  },
  "posts": [
    {
      "id": "...",
      "caption": "...",
      "permalink": "https://www.instagram.com/p/...",
      "imageUrl": "https://...",
      "timestamp": "2026-04-01T12:00:00+0000"
    }
  ]
}
```

## Endpoints de analytics

### `POST /api/analytics/event`

Body JSON:

```json
{
  "type": "pageview",
  "visitorId": "v-abc123",
  "page": "index.html",
  "dayKey": "2026-04-02"
}
```

`type` pode ser `pageview` ou `click`.

### `GET /api/analytics/summary`

Retorna o agregado de visitas, cliques, paginas e serie diaria usado no Dashboard do admin.
