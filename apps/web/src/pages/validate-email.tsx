import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";
import { useQueryState } from "nuqs";

export default function EmailValidation() {
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [token] = useQueryState("token", { defaultValue: "vazio" });
  const navigate = useNavigate();

  useEffect(() => {
    const validateEmail = async () => {
      setIsLoading(true);
      await api
        .get("/users/email-verification", {
          params: {
            token,
          },
        })
        .then((response) => {
          setMessage(response.data);
          setIsValidated(true);
        })
        .catch((error) => {
          setMessage(
            error?.response?.data || "Não foi possível validar o email"
          );
          setIsValidated(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    validateEmail();
  }, [token]);

  const handleReturn = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Validando seu email</CardTitle>
          <CardDescription>
            Por favor, aguarde enquanto verificamos seu email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {isValidated ? "Email Validado" : "Falha na Validação"}
        </CardTitle>
        <CardDescription>
          {isValidated
            ? "E-mail validado"
            : "Não foi possível validar seu email."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {isValidated ? (
          <CheckCircle className="h-16 w-16 text-green-500" />
        ) : (
          <XCircle className="h-16 w-16 text-red-500" />
        )}
        <p className="text-center">{message}</p>
        <Button onClick={handleReturn} className="w-full">
          Voltar para a página inicial
        </Button>
      </CardContent>
    </Card>
  );
}
