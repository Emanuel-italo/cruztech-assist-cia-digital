import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, FileText, Calendar } from "lucide-react";
import cruztechLogo from "@/assets/cruztech-logo.jpg";

interface Report {
  id: string;
  client_name: string | null;
  status: string;
  visit_date: string;
  service_type: string | null;
}

const serviceLabels: Record<string, string> = {
  instalacao: "Instalação",
  preventiva: "Manutenção Preventiva",
  corretiva: "Manutenção Corretiva",
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, client_name, status, visit_date, service_type")
        .order("created_at", { ascending: false });
      setReports(data || []);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const createReport = async () => {
    const { data, error } = await supabase
      .from("reports")
      .insert({ user_id: user!.id })
      .select("id")
      .single();
    if (!error && data) {
      navigate(`/relatorio/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary px-4 py-3 flex items-center justify-between">
        <img src={cruztechLogo} alt="Cruztech" className="h-10 object-contain" />
        <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary/80">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Meus Relatórios</h1>
          <Button onClick={createReport} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p>Nenhum relatório ainda.</p>
              <p className="text-sm">Toque em "Novo" para criar.</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((r) => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/relatorio/${r.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{r.client_name || "Cliente não informado"}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.service_type ? serviceLabels[r.service_type] || r.service_type : "Tipo não definido"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === "concluido" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {r.status === "concluido" ? "Concluído" : "Rascunho"}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(r.visit_date).toLocaleDateString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default Dashboard;
