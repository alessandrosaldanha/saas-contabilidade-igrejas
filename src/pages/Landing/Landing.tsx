import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Wallet, FileText, Building2, Clock, MessageCircle, Menu, X } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import Card from "../../components/Card";
import PricingSection from "./components/PricingSection";
import FaqSection from "./components/FaqSection";
import HeroCarousel from "./components/HeroCarousel";
import { useAuth } from "../../context/AuthContext";
import { getHomePath } from "../../utils/homePath";
import { supabase } from "../../services/supabase";
import { mapLandingImageRow } from "../../utils/landingImages";
import { mapLandingHeroImageRow } from "../../utils/landingHeroImages";
import { SOCIAL_PLATFORM_META, mapSocialLinkRow } from "../../utils/socialLinks";
import chapelIllustration from "../../assets/chapel-illustration.svg";
import logoAzul from "../../assets/logo-azul.svg";
import type { LandingImageKey, SocialLink } from "../../types";

const WHATSAPP_LINK =
  "https://wa.me/5582981273619?text=Olá!%20Vi%20o%20site%20e%20quero%20saber%20mais%20sobre%20o%20Contabilidade%20Igreja";

const HOW_IT_WORKS = [
  {
    icon: Wallet,
    title: "Livro Caixa automático",
    description: "Registre entradas e saídas em poucos cliques e tenha o saldo da igreja sempre atualizado, sem planilha.",
  },
  {
    icon: FileText,
    title: "Importação de extrato com IA",
    description: "Envie o extrato do banco (PDF, OFX, CSV ou imagem) e deixe a Inteligência Artificial sugerir a categoria de cada lançamento pra você só revisar.",
  },
  {
    icon: Building2,
    title: "Multi-igreja (matriz/filial)",
    description: "Acompanhe a igreja matriz e todas as subcongregações separadamente ou de forma consolidada, num só lugar.",
  },
  {
    icon: Clock,
    title: "Trilha de auditoria",
    description: "Todo lançamento e alteração fica registrado de forma imutável, com transparência total pra Conselho Fiscal e Auditoria.",
  },
];

// Menu do header — Contato fica de fora aqui (a seção em si continua
// intacta na página); o footer usa FOOTER_NAV_LINKS, que inclui Contato,
// já que footer é o lugar padrão de navegação completa.
const NAV_LINKS = [
  { href: "#top", label: "Início" },
  { href: "#sobre-nos", label: "Sobre Nós" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas Frequentes", shortLabel: "Dúvidas" },
];

const FOOTER_NAV_LINKS = [...NAV_LINKS, { href: "#contato", label: "Contato" }];

export default function Landing() {
  const { session, profile, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [images, setImages] = useState<Partial<Record<LandingImageKey, string>>>({});
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Leitura pública (RLS `landing_images_select_public`, migration 0029) —
  // sem sessão, igual à RPC get_public_plans() usada pelo PricingSection.
  // Uma seção sem imagem cadastrada simplesmente não entra no map, e cada
  // seção abaixo já trata a ausência renderizando só o texto, sem buraco.
  useEffect(() => {
    supabase
      .from("landing_images")
      .select("key, image_url")
      .then(({ data }) => {
        if (!data) return;
        const map: Partial<Record<LandingImageKey, string>> = {};
        data.map(mapLandingImageRow).forEach((row) => {
          if (row.imageUrl) map[row.key] = row.imageUrl;
        });
        setImages(map);
      });
  }, []);

  // Leitura pública (RLS `landing_hero_images_select_public`, migration
  // 0031) — só as imagens ativas do carrossel do Hero, já ordenadas.
  // `HeroCarousel` decide estático (1 imagem) vs. carrossel (2+) sozinho.
  useEffect(() => {
    supabase
      .from("landing_hero_images")
      .select("id, image_url, display_order, is_active")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setHeroImages(data.map(mapLandingHeroImageRow).map((row) => row.imageUrl));
      });
  }, []);

  // Leitura pública (RLS `social_links_select_public`, migration 0030) — só
  // os links ativos já chegam pra role `anon`; ordenados por display_order
  // pra render do footer não precisar reordenar de novo.
  useEffect(() => {
    supabase
      .from("social_links")
      .select("platform, url, display_order, is_active")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setSocialLinks(data.map(mapSocialLinkRow));
      });
  }, []);

  // Sessão ainda resolvendo (getSession() do Supabase, local/rápido, mas
  // assíncrono) — evita piscar a landing pra depois trocar pro painel.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-700 dark:text-neutral-400">
        Carregando…
      </div>
    );
  }

  // Usuário já autenticado que caiu em "/" (ex: link salvo) vai direto pro
  // painel dele, sem ver a landing de novo.
  if (session && profile) {
    return <Navigate to={getHomePath(profile.role)} replace />;
  }

  return (
    <div id="top" className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* z-50: header sticky, precisa ficar acima de QUALQUER conteúdo da
          página — mesmo nível do Sidebar (área logada, z-50). Ver escala de
          z-index documentada em docs/architecture.md; o bug corrigido aqui
          foi o vazamento do Hero (abaixo) e o conteúdo de "Como Funciona"
          empatando em z-30 com este header — em z-index empatado, quem vem
          depois no DOM (a seção) pintava por cima do header ao rolar. */}
      <header className="sticky top-0 z-50 border-b border-neutral-300 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-5 sm:px-8 h-16">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={logoAzul} alt="Contabilidade Igreja" className="w-6 h-6 shrink-0" />
            <span className="hidden sm:inline font-display font-semibold text-[17px] tracking-tight">
              Contabilidade Igreja
            </span>
          </div>

          <nav className="hidden xl:flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300 hover:text-orla-blue"
              >
                {link.shortLabel ?? link.label}
              </a>
            ))}
          </nav>

          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orla-blue">
              Entrar
            </Link>
            <Link
              to="/login?signup=1"
              className="px-3.5 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Criar Conta
            </Link>
          </div>

          <div className="flex xl:hidden items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-300 hover:text-orla-blue"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-neutral-300 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-sm">
            <nav className="flex flex-col px-5 sm:px-8 py-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className="flex items-center min-h-[44px] text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orla-blue"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-3 px-5 sm:px-8 py-4 border-t border-neutral-300 dark:border-white/10">
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center justify-center min-h-[44px] px-4 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                Entrar
              </Link>
              <Link
                to="/login?signup=1"
                onClick={closeMobileMenu}
                className="flex items-center justify-center min-h-[44px] px-4 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero — fundo azul-gelo (tom bem claro/dessaturado de orla-blue), só
          nesta seção; as demais seguem a alternância neutra padrão. Sem
          overflow-hidden aqui de propósito: a imagem do carrossel "vaza"
          por baixo do fim visual do Hero (ver `lg:-mb-*` no wrapper dela,
          abaixo) — a ilustração de fundo continua contida pelo próprio
          `inset-0`, então remover o overflow não afeta ela. */}
      <section className="relative bg-[#eef3fc] dark:bg-[#0b1220]">
        <div className="absolute inset-0">
          <img
            src={chapelIllustration}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-[0.06] dark:opacity-[0.12]"
          />
        </div>
        <div
          className={`relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 ${
            heroImages.length > 0
              ? "grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center text-center lg:text-left"
              : "text-center"
          }`}
        >
          <div>
            <h1
              className={`font-display font-semibold text-3xl sm:text-5xl leading-[1.15] tracking-tight ${
                heroImages.length > 0 ? "" : "max-w-3xl mx-auto"
              }`}
            >
              Contabilidade da sua igreja, sem depender de planilha ou de quem "entende"
            </h1>
            <p
              className={`text-base sm:text-lg text-neutral-700 dark:text-neutral-400 mt-5 ${
                heroImages.length > 0 ? "" : "max-w-2xl mx-auto"
              }`}
            >
              Livro Caixa, importação de extrato com Inteligência Artificial e trilha de auditoria completa, tudo num só
              lugar, pensado pra tesoureiro voluntário, não pra contador.
            </p>
            <div
              className={`flex flex-col sm:flex-row items-center gap-3 mt-8 ${
                heroImages.length > 0 ? "justify-center lg:justify-start" : "justify-center"
              }`}
            >
              <Link
                to="/login?signup=1"
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Começar Gratuitamente
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          {heroImages.length > 0 && (
            // z-10 (escala de z-index em docs/architecture.md) + margin
            // negativo só a partir de lg (onde o layout vira lado-a-lado):
            // a imagem "vaza" por cima do topo da seção "Como Funciona" —
            // abaixo de lg o Hero empilha texto/imagem, e o vazamento
            // ficaria estranho encostado no próprio texto.
            // `lg:self-stretch` (não `self-start`/`self-end`): precisa
            // esticar pra que a margem negativa realmente conte. Com
            // `self-start`, o topo fica preso ao topo da linha (= topo do
            // H1, correto), mas o fim da moldura vira só `topo + altura
            // própria` — a margem negativa não empurra nada porque não há
            // mais "linha" abaixo pra ela consumir (o texto já define a
            // altura da linha, a imagem some dentro sem tocar a borda).
            // Com `self-stretch`, a altura da moldura passa a ser
            // `altura-da-linha − margin-bottom` — como a margem é negativa,
            // isso AUMENTA a altura pra além da linha, esticando a moldura
            // pra baixo a partir do mesmo topo (H1) e garantindo o
            // vazamento. `lg:h-full` dentro do HeroCarousel propaga essa
            // altura esticada pra moldura/imagem interna.
            <div className="relative z-10 lg:self-stretch lg:-mb-32 lg:ml-auto w-full max-w-lg lg:max-w-none">
              <HeroCarousel images={heroImages} />
            </div>
          )}
        </div>
      </section>

      {/* Como funciona — z-20 no conteúdo garante que ele sempre pinta por
          cima da imagem do Hero que vaza por baixo (z-10, ver acima); o
          fundo da própria section (sem z-index) fica abaixo dos dois, e o
          header (z-50, sticky) fica acima de tudo — escala documentada em
          docs/architecture.md. pt extra em lg dá um respiro pra não ficar
          colado na parte invasora do carrossel. */}
      <section id="como-funciona" className="scroll-mt-16 bg-white dark:bg-black">
        <div className="relative z-20 max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20">
          <div className="text-center mb-10">
            <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">Como funciona</h2>
            <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-400 mt-2">
              Tudo que sua igreja precisa pra manter as finanças organizadas e transparentes.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ icon: Icon, title, description }) => (
              <Card key={title} padding="lg" className="flex flex-col gap-3">
                <span className="w-10 h-10 rounded-full bg-orla-blue/15 flex items-center justify-center">
                  <Icon size={18} className="text-orla-blue" />
                </span>
                <h3 className="font-display font-semibold text-base m-0">{title}</h3>
                <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre nós */}
      <section id="sobre-nos" className="scroll-mt-16 bg-neutral-50 dark:bg-neutral-950">
        <div
          className={
            images.sobre_nos
              ? "max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 lg:items-center"
              : "max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center"
          }
        >
          <div className={images.sobre_nos ? "text-center lg:text-left" : ""}>
            <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-4">Sobre nós</h2>
            <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-400 leading-relaxed">
              Nascemos da necessidade real de uma igreja local, a Igreja Batista Reformada de Maceió (IBR Maceió), de
              organizar suas finanças com transparência e governança sólida. Hoje ajudamos outras igrejas a fazer o
              mesmo, com a mesma seriedade que a mordomia fiel dos recursos da igreja exige.
            </p>
          </div>
          {images.sobre_nos && (
            <div className="rounded-2xl border border-neutral-300 dark:border-white/10 shadow-md overflow-hidden bg-white dark:bg-neutral-900">
              <img src={images.sobre_nos} alt="Sobre nós" className="w-full h-auto object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="scroll-mt-16 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="text-center mb-10">
            <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">Planos</h2>
            <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-400 mt-2">
              Comece grátis e evolua conforme sua igreja crescer.
            </p>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="scroll-mt-16 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="text-center mb-10">
            <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">Dúvidas Frequentes</h2>
          </div>
          <FaqSection />
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="scroll-mt-16 bg-white dark:bg-black">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-4">Ficou com alguma dúvida?</h2>
          <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-400 mb-6">
            Fale com a gente diretamente pelo WhatsApp.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-status-success text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <MessageCircle size={16} />
            Falar no WhatsApp
          </a>
        </div>
      </section>

      <footer className="border-t border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-14">
          <div className="grid gap-10 sm:grid-cols-3 text-center sm:text-left">
            <div className="flex flex-col gap-3 items-center sm:items-start">
              <div className="flex items-center gap-2.5">
                <img src={logoAzul} alt="Contabilidade Igreja" className="w-6 h-6 shrink-0" />
                <span className="font-display font-semibold text-[17px] tracking-tight">Contabilidade Igreja</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed max-w-xs">
                Gestão financeira, contábil e de governança para igrejas locais, com apoio de Inteligência Artificial.
              </p>
            </div>

            <div className="flex flex-col gap-3 items-center sm:items-start">
              <h5 className="font-display font-semibold text-sm m-0">Navegação</h5>
              <nav className="flex flex-col gap-2 items-center sm:items-start">
                {FOOTER_NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-orla-blue"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex flex-col gap-3 items-center sm:items-start">
              <h5 className="font-display font-semibold text-sm m-0">Contato</h5>
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-3">
                  {socialLinks.map((link) => {
                    const meta = SOCIAL_PLATFORM_META.find((m) => m.platform === link.platform);
                    if (!meta || !link.url) return null;
                    const Icon = meta.icon;
                    return (
                      <a
                        key={link.platform}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={meta.label}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-300 hover:text-orla-blue hover:border-orla-blue transition-colors"
                      >
                        <Icon size={16} />
                      </a>
                    );
                  })}
                </div>
              )}
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-status-success hover:opacity-80 transition-opacity"
              >
                <MessageCircle size={15} />
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-700 dark:text-neutral-400 mt-10 pt-6 border-t border-neutral-300 dark:border-white/10">
            <span>© {new Date().getFullYear()} Contabilidade Igreja. Todos os direitos reservados.</span>
            <Link to="/login" className="hover:text-orla-blue">
              Entrar na plataforma
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
