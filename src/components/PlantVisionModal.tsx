import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Loader2, Sparkles, AlertTriangle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PlantVisionModalProps {
  open: boolean;
  onClose: () => void;
  onAddPlant?: (plantData: any) => void;
}

export function PlantVisionModal({ open, onClose, onAddPlant }: PlantVisionModalProps) {
  const [mode, setMode] = useState<"identify" | "diagnose">("identify");
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      // Controlla se il browser supporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Il tuo browser non supporta l'accesso alla fotocamera");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        toast.success("Fotocamera attivata! 📸");
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Permesso fotocamera negato", {
          description: "Abilita l'accesso alla fotocamera nelle impostazioni del browser"
        });
      } else if (error.name === 'NotFoundError') {
        toast.error("Nessuna fotocamera trovata");
      } else {
        toast.error("Errore nell'accesso alla fotocamera", {
          description: "Prova a ricaricare la pagina o usa il caricamento file"
        });
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setAnalyzing(true);
    setResult(null);

    try {
      console.log('Analyzing image with mode:', mode);
      
      const { data, error } = await supabase.functions.invoke('plant-vision', {
        body: { image, mode }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      console.log('Analysis result:', data);
      setResult(data);

      if (mode === 'identify') {
        toast.success("Pianta identificata! 🌱", {
          description: data.name
        });
      } else {
        toast.success("Analisi completata! 🔍");
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error("Errore durante l'analisi", {
        description: error instanceof Error ? error.message : "Riprova"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToGarden = () => {
    if (result && onAddPlant) {
      const plantData = {
        name: result.name,
        description: result.description,
        category: result.category,
        position: result.position,
        wateringDays: result.wateringDays,
        preferences: result.preferences,
        icon: "🌿",
        imageUrl: image || undefined,
      };
      onAddPlant(plantData);
      toast.success(`${result.name} aggiunta al giardino! 🌱`);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setImage(null);
    setResult(null);
    setMode("identify");
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Plant Doctor
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identify">
              <Sparkles className="mr-2 h-4 w-4" />
              Identifica Pianta
            </TabsTrigger>
            <TabsTrigger value="diagnose">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Diagnostica Problemi
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            {!image ? (
              <>
                {/* Camera Preview */}
                {cameraActive ? (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg"
                    />
                    <div className="flex gap-3">
                      <Button onClick={capturePhoto} className="flex-1">
                        <Camera className="mr-2 h-4 w-4" />
                        Scatta Foto
                      </Button>
                      <Button variant="outline" onClick={stopCamera}>
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <Button
                      onClick={startCamera}
                      size="lg"
                      className="w-full h-24"
                      variant="outline"
                    >
                      <Camera className="mr-2 h-6 w-6" />
                      Usa Fotocamera
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="lg"
                      className="w-full h-24"
                      variant="outline"
                    >
                      <Upload className="mr-2 h-6 w-6" />
                      Carica Foto
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Image Preview */}
                <div className="relative">
                  <img 
                    src={image} 
                    alt="Plant" 
                    className="w-full rounded-lg max-h-64 object-cover"
                  />
                  {!result && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80"
                      onClick={() => setImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Analysis Button */}
                {!result && (
                  <Button
                    onClick={analyzeImage}
                    disabled={analyzing}
                    className="w-full"
                    size="lg"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analisi in corso...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {mode === 'identify' ? 'Identifica Pianta' : 'Diagnostica Problemi'}
                      </>
                    )}
                  </Button>
                )}

                {/* Results */}
                {result && (
                  <TabsContent value="identify" className="mt-0">
                    <Card className="p-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold">{result.name}</h3>
                          <Badge variant="secondary">{result.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground italic mb-4">
                          {result.scientificName}
                        </p>
                        <p className="text-sm">{result.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Posizione</p>
                          <p className="font-medium">{result.position}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Annaffiatura</p>
                          <p className="font-medium">Ogni {result.wateringDays} giorni</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Temperatura</p>
                          <p className="font-medium">
                            {result.preferences?.minTemp}°C - {result.preferences?.maxTemp}°C
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Umidità</p>
                          <p className="font-medium">
                            {result.preferences?.minHumidity}% - {result.preferences?.maxHumidity}%
                          </p>
                        </div>
                      </div>

                      {result.confidence && (
                        <div className="text-sm text-muted-foreground">
                          Affidabilità: {Math.round(result.confidence * 100)}%
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button onClick={handleAddToGarden} className="flex-1">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Aggiungi al Giardino
                        </Button>
                        <Button variant="outline" onClick={() => { setImage(null); setResult(null); }}>
                          Nuova Analisi
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>
                )}

                {result && mode === 'diagnose' && (
                  <TabsContent value="diagnose" className="mt-0">
                    <Card className="p-4 space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`text-lg font-semibold ${
                          result.overallHealth === 'healthy' ? 'text-primary' :
                          result.overallHealth === 'fair' ? 'text-warning' :
                          'text-destructive'
                        }`}>
                          Salute generale: {
                            result.overallHealth === 'healthy' ? 'Buona 💚' :
                            result.overallHealth === 'fair' ? 'Discreta ⚠️' :
                            'Problematica ⚠️'
                          }
                        </div>
                      </div>

                      {result.problems && result.problems.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold">Problemi Rilevati:</h4>
                          {result.problems.map((problem: any, index: number) => (
                            <Card key={index} className="p-3 bg-muted/50">
                              <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(problem.severity)}`} />
                                <div className="flex-1">
                                  <p className="font-medium">{problem.issue}</p>
                                  <Badge variant="outline" className="mt-1">
                                    Gravità: {problem.severity}
                                  </Badge>
                                </div>
                              </div>
                              <div className="ml-6 space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Causa:</span> {problem.cause}
                                </div>
                                <div>
                                  <span className="font-medium">Soluzione:</span> {problem.solution}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      {result.recommendations && result.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">Raccomandazioni:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {result.recommendations.map((rec: string, index: number) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button 
                        variant="outline" 
                        onClick={() => { setImage(null); setResult(null); }}
                        className="w-full"
                      >
                        Nuova Analisi
                      </Button>
                    </Card>
                  </TabsContent>
                )}
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
