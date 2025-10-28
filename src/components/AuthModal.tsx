import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signIn, signUp, signOut } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    try {
      setLoading(true);

      // Validazione input
      if (!email.trim() || !password.trim()) {
        toast({
          title: "Errore",
          description: "Email e password sono obbligatori",
          variant: "destructive",
        });
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          title: "Errore",
          description: "Formato email non valido",
          variant: "destructive",
        });
        return;
      }

      if (password.length < 6) {
        toast({
          title: "Errore",
          description: "La password deve essere di almeno 6 caratteri",
          variant: "destructive",
        });
        return;
      }

      if (isRegister && !fullName.trim()) {
        toast({
          title: "Errore",
          description: "Il nome è obbligatorio per la registrazione",
          variant: "destructive",
        });
        return;
      }

      if (isRegister) {
        await signUp(email, password, fullName);
        toast({
          title: "Registrazione completata!",
          description: "Controlla la tua email per confermare l'account.",
        });
      } else {
        await signIn(email, password);
        toast({
          title: "Accesso effettuato!",
          description: "Benvenuto nel tuo giardino 🌿",
        });
      }

      onClose();
    } catch (err: any) {
      const message =
        err.message.includes("registrata") || err.message.includes("User already")
          ? "Questa email è già registrata. Prova ad accedere."
          : err.message || "Errore durante l'autenticazione.";
      
      toast({
        title: "Errore",
        description: message,
        variant: "destructive",
      });

      // 👇 Se l'errore è "utente già registrato", passa automaticamente al login
      if (err.message.includes("registrata")) {
        setIsRegister(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {user
              ? "Profilo utente"
              : isRegister
              ? "Crea un account 🌱"
              : "Accedi al tuo giardino 🌿"}
          </DialogTitle>
        </DialogHeader>

        {user ? (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Sei loggato come <strong>{user.email}</strong>
            </p>
            <Button onClick={signOut} className="w-full">
              Esci
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isRegister && (
              <Input
                type="text"
                placeholder="Nome e Cognome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-gradient-primary"
            >
              {loading
                ? "Caricamento..."
                : isRegister
                ? "Registrati"
                : "Accedi"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {isRegister ? "Hai già un account?" : "Non hai un account?"}{" "}
              <button
                onClick={() => setIsRegister((r) => !r)}
                className="text-primary underline"
              >
                {isRegister ? "Accedi" : "Registrati"}
              </button>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
