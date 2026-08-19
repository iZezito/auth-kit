import { PageLayout } from "@/components/page-layout"

export default function Admin() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: "Início", to: "/home" },
        { label: "Administração" },
      ]}
    >
      <section className="rounded-xl border bg-card p-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Administração
        </h1>
        <p className="mt-2 text-muted-foreground">
          Adicione neste grupo as páginas disponíveis somente para
          administradores.
        </p>
      </section>
    </PageLayout>
  )
}
