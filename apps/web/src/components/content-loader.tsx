import React from "react";
import { Loader } from "./ui/loader";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { XCircle } from "lucide-react";
import { Button } from "./ui/button";
import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

interface Props {
  loading: boolean;
  error: Error | AxiosError<ApiError> | null | undefined;
  noContent: string | React.ReactNode;
  loadingComponent?: React.ReactNode;
  repeat?: number;
  children?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

const ContentLoader: React.FC<Props> = ({
  loading,
  error,
  noContent,
  loadingComponent,
  repeat,
  children,
  onRetry,
  retryLabel,
}) => {
  if (loading) {
    if (loadingComponent && repeat) {
      return (
        <>
          {Array.from({ length: repeat }).map((_, index) => (
            <div key={index} className="m-2">
              {loadingComponent}
            </div>
          ))}
        </>
      );
    }

    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return <Loader />;
  }

  if (error) {
    const message = (error as AxiosError<ApiError>).response?.data.message || "Não foi possível carregar os dados.";
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <XCircle className="h-16 w-16 text-red-500" />
          </EmptyMedia>
          <EmptyTitle>Algo deu errado</EmptyTitle>
          <EmptyDescription>
            {message}
          </EmptyDescription>
          {typeof onRetry === "function" && (
            <div className="mt-4">
              <Button onClick={onRetry}>{retryLabel || "Tentar novamente"}</Button>
            </div>
          )}
        </EmptyHeader>
      </Empty>
    );
  }

  if (!children) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <XCircle className="h-16 w-16 text-red-500" />
          </EmptyMedia>
          <EmptyTitle>Nenhum dado encontrado!</EmptyTitle>
          <EmptyDescription>
          {noContent}
        </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <>{children}</>;
};

export default ContentLoader;
