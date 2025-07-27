import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import MediaDisplay from './MediaDisplay'
import { OnboardingModalProps } from '@/types/onboarding'

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, config }) => {
  if (!config) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
                     {/* Backdrop с blur эффектом */}
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.3 }}
             className="fixed inset-0 z-50 backdrop-blur-xl bg-black/30"
           />

          {/* Модальное окно */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen">
            <div className="w-full h-full flex items-center justify-center overflow-y-auto py-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ 
                  duration: 0.4, 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                               }}
                 className="onboarding-modal relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto"
              >
                             {/* Crystal Glass Container */}
               <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
                 {/* Gradient overlay */}
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />

                                 {/* Content */}
                 <div className="relative z-10 p-4 sm:p-6 md:p-8 lg:p-10">
                                                                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-3 sm:mb-4 md:mb-6 flex justify-center"
                  >
                    <h2 className="sorteo-title text-center mb-2 text-lg sm:text-xl md:text-2xl lg:text-3xl">
                      {config.title}
                    </h2>
                  </motion.div>

                                    {/* Media Content */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-3 sm:mb-4 md:mb-6 flex justify-center items-center max-w-full overflow-hidden"
                  >
                    <MediaDisplay
                      mediaType={config.media_type}
                      mediaUrl={config.media_url}
                      title={config.title}
                    />
                  </motion.div>

                                    {/* Description */}
                  {config.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-center mb-4 sm:mb-6 md:mb-8 flex justify-center"
                    >
                      <p className="text-gray-200 text-sm sm:text-base md:text-lg leading-relaxed max-w-md px-2">
                        {config.description}
                      </p>
                    </motion.div>
                  )}

                                    {/* Continue Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center flex justify-center mt-4"
                  >
                    <Button
                      onClick={onClose}
                      className="w-full sm:w-auto min-w-[200px] md:min-w-[250px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 md:py-4 md:px-8 text-sm sm:text-base md:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      {config.button_text}
                    </Button>
                  </motion.div>
                </div>

                {/* Декоративные элементы */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-xl" />
              </div>
            </motion.div>
          </div>
        </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default OnboardingModal 