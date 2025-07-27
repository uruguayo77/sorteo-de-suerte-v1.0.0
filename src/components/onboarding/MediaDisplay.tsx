import React, { useState } from 'react'
import { Play } from 'lucide-react'
import { MediaDisplayProps } from '@/types/onboarding'

const MediaDisplay: React.FC<MediaDisplayProps> = ({ mediaType, mediaUrl, title }) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  if (!mediaUrl) {
    return (
      <div className="w-full min-h-[200px] bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-purple-300/30">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🎬</div>
          <p>Sin contenido multimedia</p>
        </div>
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className="relative w-full media-container min-h-[200px] max-h-[50vh] flex justify-center items-center">
        <video
          controls={isVideoPlaying}
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
          className="max-w-full max-h-full object-contain rounded-xl"
        >
          <source src={mediaUrl} type="video/mp4" />
          <source src={mediaUrl} type="video/webm" />
          Tu navegador no soporta la reproducción de video.
        </video>
        
        {!isVideoPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:bg-black/30 z-10"
            onClick={() => {
              const video = document.querySelector('video') as HTMLVideoElement
              if (video) {
                video.play()
                setIsVideoPlaying(true)
              }
            }}
          >
            <div className="bg-white/90 rounded-full p-4 shadow-2xl hover:bg-white transition-colors duration-200">
              <Play className="w-8 h-8 text-purple-600 ml-1" fill="currentColor" />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Для изображений
  return (
    <div className="w-full media-container min-h-[200px] max-h-[50vh] flex justify-center items-center">
      <img
        src={mediaUrl}
        alt={title}
        loading="lazy"
        className="max-w-full max-h-full object-contain rounded-xl"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          // Можно добавить fallback изображение
        }}
      />
    </div>
  )
}

export default MediaDisplay 