import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, X, Crown } from "lucide-react";

interface WinnerNotificationProps {
  winningNumber: number;
  prize: string;
  lotteryName: string;
  lotteryNumber?: number;
  onClose: () => void;
}

const WinnerNotification = ({ winningNumber, prize, lotteryName, lotteryNumber, onClose }: WinnerNotificationProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Crystal glass backdrop with blur */}
      <div 
        className="absolute inset-0 backdrop-blur-md bg-black/30"
        onClick={onClose}
      />
      
      {/* Floating particles animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-70 animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main modal with crystal glass effect */}
      <Card className="relative w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-yellow-500/20 rounded-lg" />
        
        <CardContent className="relative p-8 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="space-y-6 text-white">
            {/* Animated crown and sparkles */}
            <div className="flex justify-center space-x-4 mb-4">
              <Sparkles className="h-8 w-8 animate-bounce text-yellow-400" />
              <Crown className="h-16 w-16 text-yellow-400 animate-pulse drop-shadow-lg" />
              <Sparkles className="h-8 w-8 animate-bounce text-yellow-400" style={{ animationDelay: '0.3s' }} />
            </div>

            {/* Winner announcement */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                ¡GANADOR!
              </h1>
              <div className="flex items-center justify-center space-x-2">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <p className="text-lg font-semibold text-gray-100">
                  {lotteryName}
                </p>
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              {lotteryNumber && (
                <p className="text-sm text-gray-300">
                  Sorteo #{lotteryNumber}
                </p>
              )}
            </div>

            {/* Winning number display */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-inner">
              <p className="text-lg font-medium mb-3 text-gray-200">
                Número Ganador
              </p>
              <div className="text-6xl font-bold text-yellow-400 drop-shadow-lg animate-pulse">
                #{winningNumber}
              </div>
            </div>

            {/* Prize amount */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-lg font-medium mb-2 text-gray-200">
                Premio
              </p>
              <p className="text-2xl font-bold text-yellow-400">
                {prize}
              </p>
            </div>

            {/* Contact message */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-gray-300">
                🎉 ¡Felicidades! Nos pondremos en contacto contigo pronto para coordinar la entrega de tu premio.
              </p>
            </div>

            {/* Close button */}
            <Button 
              variant="default"
              onClick={onClose}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold text-lg py-6 w-full shadow-lg border-0 transition-all duration-300 transform hover:scale-105"
            >
              ¡Increíble! 🎊
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WinnerNotification;