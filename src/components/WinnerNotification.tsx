import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, X } from "lucide-react";

interface WinnerNotificationProps {
  winningNumber: number;
  prize: string;
  onClose: () => void;
}

const WinnerNotification = ({ winningNumber, prize, onClose }: WinnerNotificationProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-white border-0 shadow-2xl animate-pulse">
        <CardContent className="p-8 text-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="space-y-6">
            {/* Animated icons */}
            <div className="flex justify-center space-x-4">
              <Sparkles className="h-8 w-8 animate-bounce" />
              <Trophy className="h-12 w-12 animate-pulse" />
              <Sparkles className="h-8 w-8 animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">
                ¡FELICIDADES!
              </h2>
              <p className="text-xl font-semibold">
                Has ganado un premio
              </p>
            </div>

            <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-lg font-medium mb-2">
                Número ganador: <span className="text-2xl font-bold">#{winningNumber}</span>
              </p>
              <p className="text-lg">
                Premio: <span className="font-bold">{prize}</span>
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm">
                Nos pondremos en contacto contigo pronto para coordinar la entrega de tu premio.
              </p>
            </div>

            <Button 
              variant="secondary"
              onClick={onClose}
              className="bg-white text-yellow-600 hover:bg-gray-100 font-bold text-lg py-6 w-full"
            >
              ¡Increíble! 🎉
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WinnerNotification;