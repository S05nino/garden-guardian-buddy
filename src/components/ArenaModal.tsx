import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

interface Move {
  name: string;
  type: "attack" | "defense" | "heal";
  power: number;
  cost?: number;
}

interface BattlePlant {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  attackStat: number;
  defenseStat: number;
  ageDays?: number;
  image?: string;
  moves: Move[];
  attackEnergy: number;
  defenseBuff?: number;
}

interface ArenaModalProps {
  open: boolean;
  onClose: () => void;
  plants: any[];
}

export const ArenaModal = ({ open, onClose, plants }: ArenaModalProps) => {
  const [battleStarted, setBattleStarted] = useState(false);
  const [preparingBattle, setPreparingBattle] = useState<{
    player: BattlePlant;
    enemy: BattlePlant;
  } | null>(null);
  const [playerPlant, setPlayerPlant] = useState<BattlePlant | null>(null);
  const [enemyPlant, setEnemyPlant] = useState<BattlePlant | null>(null);
  const [turnLog, setTurnLog] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  if (!open) return null;

  const randomNames = ["Cactus Selvatico", "Pianta Oscura", "Muschio Maligno", "Fiore Spinoso"];

  const generateMoves = (plantName: string): Move[] => [
    { name: `${plantName} Frustata Solare`, type: "attack", power: 15, cost: 25 },
    { name: `${plantName} Tempesta di Petali`, type: "attack", power: 20, cost: 35 },
    { name: "Foglia Scudo", type: "defense", power: 0.5 },
    { name: "Rigenerazione Linfatica", type: "heal", power: 20 },
  ];

  const calculateInitialHP = (plant: any) => {
    const baseHP = plant.health || 100;
    const ageFactor = plant.ageDays ? 1 + plant.ageDays / 100 : 1;
    return Math.round(baseHP * ageFactor);
  };

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
        log = `${attacker.name} non ha abbastanza energia per ${move.name}! Deve difendersi o curarsi.`;
      } else {
        const baseDamage = Math.round(
          move.power * (attacker.attackStat / 10) * (attacker.health / attacker.maxHealth)
        );
        const actualDamage = defender.defenseBuff ? Math.round(baseDamage * (1 - defender.defenseBuff)) : baseDamage;
        newDefender.health = Math.max(0, defender.health - actualDamage);
        newAttacker.attackEnergy = Math.max(0, newAttacker.attackEnergy - (move.cost || 0));
        log = `${attacker.name} usa ${move.name}! -${actualDamage} HP`;
      }
    } else if (move.type === "defense") {
      newAttacker.defenseBuff = move.power;
      newAttacker.attackEnergy = Math.min(100, newAttacker.attackEnergy + 15);
      log = `${attacker.name} si protegge con ${move.name}! Energia +15%`;
    } else if (move.type === "heal") {
      const restore = Math.min(newAttacker.maxHealth - newAttacker.health, move.power);
      newAttacker.health += restore;
      newAttacker.attackEnergy = Math.min(100, newAttacker.attackEnergy + 20);
      log = `${attacker.name} usa ${move.name} e recupera ${restore} HP!`;
    }

    return { newAttacker, newDefender, log };
  };

  const prepareBattle = (plant: any) => {
    const playerStats: BattlePlant = {
      id: plant.id,
      name: plant.name,
      maxHealth: calculateInitialHP(plant),
      health: calculateInitialHP(plant),
      attackStat: 15 + Math.floor(Math.random() * 10),
      defenseStat: 8 + Math.floor(Math.random() * 6),
      ageDays: plant.ageDays || 0,
      image: plant.imageUrl || "/placeholder-plant.png",
      moves: generateMoves(plant.name),
      attackEnergy: 100,
    };

    const enemyStats: BattlePlant = {
      id: "enemy",
      name: randomNames[Math.floor(Math.random() * randomNames.length)],
      maxHealth: 100,
      health: 100,
      attackStat: 14 + Math.floor(Math.random() * 10),
      defenseStat: 10 + Math.floor(Math.random() * 5),
      image: "/icon/placeholder-plant.png",
      moves: generateMoves("Nemico"),
      attackEnergy: 100,
    };

    setPreparingBattle({ player: playerStats, enemy: enemyStats });
  };

  const beginBattle = () => {
    if (!preparingBattle) return;
    setPlayerPlant(preparingBattle.player);
    setEnemyPlant(preparingBattle.enemy);
    setTurnLog(`🌱 ${preparingBattle.player.name} entra in battaglia! 🌿 È apparso ${preparingBattle.enemy.name}!`);
    setBattleStarted(true);
    setWinner(null);
    setPreparingBattle(null);
  };

  const endBattle = (victor: string) => {
    setWinner(victor);
    toast.success(`${victor} ha vinto la battaglia!`);
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
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full bg-card shadow-2xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          {/* Selezione pianta */}
          {!battleStarted && !preparingBattle && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">Scegli una delle tue piante per combattere:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {plants.map((p) => (
                  <Card
                    key={p.id}
                    className="p-3 cursor-pointer hover:border-primary transition"
                    onClick={() => prepareBattle(p)}
                  >
                    <div className="flex flex-col items-center text-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-20 h-20 object-cover rounded-full mb-2" />
                      ) : (
                        <Leaf className="h-10 w-10 text-muted-foreground mb-2" />
                      )}
                      <p className="font-medium">{p.name}</p>
                    </div>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="mt-4" onClick={onClose}>Chiudi</Button>
            </div>
          )}

          {/* Fase preparatoria */}
          {preparingBattle && (
            <div className="text-center space-y-6">
              <h2 className="text-lg font-semibold">Preparati alla battaglia!</h2>
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

              {/* Bottoni fine battaglia */}
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
