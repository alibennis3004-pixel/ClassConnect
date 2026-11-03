import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  variant?: 'light' | 'dark';
  hideText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSlogan = false,
  variant = 'dark',
  hideText = false,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';
  const sloganColor = variant === 'light' ? 'text-cyan-200' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative ${iconSizes[size]} rounded-2xl overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0 bg-white/5`}>
        <img
          src="/assets/aistudio/Logo_ClassConnect_avec_ic_ne__ducative_lumineuse_97ebcc7d.png"
          alt="ClassConnect Logo Officiel"
          className="w-full h-full object-contain rounded-xl drop-shadow-xs"
        />
      </div>

      {!hideText && (
        <div className="flex flex-col">
          <div className={`font-extrabold tracking-tight ${textSizes[size]} ${textColor} flex items-center gap-1.5`}>
            <span>Class<span className="text-cyan-500">Connect</span></span>
          </div>
          {showSlogan && (
            <span className={`text-xs font-medium tracking-wide ${sloganColor}`}>
              « Connecter la classe, faciliter la réussite. »
            </span>
          )}
        </div>
      )}
    </div>
  );
};
