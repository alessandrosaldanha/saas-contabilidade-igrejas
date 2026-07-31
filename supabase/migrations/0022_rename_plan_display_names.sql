-- Padroniza os nomes de exibição dos planos pagos para o padrão SaaS
-- profissional ("Igreja Local" -> "Profissional", "Presbitério" -> "Premium").
-- Só `display_name` muda — `name` (identificador interno usado em
-- comparações no front, ex. `plan.name === "pro"`) permanece `pro`/`unlimited`.
update public.plans set display_name = 'Profissional' where name = 'pro';
update public.plans set display_name = 'Premium' where name = 'unlimited';
