import { Spinner } from "./spinner";

export const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen">
      <Spinner className="size-8 text-primary"/>
      <p className="mt-4">Carregando...</p>
    </div>
  );
};
