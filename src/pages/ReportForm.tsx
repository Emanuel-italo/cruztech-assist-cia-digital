import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Camera, MapPin, X } from "lucide-react";
import cruztechLogo from "@/assets/cruztech-logo.jpg";

interface Equipment {
  id?: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  info: string;
}

interface ReportData {
  client_name: string;
  client_cnpj: string;
  client_email: string;
  client_address: string;
  client_additional_info: string;
  service_type: string;
  vehicle_km: string;
  visit_date: string;
  gps_lat: number | null;
  gps_lng: number | null;
  pmoc_month: string;
  pmoc_period: string;
  pmoc_filter_clean: string;
  pmoc_filter_fix: string;
  pmoc_cabinet_air: string;
  pmoc_cabinet_buttons: string;
  problem_description: string;
  service_performed: string;
}

const emptyEquipment = (): Equipment => ({ name: "", brand: "", model: "", serial_number: "", info: "" });

const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const ReportForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const [form, setForm] = useState<ReportData>({
    client_name: "", client_cnpj: "", client_email: "", client_address: "", client_additional_info: "",
    service_type: "", vehicle_km: "",
    visit_date: new Date().toISOString().slice(0, 16),
    gps_lat: null, gps_lng: null,
    pmoc_month: "", pmoc_period: "",
    pmoc_filter_clean: "", pmoc_filter_fix: "", pmoc_cabinet_air: "", pmoc_cabinet_buttons: "",
    problem_description: "", service_performed: "",
  });

  const [equipment, setEquipment] = useState<Equipment[]>([emptyEquipment()]);
  const [photos, setPhotos] = useState<{ id?: string; url: string; file?: File }[]>([]);
  const [saving, setSaving] = useState(false);

  // Load report
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
      if (report) {
        setForm({
          client_name: report.client_name || "",
          client_cnpj: report.client_cnpj || "",
          client_email: report.client_email || "",
          client_address: report.client_address || "",
          client_additional_info: report.client_additional_info || "",
          service_type: report.service_type || "",
          vehicle_km: report.vehicle_km?.toString() || "",
          visit_date: report.visit_date ? new Date(report.visit_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          gps_lat: report.gps_lat, gps_lng: report.gps_lng,
          pmoc_month: report.pmoc_month || "", pmoc_period: report.pmoc_period || "",
          pmoc_filter_clean: report.pmoc_filter_clean || "",
          pmoc_filter_fix: report.pmoc_filter_fix || "",
          pmoc_cabinet_air: report.pmoc_cabinet_air || "",
          pmoc_cabinet_buttons: report.pmoc_cabinet_buttons || "",
          problem_description: report.problem_description || "",
          service_performed: report.service_performed || "",
        });

        // Load signature to canvas
        if (report.signature_url) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx && canvasRef.current) {
              ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          };
          const { data: signedUrl } = await supabase.storage.from("signatures").createSignedUrl(report.signature_url, 3600);
          if (signedUrl) img.src = signedUrl.signedUrl;
        }
      }

      const { data: equips } = await supabase.from("report_equipment").select("*").eq("report_id", id);
      if (equips && equips.length > 0) setEquipment(equips.map(e => ({ id: e.id, name: e.name, brand: e.brand || "", model: e.model || "", serial_number: e.serial_number || "", info: e.info || "" })));

      const { data: photoData } = await supabase.from("report_photos").select("*").eq("report_id", id);
      if (photoData) {
        const photoUrls = await Promise.all(photoData.map(async (p) => {
          const { data } = await supabase.storage.from("report-photos").createSignedUrl(p.storage_path, 3600);
          return { id: p.id, url: data?.signedUrl || "" };
        }));
        setPhotos(photoUrls);
      }
    };
    load();
  }, [id]);

  const updateField = (field: keyof ReportData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // GPS
  const captureGPS = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }));
        toast({ title: "GPS capturado!" });
      },
      () => toast({ title: "Erro ao capturar GPS", variant: "destructive" })
    );
  };

  // Photos
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 4 - photos.length;
    const newPhotos = Array.from(files).slice(0, remaining).map(f => ({ url: URL.createObjectURL(f), file: f }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  // Signature canvas
  const getCanvasPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch = "touches" in e ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setDrawing(true);
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.lineWidth = 2; ctx.strokeStyle = "#0a1f44"; ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
  };

  const stopDraw = () => setDrawing(false);
  const clearSignature = () => { const ctx = canvasRef.current?.getContext("2d"); if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); };

  // Save
  const saveReport = async (finalize = false) => {
    if (!id || !user) return;
    setSaving(true);
    try {
      // Upload photos
      for (const photo of photos) {
        if (photo.file) {
          const path = `${user.id}/${id}/${Date.now()}-${photo.file.name}`;
          await supabase.storage.from("report-photos").upload(path, photo.file);
          await supabase.from("report_photos").insert({ report_id: id, storage_path: path });
        }
      }

      // Upload signature
      let signaturePath: string | undefined;
      if (canvasRef.current) {
        const blob = await new Promise<Blob | null>(r => canvasRef.current!.toBlob(r, "image/png"));
        if (blob && blob.size > 500) {
          signaturePath = `${user.id}/${id}/signature.png`;
          await supabase.storage.from("signatures").upload(signaturePath, blob, { upsert: true });
        }
      }

      // Save report
      await supabase.from("reports").update({
        ...form,
        vehicle_km: form.vehicle_km ? Number(form.vehicle_km) : null,
        visit_date: new Date(form.visit_date).toISOString(),
        status: finalize ? "concluido" : "rascunho",
        ...(signaturePath ? { signature_url: signaturePath } : {}),
      }).eq("id", id);

      // Save equipment
      await supabase.from("report_equipment").delete().eq("report_id", id);
      const validEquip = equipment.filter(e => e.name.trim());
      if (validEquip.length) {
        await supabase.from("report_equipment").insert(validEquip.map(e => ({
          report_id: id, name: e.name, brand: e.brand, model: e.model, serial_number: e.serial_number, info: e.info,
        })));
      }

      toast({ title: finalize ? "Relatório concluído!" : "Rascunho salvo!" });
      if (finalize) navigate("/");
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary/80">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={cruztechLogo} alt="Cruztech" className="h-8 object-contain" />
        <span className="text-primary-foreground font-semibold text-sm ml-auto">Relatório</span>
      </header>

      <main className="p-4 max-w-lg mx-auto pb-32">
        <Accordion type="multiple" defaultValue={["a"]} className="space-y-2">
          {/* Section A */}
          <AccordionItem value="a" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">A - Dados do Cliente</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div><Label>Nome / Razão Social</Label><Input value={form.client_name} onChange={e => updateField("client_name", e.target.value)} /></div>
              <div><Label>CNPJ</Label><Input value={form.client_cnpj} onChange={e => updateField("client_cnpj", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.client_email} onChange={e => updateField("client_email", e.target.value)} /></div>
              <div><Label>Endereço</Label><Input value={form.client_address} onChange={e => updateField("client_address", e.target.value)} /></div>
              <div><Label>Informações adicionais</Label><Input value={form.client_additional_info} onChange={e => updateField("client_additional_info", e.target.value)} placeholder="Ex: Nome do síndico" /></div>
            </AccordionContent>
          </AccordionItem>

          {/* Section B */}
          <AccordionItem value="b" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">B - Informações da Visita</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div>
                <Label>Tipo de Serviço</Label>
                <Select value={form.service_type} onValueChange={v => updateField("service_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instalacao">Instalação</SelectItem>
                    <SelectItem value="preventiva">Manutenção Preventiva</SelectItem>
                    <SelectItem value="corretiva">Manutenção Corretiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Km do veículo</Label><Input type="number" value={form.vehicle_km} onChange={e => updateField("vehicle_km", e.target.value)} /></div>
              <div><Label>Data e Hora</Label><Input type="datetime-local" value={form.visit_date} onChange={e => updateField("visit_date", e.target.value)} /></div>
              <div>
                <Label>Localização GPS</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={captureGPS}>
                    <MapPin className="h-4 w-4 mr-1" /> Capturar GPS
                  </Button>
                  {form.gps_lat && <span className="text-xs text-muted-foreground">{form.gps_lat.toFixed(6)}, {form.gps_lng?.toFixed(6)}</span>}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section C */}
          <AccordionItem value="c" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">C - Equipamentos</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {equipment.map((eq, idx) => (
                <Card key={idx} className="bg-secondary/30">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Equipamento {idx + 1}</span>
                      {equipment.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEquipment(prev => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Input placeholder="Nome (ex: Split Hall)" value={eq.name} onChange={e => { const n = [...equipment]; n[idx].name = e.target.value; setEquipment(n); }} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Marca" value={eq.brand} onChange={e => { const n = [...equipment]; n[idx].brand = e.target.value; setEquipment(n); }} />
                      <Input placeholder="Modelo" value={eq.model} onChange={e => { const n = [...equipment]; n[idx].model = e.target.value; setEquipment(n); }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nº Série" value={eq.serial_number} onChange={e => { const n = [...equipment]; n[idx].serial_number = e.target.value; setEquipment(n); }} />
                      <Input placeholder="Info (ex: 22.000 BTUs)" value={eq.info} onChange={e => { const n = [...equipment]; n[idx].info = e.target.value; setEquipment(n); }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEquipment(prev => [...prev, emptyEquipment()])} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Adicionar Equipamento
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Section D */}
          <AccordionItem value="d" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">D - Preventiva (PMOC)</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Mês de referência</Label>
                  <Select value={form.pmoc_month} onValueChange={v => updateField("pmoc_month", v)}>
                    <SelectTrigger><SelectValue placeholder="Mês..." /></SelectTrigger>
                    <SelectContent>{months.map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={form.pmoc_period} onValueChange={v => updateField("pmoc_period", v)}>
                    <SelectTrigger><SelectValue placeholder="Período..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Filtros de Ar</h4>
                <PmocItem label="Limpar os elementos filtrantes e substituir em caso de avarias" value={form.pmoc_filter_clean} onChange={v => updateField("pmoc_filter_clean", v)} threeOptions />
                <PmocItem label="Verificar a fixação, corrigir o ajuste da moldura caso necessário" value={form.pmoc_filter_fix} onChange={v => updateField("pmoc_filter_fix", v)} />

                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mt-4">Gabinetes</h4>
                <PmocItem label="Verificar o mecanismo de renovação de ar" value={form.pmoc_cabinet_air} onChange={v => updateField("pmoc_cabinet_air", v)} />
                <PmocItem label="Verificar botoeiras, knobs, etc. e repor, se necessário" value={form.pmoc_cabinet_buttons} onChange={v => updateField("pmoc_cabinet_buttons", v)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section E */}
          <AccordionItem value="e" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">E - Detalhamento do Serviço</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div><Label>Problema Identificado / Relato do Cliente</Label><Textarea value={form.problem_description} onChange={e => updateField("problem_description", e.target.value)} rows={4} /></div>
              <div><Label>Serviço Realizado</Label><Textarea value={form.service_performed} onChange={e => updateField("service_performed", e.target.value)} rows={4} /></div>
            </AccordionContent>
          </AccordionItem>

          {/* Section F */}
          <AccordionItem value="f" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">F - Fotos do Serviço</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={p.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {photos.length < 4 && (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer text-muted-foreground hover:border-primary transition-colors">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm">Tirar foto ou anexar</span>
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhoto} />
                </label>
              )}
              <p className="text-xs text-muted-foreground">{photos.length}/4 fotos</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section G */}
          <AccordionItem value="g" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="font-semibold text-sm">G - Aprovação (Assinatura)</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p className="text-xs text-muted-foreground">O cliente deve assinar abaixo com o dedo:</p>
              <div className="border rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearSignature}>Limpar assinatura</Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 flex gap-2 max-w-lg mx-auto">
        <Button variant="outline" className="flex-1" onClick={() => saveReport(false)} disabled={saving}>
          Salvar Rascunho
        </Button>
        <Button className="flex-1" onClick={() => saveReport(true)} disabled={saving}>
          Concluir e Gerar PDF
        </Button>
      </div>
    </div>
  );
};

// PMOC checklist item component
function PmocItem({ label, value, onChange, threeOptions = false }: { label: string; value: string; onChange: (v: string) => void; threeOptions?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-sm">{label}</p>
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-3">
        <div className="flex items-center gap-1"><RadioGroupItem value="conforme" id={`${label}-c`} /><Label htmlFor={`${label}-c`} className="text-xs">Conforme</Label></div>
        <div className="flex items-center gap-1"><RadioGroupItem value="nao_conforme" id={`${label}-nc`} /><Label htmlFor={`${label}-nc`} className="text-xs">Não Conforme</Label></div>
        {threeOptions && <div className="flex items-center gap-1"><RadioGroupItem value="nao_aplica" id={`${label}-na`} /><Label htmlFor={`${label}-na`} className="text-xs">N/A</Label></div>}
      </RadioGroup>
    </div>
  );
}

export default ReportForm;
