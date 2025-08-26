# Fácil Pharma — Sistema de Gestão Hospitalar v1.0

Protótipo Next.js + Supabase para pedidos por sala (tablets/kiosk) com fila da farmácia em tempo real.

## Como rodar
1) No Supabase Console → SQL Editor, rode `supabase/01_schema.sql`, depois `supabase/02_seeds.sql`. (Opcional: `supabase/03_rpc_status.sql`). Crie usuários em Auth e preencha `profiles`.
2) Edite `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3) Instale deps e rode:
```bash
npm i
npm run dev
```
Acesse `/signin` para login por link mágico. Perfis `nurse` vão para `/sala`; `pharmacy/admin` para `/farmacia`.

## Observações
- LGPD: sem dados pessoais de pacientes. Pedidos por sala.
- MAV: itens marcados em `meds.high_alert` (heparina, etc.).
- Realtime já habilitado nos inserts/updates.
