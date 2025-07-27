import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gift, Star, Sparkles, Crown } from "lucide-react";
import ConfettiEffect from './ConfettiEffect';

interface DrawFinishedModalProps {
  isVisible: boolean;
  hasWinner: boolean;
  winnerNumber?: number;
  drawName?: string;
}

const DrawFinishedModal: React.FC<DrawFinishedModalProps> = ({
  isVisible,
  hasWinner,
  winnerNumber,
  drawName = "Sorteo de Suerte"
}) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <ConfettiEffect 
            trigger={isVisible} 
            colors={hasWinner ? ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#FF69B4'] : ['#10b981', '#34d399', '#6ee7b7']}
            duration={hasWinner ? 8000 : 3000}
          />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(15px)' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="relative"
            >
              <Card className={`shadow-2xl backdrop-blur-sm max-w-md mx-auto ${
                hasWinner 
                  ? 'bg-gradient-to-br from-yellow-50/95 via-orange-50/95 to-yellow-100/95 border-yellow-400' 
                  : 'bg-green-50/95 border-green-300'
              }`}>
                <CardContent className="p-8 text-center space-y-6">
                  {/* Animated Icons */}
                  <motion.div
                    animate={{ 
                      rotate: hasWinner ? [0, 10, -10, 0] : [0, 10, -10, 0],
                      scale: hasWinner ? [1, 1.2, 1] : [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: hasWinner ? 3 : 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="flex justify-center"
                  >
                    {hasWinner ? (
                      <div className="relative">
                        <Trophy className="h-20 w-20 text-yellow-500" />
                        <motion.div
                          animate={{ 
                            rotate: [0, 360],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="absolute -top-2 -right-2"
                        >
                          <Crown className="h-8 w-8 text-yellow-600" />
                        </motion.div>
                      </div>
                    ) : (
                      <Gift className="h-16 w-16 text-green-600" />
                    )}
                  </motion.div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-sm px-3 py-1 ${
                        hasWinner 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {hasWinner ? "¡🎉 GANADOR ANUNCIADO! 🎉" : "¡Sorteo Finalizado!"}
                    </Badge>
                    
                    <h2 className={`text-2xl font-bold ${
                      hasWinner ? 'text-yellow-800' : 'text-green-800'
                    }`}>
                      {drawName}
                    </h2>
                  </div>

                  {/* Content based on state */}
                  {hasWinner ? (
                    <div className="space-y-6">
                      {/* Winner Announcement */}
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-yellow-700">
                          ¡FELICITACIONES!
                        </h3>
                        
                        <div className="relative">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.05, 1],
                              boxShadow: [
                                "0 0 0 0 rgb(251, 191, 36)",
                                "0 0 0 15px rgba(251, 191, 36, 0)",
                                "0 0 0 0 rgba(251, 191, 36, 0)"
                              ]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity
                            }}
                            className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white text-7xl font-black rounded-2xl w-32 h-32 flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden"
                          >
                            <span className="relative z-10 drop-shadow-lg">{winnerNumber}</span>
                            <motion.div
                              animate={{ 
                                opacity: [0.3, 0.8, 0.3],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity
                              }}
                              className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"
                            />
                          </motion.div>
                          
                          {/* Floating sparkles around number */}
                          {[...Array(6)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ 
                                rotate: 360,
                                scale: [1, 1.3, 1],
                                opacity: [0.7, 1, 0.7]
                              }}
                              transition={{ 
                                duration: 3 + i * 0.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.3
                              }}
                              className={`absolute ${
                                i === 0 ? '-top-4 -left-4' :
                                i === 1 ? '-top-4 -right-4' :
                                i === 2 ? 'top-1/2 -left-6' :
                                i === 3 ? 'top-1/2 -right-6' :
                                i === 4 ? '-bottom-4 -left-4' :
                                '-bottom-4 -right-4'
                              }`}
                            >
                              <Sparkles className="h-6 w-6 text-yellow-400" />
                            </motion.div>
                          ))}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-xl p-4">
                            <h4 className="text-xl font-bold text-yellow-800 mb-2">
                              ¡El número ganador es {winnerNumber}!
                            </h4>
                            <p className="text-yellow-700 text-sm leading-relaxed">
                              Si tienes este número, <span className="font-bold">¡ERES EL GANADOR!</span>
                              <br />
                              Te contactaremos muy pronto para entregarte tu premio.
                              <br />
                              <span className="font-semibold">¡Muchas felicitaciones! 🎊</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-green-700">
                        ¡Todos los números vendidos!
                      </h3>
                      <p className="text-green-600 text-sm leading-relaxed">
                        El sorteo ha finalizado exitosamente.
                        <br />
                        Todos los números han sido vendidos.
                        <br />
                        Los ganadores serán anunciados muy pronto.
                        <br />
                        Te notificaremos tan pronto como tengamos los resultados.
                      </p>
                    </div>
                  )}

                  {/* Decorative elements */}
                  <div className="flex justify-center space-x-2 opacity-60">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.8, 0.3]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                        className={`w-2 h-2 rounded-full ${
                          hasWinner ? 'bg-yellow-400' : 'bg-green-400'
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DrawFinishedModal; 