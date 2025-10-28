import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, Info } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useArena } from "@/hooks/useArena";
import { supabase } from "@/integrations/supabase/client";

interface Move {
  name: string;
  type: "attack" | "defense" | "heal";
  power: number;
  cost?: number;
}

interface BattlePlant {
  id: string;
  name: string;
  icon: string;
  category?: string;
  health: number;
  maxHealth: number;
  attackStat: number;
  defenseStat: number;
  ageDays?: number;
  robustness?: number;
  image?: string;
  moves: Move[];
  attackEnergy: number;
  defenseBuff?: number;
}

interface ArenaModalProps {
  open: boolean;
  onClose: () => void;
  plants: any[];
  updatePlant: (plantId: string, updates: Partial<any>) => void;
  friendChallenge?: {
    friendUserId: string;
    friendName: string;
    friendPlants: any[];
  };
}

export const ArenaModal = ({ open, onClose, plants, updatePlant, friendChallenge }: ArenaModalProps) => {
  // 🔹 Hook Supabase Arena
  const { startBattle, getUserBattles, getLeaderboard, updatePlantStats } = useArena();

  // 🔹 Stati interni
  const [battleStarted, setBattleStarted] = useState(false);
  const [preparingBattle, setPreparingBattle] = useState<{ player: BattlePlant; enemy: BattlePlant } | null>(null);
  const [playerPlant, setPlayerPlant] = useState<BattlePlant | null>(null);
  const [enemyPlant, setEnemyPlant] = useState<BattlePlant | null>(null);
  const [turnLog, setTurnLog] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"select" | "history" | "leaderboard">("select");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  if (!open) return null;

  const categories = ["herbs", "succulents", "flowers", "vegetables", "indoor", 
    "aquatic", "ornamental", "other"];
  
  const randomNames = ["Cactus Selvatico", "Pianta Oscura", "Muschio Maligno",
    "Fiore Spinoso", "Felce Lunare", "Rovo del Destino", "Fiore Infernale",
    "Orchidea Guerriera", "Erba del Crepuscolo", "Bonsai Mistico",];

  /** 🔹 Mosse base per categoria (valori "di riferimento", poi scalati leggermente) */
  const baseMovesByCategory: Record<string, Move[]> = {
    herbs: [
      { name: "Colpo di Basilico", type: "attack", power: 24, cost: 25 },
      { name: "Raffica Aromatica", type: "attack", power: 28, cost: 35 },
      { name: "Scudo di Timo", type: "defense", power: 0.5 },
      { name: "Respiro Verde", type: "heal", power: 20 },
    ],
    succulents: [
      { name: "Pugno Spinoso", type: "attack", power: 26, cost: 30 },
      { name: "Assalto del Deserto", type: "attack", power: 32, cost: 40 },
      { name: "Pelle Coriacea", type: "defense", power: 0.6 },
      { name: "Rigenerazione Linfatica", type: "heal", power: 18 },
    ],
    flowers: [
      { name: "Tempesta di Petali", type: "attack", power: 25, cost: 30 },
      { name: "Profumo Ipnotico", type: "attack", power: 30, cost: 35 },
      { name: "Petalo Scudo", type: "defense", power: 0.45 },
      { name: "Linfa Curativa", type: "heal", power: 22 },
    ],
    vegetables: [
      { name: "Colpo di Radice", type: "attack", power: 26, cost: 30 },
      { name: "Attacco Fertile", type: "attack", power: 31, cost: 40 },
      { name: "Foglia Protettiva", type: "defense", power: 0.5 },
      { name: "Rigenerazione Vitale", type: "heal", power: 20 },
    ],
    indoor: [
      { name: "Fusione di Linfa", type: "attack", power: 23, cost: 25 },
      { name: "Attacco Ombroso", type: "attack", power: 28, cost: 35 },
      { name: "Scudo Umido", type: "defense", power: 0.45 },
      { name: "Fotosintesi", type: "heal", power: 22 },
    ],
    aquatic: [
      { name: "Getto d’Alghe", type: "attack", power: 25, cost: 30 },
      { name: "Onda Linfatica", type: "attack", power: 33, cost: 40 },
      { name: "Scudo Marino", type: "defense", power: 0.55 },
      { name: "Nebbia Curativa", type: "heal", power: 21 },
    ],
    ornamental: [
      { name: "Eleganza Tagliente", type: "attack", power: 26, cost: 30 },
      { name: "Danza dei Petali", type: "attack", power: 32, cost: 38 },
      { name: "Velo di Grazia", type: "defense", power: 0.48 },
      { name: "Fragranza Rigenerante", type: "heal", power: 23 },
    ],
    other: [
      { name: "Attacco Naturale", type: "attack", power: 24, cost: 28 },
      { name: "Ira del Giardino", type: "attack", power: 31, cost: 37 },
      { name: "Scudo Verde", type: "defense", power: 0.5 },
      { name: "Rinascita Botanica", type: "heal", power: 20 },
    ],
  };

  /**
   * 🔹 Bilancia le mosse in modo moderato in base a età / robustness / salute
   *
   * Nota: i moltiplicatori sono volutamente moderati per non generare valori di danno esagerati.
   */
  const generateMoves = (plant: any): Move[] => {
    const baseMoves = baseMovesByCategory[plant.category || "herbs"] || baseMovesByCategory.herbs;
    const age = plant.ageDays || 0;
    const robustness = plant.robustness || 1.0;
    const healthFactor = (plant.health || 100) / 100;
    const winBonus = getWinRateBonus(plant); // bonus/malus

    const ageBonus = Math.min(age / 600, 0.2);
    const robustnessBonus = (robustness - 1) * 0.15;
    const healthBonus = (healthFactor - 1) * 0.05;

    const moveScale = 1 + ageBonus + robustnessBonus + healthBonus;

    return baseMoves.map((m) => ({
      ...m,
      power: Math.max(1, Math.round(m.power * moveScale + winBonus)),
    }));
  };

  const getWinRateBonus = (plant: any): number => {
    const victories = plant.victories || 0;
    const defeats = plant.defeats || 0;
    const total = victories + defeats;

    if (total < 10) return 0; // minimo di partite giocate

    const winRate = victories / total;

    if (winRate >= 1) return 10;       // 100% vittorie
    if (winRate >= 0.75) return 5;     // 75%+
    if (winRate <= 0.25) return -5;    // 25%-0%
    return 0;                           // resto neutro
  };

  const getPlantRank = (plant) => {
    const victories = plant.victories || 0;
    const defeats = plant.defeats || 0;
    const total = victories + defeats;

    if (total === 0) return { emoji: "🌱", label: "Seme" };

    const winRate = (victories / total) * 100;

    if (winRate >= 75) return { emoji: "🥇", label: "Oro" };
    if (winRate >= 60) return { emoji: "🥈", label: "Argento" };
    if (winRate >= 40) return { emoji: "🥉", label: "Bronzo" };
    if (winRate >= 20) return { emoji: "🪵", label: "Legno" };
    return { emoji: "🌱", label: "Seme" };
  };

  /**
   * 🔹 Statistiche base dinamiche (attack / defense)
   * restituite come numeri "grezzi" che poi useremo nella formula del danno
   */
  const calculateStats = (plant: any) => {
    const baseAttack = 15 + Math.floor(Math.random() * 10); // 15-24
    const baseDefense = 8 + Math.floor(Math.random() * 6);  // 8-13
    const robustness = plant.robustness || 1.0;
    const age = plant.ageDays || 0;

    const ageBonus = 1 + Math.min(age / 300, 0.3); 
    const healthBonus = (plant.health || 100) / 100;
    const winBonus = getWinRateBonus(plant); // 🟢 applica bonus/malus

    return {
      attack: Math.round(baseAttack * ageBonus * robustness * healthBonus) + winBonus,
      defense: Math.round(baseDefense * robustness + age / 50) + winBonus,
    };
  };

  /**
   * 🔹 Formula danno (ridimensionata per HP = 100)
   *
   * - move.power è un valore "di riferimento" (es. 15..25)
   * - attackStat viene normalizzato dividendo per 40 (così la moltiplicazione non esplode)
   * - la difesa dell'avversario riduce il danno con una formula non lineare
   * - aggiungo una piccola variabilità (0.9 - 1.1)
   */
  const applyMove = (
    attacker: BattlePlant,
    defender: BattlePlant,
    move: Move
  ): { newAttacker: BattlePlant; newDefender: BattlePlant; log: string } => {
    let log = "";
    let newAttacker = { ...attacker };
    let newDefender = { ...defender };

    if (move.type === "attack") {
      if (attacker.attackEnergy < (move.cost || 0)) {
        log = `${attacker.name} non ha abbastanza energia per ${move.name}!`;
      } else {
        // Base damage = potenza della mossa
        let damage = move.power;

        // Piccolo bonus dall'attacco e salute dell'attaccante (max +20%)
        const attackBonus = Math.min(0.2, newAttacker.attackStat / 100 + newAttacker.health / newAttacker.maxHealth * 0.1);
        damage = Math.round(damage * (1 + attackBonus));

        // Riduzione difesa dell'avversario (max 20%)
        const defenseReduction = Math.min(0.2, newDefender.defenseStat / 100 + (newDefender.defenseBuff || 0));
        damage = Math.max(1, Math.round(damage * (1 - defenseReduction)));

        newDefender.health = Math.max(0, newDefender.health - damage);
        newAttacker.attackEnergy = Math.max(0, newAttacker.attackEnergy - (move.cost || 0));
        log = `${attacker.name} usa ${move.name}! -${damage} HP`;
      }
    } else if (move.type === "defense") {
      newAttacker.defenseBuff = Math.min(0.75, move.power);
      newAttacker.attackEnergy = Math.min(100, newAttacker.attackEnergy + 15);
      log = `${attacker.name} si protegge con ${move.name}! Energia +15%`;
    } else if (move.type === "heal") {
      const restore = Math.min(newAttacker.maxHealth - newAttacker.health, move.power);
      newAttacker.health += restore;
      newAttacker.attackEnergy = Math.min(100, newAttacker.attackEnergy + Math.min(20, Math.round(restore / 2)));
      log = `${attacker.name} usa ${move.name} e recupera ${restore} HP! (+${Math.min(20, Math.round(restore / 2))}% energia)`;
    }

    return { newAttacker, newDefender, log };
  };

  /**
   * 🔹 Prepara battaglia:
   * - il giocatore: HP iniziali = plant.health (min 10)
   * - l'avversario: generato con la stessa logica (categoria casuale, età/robustezza random)
   * - entrambi usano `calculateStats` e `generateMoves`
   */
  const prepareBattle = (plant: any) => {
    // Statistiche del giocatore
    const statsPlayer = calculateStats(plant);
    const currentHealthPlayer = Math.max(10, Math.round(plant.health || 100));

    const playerStats: BattlePlant = {
      id: plant.id,
      name: plant.name,
      icon: plant.icon,
      category: plant.category,
      maxHealth: currentHealthPlayer,
      health: currentHealthPlayer,
      attackStat: statsPlayer.attack,
      defenseStat: statsPlayer.defense,
      ageDays: plant.ageDays || 0,
      robustness: plant.robustness || 1.0,
      image: plant.imageUrl || "/placeholder-plant.png",
      moves: generateMoves(plant),
      attackEnergy: 100,
    };

    let enemyStats: BattlePlant;

    if (friendChallenge && friendChallenge.friendPlants.length > 0) {
      // 🔹 Sfida tra amici: scegli una pianta casuale dell'amico
      const friendPlant = friendChallenge.friendPlants[Math.floor(Math.random() * friendChallenge.friendPlants.length)];
      const statsFriend = calculateStats(friendPlant);
      const currentHealthFriend = Math.max(10, Math.round(friendPlant.health || 100));

      enemyStats = {
        id: friendPlant.id,
        name: friendPlant.name,
        icon: friendPlant.icon,
        category: friendPlant.category,
        maxHealth: currentHealthFriend,
        health: currentHealthFriend,
        attackStat: statsFriend.attack,
        defenseStat: statsFriend.defense,
        ageDays: friendPlant.ageDays || 0,
        robustness: friendPlant.robustness || 1.0,
        image: friendPlant.imageUrl || "/placeholder-plant.png",
        moves: generateMoves(friendPlant),
        attackEnergy: 100,
      };
    } else {
      // 🔹 Battaglia vs computer: genera un avversario casuale
      const enemyCategory = categories[Math.floor(Math.random() * categories.length)];
      const enemySeed = {
        category: enemyCategory,
        ageDays: Math.floor(Math.random() * 200),
        robustness: +(0.9 + Math.random() * 0.5).toFixed(2),
        health: 100,
      };

      const statsEnemy = calculateStats(enemySeed);
      const currentHealthEnemy = Math.max(10, Math.round(enemySeed.health));

      enemyStats = {
        id: "enemy",
        name: randomNames[Math.floor(Math.random() * randomNames.length)],
        icon: "🌵",
        category: enemyCategory,
        maxHealth: currentHealthEnemy,
        health: currentHealthEnemy,
        attackStat: statsEnemy.attack,
        defenseStat: statsEnemy.defense,
        ageDays: enemySeed.ageDays,
        robustness: enemySeed.robustness,
        image: "/icon/placeholder-plant.png",
        moves: generateMoves({ ...enemySeed, category: enemyCategory, health: enemySeed.health }),
        attackEnergy: 100,
      };
    }

    setPreparingBattle({ player: playerStats, enemy: enemyStats });
  };

  const beginBattle = () => {
    if (!preparingBattle) return;
    setPlayerPlant(preparingBattle.player);
    setEnemyPlant(preparingBattle.enemy);
    setTurnLog(
      `${preparingBattle.player.icon} ${preparingBattle.player.name} entra in battaglia contro: ${preparingBattle.enemy.icon} ${preparingBattle.enemy.name}!`
    );
    setBattleStarted(true);
    setWinner(null);
    setPreparingBattle(null);
  };

  const endBattle = async (victor: string) => {
    setWinner(victor);
    toast.success(`${victor} ha vinto la battaglia!`);

    if (!playerPlant || !enemyPlant) return;
    const isPlayerWinner = victor === playerPlant.name;
    const player = plants.find((p) => p.id === playerPlant.id);
    if (!player) return;

    // aggiorna statistiche locali del giocatore
    if (isPlayerWinner) {
      updatePlant(player.id, { victories: (player.victories || 0) + 1 });
    } else {
      updatePlant(player.id, { defeats: (player.defeats || 0) + 1 });
    }

    // 🔹 Salva su Supabase SOLO se è una sfida tra amici
    if (friendChallenge) {
      try {
        // Determina il winnerId corretto
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;
        
        const winnerId = isPlayerWinner ? user.id : friendChallenge.friendUserId;
        
        // Salva la battaglia
        await startBattle(
          playerPlant.id,
          enemyPlant.id,
          friendChallenge.friendUserId,
          winnerId
        );
        
        // Aggiorna statistiche di entrambe le piante nel database
        await updatePlantStats(playerPlant.id, isPlayerWinner);
        await updatePlantStats(enemyPlant.id, !isPlayerWinner);
      } catch (err: any) {
        console.error("Errore nel salvataggio battaglia:", err);
      }
    }
  };

  const nextTurn = (playerMove: Move) => {
    if (!playerPlant || !enemyPlant) return;
    setIsProcessing(true);

    const { newAttacker: newPlayer, newDefender: newEnemy, log: playerLog } = applyMove(playerPlant, enemyPlant, playerMove);
    setPlayerPlant(newPlayer);
    setEnemyPlant(newEnemy);
    setTurnLog(playerLog);

    if (newEnemy.health <= 0) {
      endBattle(newPlayer.name);
      setIsProcessing(false);
      return;
    }

    setTimeout(() => {
      const enemyMove = enemyPlant.moves[Math.floor(Math.random() * enemyPlant.moves.length)];
      const { newAttacker: newEnemy2, newDefender: newPlayer2, log: enemyLog } = applyMove(newEnemy, newPlayer, enemyMove);

      // reset temporaneo dei buff difensivi dopo il turno difensivo avversario
      newPlayer2.defenseBuff = 0;
      newEnemy2.defenseBuff = 0;
      setPlayerPlant(newPlayer2);
      setEnemyPlant(newEnemy2);
      setTurnLog(enemyLog);

      if (newPlayer2.health <= 0) {
        endBattle(newEnemy2.name);
      }

      setIsProcessing(false);
    }, 1200);
  };

  const resetBattle = () => {
    setBattleStarted(false);
    setPlayerPlant(null);
    setEnemyPlant(null);
    setTurnLog("");
    setWinner(null);
    setPreparingBattle(null);
    setViewMode("select");
  };

  const loadHistory = async () => {
    try {
      // Ottieni l'user_id corrente
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        setCurrentUserId(user.id);
      }
      
      const battles = await getUserBattles();
      setHistoryData(battles);
      setViewMode("history");
    } catch (err) {
      toast.error("Errore nel caricamento dello storico");
      console.error(err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboardData(data);
      setViewMode("leaderboard");
    } catch (err) {
      toast.error("Errore nel caricamento della classifica");
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full bg-card shadow-2xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">

          {/* 🔹 Pulsanti Supabase: Storico / Classifica */}
          {!battleStarted && !preparingBattle && viewMode === "select" && (
            <div className="flex justify-end gap-2 mb-3">
              <Button variant="outline" onClick={loadHistory}>
                📜 Storico
              </Button>
              <Button variant="secondary" onClick={loadLeaderboard}>
                🏆 Classifica
              </Button>
            </div>
          )}

          {/* 🔹 Visualizzazione Storico */}
          {viewMode === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">📜 Storico Battaglie</h2>
                <Button variant="ghost" size="sm" onClick={() => setViewMode("select")}>
                  ← Indietro
                </Button>
              </div>
              
              {historyData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nessuna battaglia registrata</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {historyData.map((battle: any) => {
                    // Determina se l'utente corrente è il vincitore
                    const isWinner = battle.winner_id === currentUserId;
                    
                    return (
                      <Card key={battle.id} className={`p-4 ${isWinner ? 'border-green-500/50' : 'border-red-500/50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{battle.challenger_plant?.icon || '🪴'}</span>
                              <span className="font-medium">{battle.challenger_plant?.name || 'Pianta'}</span>
                              <span className="text-muted-foreground text-sm">
                                ({battle.challenger?.full_name || 'Tu'})
                              </span>
                            </div>
                            <div className="text-center text-xs text-muted-foreground my-1">VS</div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{battle.defender_plant?.icon || '🪴'}</span>
                              <span className="font-medium">{battle.defender_plant?.name || 'Pianta'}</span>
                              <span className="text-muted-foreground text-sm">
                                ({battle.defender?.full_name || 'Avversario'})
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${isWinner ? 'text-green-500' : 'text-red-500'}`}>
                              {isWinner ? '🏆 Vittoria' : '💀 Sconfitta'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(battle.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              <Button variant="outline" className="w-full mt-4" onClick={onClose}>
                Chiudi
              </Button>
            </div>
          )}

          {/* 🔹 Visualizzazione Classifica */}
          {viewMode === "leaderboard" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">🏆 Classifica Globale</h2>
                <Button variant="ghost" size="sm" onClick={() => setViewMode("select")}>
                  ← Indietro
                </Button>
              </div>
              
              {leaderboardData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nessun dato disponibile</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {leaderboardData.map((entry: any, index: number) => {
                    const winRate = Number(entry.win_rate) || 0;
                    let medalEmoji = '';
                    if (index === 0) medalEmoji = '🥇';
                    else if (index === 1) medalEmoji = '🥈';
                    else if (index === 2) medalEmoji = '🥉';
                    
                    return (
                      <Card key={entry.user_id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-muted-foreground w-8">
                              {medalEmoji || `#${index + 1}`}
                            </div>
                            <div>
                              <div className="font-semibold">{entry.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.total_battles} battaglie
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-500">
                              {entry.wins} V
                            </div>
                            <div className="text-sm text-red-500">
                              {entry.losses} S
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {winRate.toFixed(1)}% vittorie
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              <Button variant="outline" className="w-full mt-4" onClick={onClose}>
                Chiudi
              </Button>
            </div>
          )}

          {/* Selezione pianta */}
          {!battleStarted && !preparingBattle && viewMode === "select" && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Scegli una delle tue piante per combattere:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...plants]
                  .sort((a, b) => {
                    const aVictories = a.victories || 0;
                    const bVictories = b.victories || 0;
                    const aDefeats = a.defeats || 0;
                    const bDefeats = b.defeats || 0;

                    if (bVictories !== aVictories) return bVictories - aVictories;
                    if (aDefeats !== bDefeats) return aDefeats - bDefeats;
                    return a.name.localeCompare(b.name);
                  })
                  .map((p) => {
                    // 🔹 Calcolo rank e emoji
                    const totalBattles = (p.victories || 0) + (p.defeats || 0);
                    const winRate =
                      totalBattles > 0
                        ? Math.round((p.victories / totalBattles) * 100)
                        : 0;

                    let color = "text-muted-foreground";

                    if (winRate >= 75) {
                      color = "text-yellow-400";
                    } else if (winRate >= 60) {
                      color = "text-gray-300";
                    } else if (winRate >= 40) {
                      color = "text-amber-700";
                    } else if (winRate >= 20) {
                      color = "text-orange-600";
                    }

                    return (
                      <Card
                        key={p.id}
                        className="p-3 cursor-pointer hover:border-primary transition"
                        onClick={() => prepareBattle(p)}
                      >
                        <div className="flex flex-col items-center text-center">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-20 h-20 object-cover rounded-full mb-2"
                            />
                          ) : (
                            <Leaf className="h-10 w-10 text-muted-foreground mb-2" />
                          )}
                          <p className="font-medium">{p.name}</p>
                          <p className={`text-xs mt-1 ${color}`}>
                            🏆 {p.victories || 0} | 💀 {p.defeats || 0}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
              </div>
              <Button variant="outline" className="mt-4" onClick={onClose}>
                Chiudi
              </Button>
            </div>
          )}

          {/* Preparazione */}
          {preparingBattle && (
            <div className="text-center space-y-6">
              {/* 🔹 Titolo + Info */}
              <div className="flex items-center justify-center gap-2 relative">
                <h2 className="text-lg font-semibold">Preparati alla battaglia!</h2>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      title="Come funziona il combattimento?"
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="text-sm w-80 space-y-2">
                    <p className="font-semibold text-base">⚔️ Guida al Combattimento</p>
                    <div className="border-t border-border my-2" />
                    <p>
                      Ogni pianta ha <b>HP</b> (salute) e <b>Energia</b>:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-left">
                      <li>🩸 <b>HP</b> diminuisce quando subisci danni. Se arriva a 0, perdi la battaglia.</li>
                      <li>⚡ <b>Energia</b> serve per usare le mosse d’attacco (ogni mossa consuma energia).</li>
                      <li>🛡️ Mosse di <b>Difesa</b> riducono i danni e ricaricano energia.</li>
                      <li>🌿 Mosse di <b>Cura</b> rigenerano HP e un po’ di energia.</li>
                    </ul>

                    <div className="border-t border-border my-2" />

                    <p className="font-semibold">🎨 Colori delle mosse</p>
                    <ul className="list-disc list-inside space-y-1 text-left">
                      <li>🔴 <b>Rosso</b> → Mossa d’attacco: infligge danni, ma consuma energia.</li>
                      <li>🟡 <b>Giallo</b> → Mossa difensiva: riduce i danni e ricarica un po’ di energia.</li>
                      <li>🟢 <b>Verde</b> → Mossa curativa: recupera HP e leggermente energia.</li>
                    </ul>

                    <div className="border-t border-border my-2" />

                    <p className="text-muted-foreground">
                      💡 L’efficacia delle mosse dipende da salute, età e robustezza della pianta.
                    </p>
                    <p className="text-muted-foreground">
                      Vince la pianta che porta l’avversario a <b>0 HP</b>!
                    </p>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 🔹 Indicatore tipo battaglia */}
              {friendChallenge ? (
                <p className="text-sm text-primary font-medium">
                  👥 Sfida contro {friendChallenge.friendName}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  🤖 Allenamento vs Computer
                </p>
              )}

              {/* 🔹 Immagini giocatore e nemico */}
              <div className="flex justify-around items-center">
                <div>
                  <img src={preparingBattle.player.image} alt={preparingBattle.player.name} className="w-28 h-28 rounded-xl mx-auto" />
                  <p className="mt-2 font-medium">{preparingBattle.player.name}</p>
                </div>
                <span className="text-2xl font-bold">VS</span>
                <div>
                  <img src={preparingBattle.enemy.image} alt={preparingBattle.enemy.name} className="w-28 h-28 rounded-xl mx-auto" />
                  <p className="mt-2 font-medium">{preparingBattle.enemy.name}</p>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <Button onClick={beginBattle}>Inizia Battaglia</Button>
                <Button variant="outline" onClick={onClose}>Chiudi</Button>
              </div>
            </div>
          )}

          {/* Battaglia */}
          {battleStarted && (
            <div>
              <div className="relative h-72 flex justify-between items-end mb-4">
                {/* Enemy */}
                {enemyPlant && (
                  <motion.div key={enemyPlant.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-center">
                    <img src={enemyPlant.image} alt={enemyPlant.name} className="w-32 h-32 object-cover rounded-xl mx-auto" />
                    <div className="mt-2 font-semibold">{enemyPlant.name}</div>
                    <div className="relative w-32 h-6 bg-gray-300 rounded-full mx-auto mt-1">
                      <div className="absolute top-0 left-0 h-full bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ width: `${(enemyPlant.health / enemyPlant.maxHealth) * 100}%` }}>
                        {enemyPlant.health}/{enemyPlant.maxHealth}
                      </div>
                    </div>
                    <div className="relative w-32 h-4 bg-gray-300 rounded-full mx-auto mt-1">
                      <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ width: `${enemyPlant.attackEnergy}%` }}>
                        {enemyPlant.attackEnergy}%
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Player */}
                {playerPlant && (
                  <motion.div key={playerPlant.id} initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-center">
                    <img src={playerPlant.image} alt={playerPlant.name} className="w-32 h-32 object-cover rounded-xl mx-auto" />
                    <div className="mt-2 font-semibold">{playerPlant.name}</div>
                    <div className="relative w-32 h-6 bg-gray-300 rounded-full mx-auto mt-1 overflow-hidden">
                      <div
                        className="h-full bg-green-500 flex items-center justify-center text-white font-bold text-xs"
                        style={{ width: `${(playerPlant.health / playerPlant.maxHealth) * 100}%` }}
                      >
                        {playerPlant.health}/{playerPlant.maxHealth}
                      </div>
                    </div>
                    <div className="relative w-32 h-4 bg-gray-300 rounded-full mx-auto mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 flex items-center justify-center text-white text-xs"
                        style={{ width: `${playerPlant.attackEnergy}%` }}
                      >
                        {playerPlant.attackEnergy}%
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Log turno */}
              {!winner && (
                <div className="bg-muted rounded-lg p-3 h-16 flex items-center justify-center text-sm mb-4">
                  {turnLog}
                </div>
              )}

              {/* Bottoni mosse */}
              {!winner && (
                <div className="grid grid-cols-2 gap-2">
                  {playerPlant?.moves.map((move, i) => (
                    <Button
                      key={i}
                      onClick={() => nextTurn(move)}
                      disabled={isProcessing || (move.type === "attack" && playerPlant.attackEnergy < (move.cost || 0))}
                      className={`
                        bg-white text-black border-2 font-medium break-words whitespace-normal py-2 px-2 text-sm
                        ${move.type === "attack" ? "border-red-500 hover:bg-red-500 hover:text-white" : ""}
                        ${move.type === "defense" ? "border-yellow-500 hover:bg-yellow-500 hover:text-white" : ""}
                        ${move.type === "heal" ? "border-green-500 hover:bg-green-500 hover:text-white" : ""}
                      `}
                    >
                      {move.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Fine battaglia */}
              {winner && (
                <div className="flex gap-2 mt-4">
                  <Button onClick={resetBattle} className="flex-1">🔁 Nuova Battaglia</Button>
                  <Button variant="outline" onClick={onClose}>Chiudi</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
