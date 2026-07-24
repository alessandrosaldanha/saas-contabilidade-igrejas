-- Vincula transactions ao lote de import_history que as originou, para que
-- excluir um registro de importação também remova os lançamentos que vieram
-- daquele extrato no Livro Caixa (em vez de só apagar a linha de histórico).

alter table public.transactions
  add column import_id uuid references public.import_history (id) on delete cascade;

-- Nota: transações criadas antes desta migration (importadas ou manuais) ficam
-- com import_id nulo — não há como reconstruir retroativamente qual lote as
-- originou, então excluir um registro de importação anterior a esta mudança
-- não vai remover nenhum lançamento antigo (o trigger on_transaction_delete
-- já existente continua sendo quem audita cada exclusão em cascata).
