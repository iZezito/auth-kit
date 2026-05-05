import ContentLoader from "@/components/content-loader";
import { PageLayout } from "@/components/page-layout";
import { ProfileForm } from "@/components/profile-form";
import { useAuth } from "@/contexts/AuthContext";

export default function Profile() {
  const { user, loading, error } = useAuth();

  return (
    <PageLayout breadcrumbs={[{ label: "Meus Dados" }]}>
      <ContentLoader
        loading={loading}
        error={error}
        noContent={"Nenhum dado!"}
      >
        {user && (
          <ProfileForm
            user={user}
          />
        )}
      </ContentLoader>
    </PageLayout>
  );
}
