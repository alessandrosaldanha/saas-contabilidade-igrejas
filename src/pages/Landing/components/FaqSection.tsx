import Accordion from "../../../components/Accordion";

const FAQ_ITEMS = [
  {
    question: "Meus dados financeiros estão seguros?",
    answer:
      "Sim. Os dados de cada igreja são isolados dos demais tenants na plataforma, protegidos por controle de acesso por papel (Admin, Tesoureiro, Auditor, Conselho Fiscal) e por uma trilha de auditoria imutável que registra todo lançamento e alteração relevante.",
  },
  {
    question: "Preciso saber contabilidade para usar a plataforma?",
    answer:
      "Não. O Livro Caixa foi pensado para tesoureiros voluntários, sem formação contábil. A leitura de extratos por Inteligência Artificial já sugere a categoria de cada lançamento, e você só confere e aprova.",
  },
  {
    question: "A plataforma suporta subcongregações?",
    answer:
      "Sim. Uma igreja matriz pode cadastrar suas subcongregações (filiais) e acompanhar as finanças de cada uma separadamente ou de forma consolidada, dependendo do plano escolhido.",
  },
  {
    question: "Como funciona o cancelamento?",
    answer:
      "Você pode voltar para o plano Gratuito a qualquer momento, sem multa ou período de fidelidade. Seus lançamentos e histórico continuam disponíveis, respeitando os limites do novo plano.",
  },
];

export default function FaqSection() {
  return <Accordion items={FAQ_ITEMS} />;
}
