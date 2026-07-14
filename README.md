# Lacuna · Treino de raciocínio clínico

Dois instrumentos complementares para fisioterapeutas neuromusculoesqueléticos:

1. **Simulador de casos com IA** (`/simulador`) — o caso é gerado na hora pelo Claude, que faz o papel de paciente e de mentor. O profissional externaliza o raciocínio ANTES de receber qualquer resposta: hipóteses com confiança declarada, anamnese com justificativa obrigatória por pergunta, exame com interpretação antecipada, conduta e debrief com notas por dimensão. **Para testar, só precisa de `ANTHROPIC_API_KEY` — não requer Supabase.**
2. **Banco de Casos** (Método Lacuna, Fase 1) — casos curados em etapas com commit de confiança travado, pontuação por Brier/ancoragem/portão de segurança. Requer Supabase.

## Simulador — teste em 2 minutos

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-sua-chave" > .env.local
npm run dev        # abra http://localhost:3000/simulador
```

A chave fica só no servidor (rota `/api/claude`); o navegador nunca fala direto com a API da Anthropic. O modelo é configurável via `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`).

> Atenção: a rota `/simulador` é pública de propósito (para facilitar o teste). Antes de um deploy aberto na internet, proteja-a com login ou aceite o custo de uso anônimo da sua chave.

---

# Banco de Casos (Método Lacuna)

O usuário recebe um caso clínico **em etapas**. A cada etapa declara sua confiança (0–100%) numa proposição do caso e **trava** antes de ver a etapa seguinte. No fim, vê o desfecho verificado e sua trajetória de confiança contra a trajetória calibrada. **O que se mede não é o acerto final — é o comportamento de revisão.**

## O mecanismo inviolável

A confiança é declarada **antes** da revelação seguinte e não pode ser alterada depois:

- O commit é persistido no servidor com timestamp do servidor.
- Etapas futuras **não são enviadas ao cliente** antes do commit da atual (não estão no payload — cada etapa é buscada do servidor após o commit da anterior).
- Commits são imutáveis (trigger no banco rejeita `UPDATE`/`DELETE`).
- Refazer um caso cria uma nova tentativa, nunca sobrescreve.

## Stack

- **Next.js (App Router) + TypeScript**
- **Supabase** — Postgres + Auth por magic link
- **Tailwind CSS**
- **Recharts** — trajetória e curva de calibração
- **Vercel** — deploy

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, execute `supabase/migrations/0001_init.sql`.
3. Em *Authentication → URL Configuration*, configure o Site URL da sua instalação (ex.: `http://localhost:3000` em dev) e adicione `/auth/confirm` às Redirect URLs.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as chaves do projeto (Settings → API). A `SUPABASE_SERVICE_ROLE_KEY` é usada só no servidor — as tabelas de casos/tentativas **não têm** políticas de leitura para o cliente, de propósito: todo acesso passa pelo servidor, que controla o que entra no payload.

### 3. Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes da lógica de pontuação e validação
```

### 4. Primeiro mentor e primeiros casos

1. Entre no app com seu e-mail (magic link). Isso cria seu perfil como `mentee`.
2. Promova-se a mentor no SQL Editor:
   ```sql
   update public.profiles set role = 'mentor' where email = 'voce@exemplo.com';
   ```
3. Acesse **Importar** no app e cole o conteúdo de `cases/exemplos.json` (4 casos demonstrativos: padrão, impostor, ambíguo e armadilha).

> Os casos de exemplo são demonstrativos. O gargalo real do produto é escrever 10–20 casos de verdade — use o template da especificação (§11).

## Pontuação

| Métrica | O que mede |
|---|---|
| **Brier** | `(confiançaFinal/100 − desfecho)²`, calculado só sobre o último commit. Agregado exibido apenas com ≥ 15 tentativas. |
| **Desvio de referência** | Erro médio absoluto vs. trajetória calibrada — usado em casos ambíguos, onde premiar chute confiante que deu sorte seria o oposto do objetivo. |
| **Índice de ancoragem** | Em cada etapa discriminativa: a confiança moveu na direção esperada com o deslocamento mínimo? A métrica mais original do produto. |
| **Portão de segurança** | Em casos impostores: terminar acima do limite (default 40%) é **falha**, não nota baixa. Nunca entra em média — é listado individualmente. |

## Estrutura

```
supabase/migrations/   schema Postgres + RLS + trigger de imutabilidade
src/lib/               tipos, pontuação, validação de import, métricas
src/app/api/           attempts (iniciar, estado, commit, debrief) e import
src/app/               login, biblioteca, player, debrief, painel, import
cases/                 casos demonstrativos em JSON
```

## Anti-requisitos (o que este app não é)

Sem LMS, sem vídeo, sem fórum, sem gamificação e **sem ranking**: quando a medida vira alvo, deixa de ser boa medida (Goodhart). O instrumento existe para a pessoa se ver com honestidade.
