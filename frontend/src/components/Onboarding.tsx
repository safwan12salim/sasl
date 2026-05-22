/**
 * Sasl - Social Asynchronous Sharing Layer
 * Legendary 3-Step Onboarding — Every superpower in elegant simplicity
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiOff, DollarSign, Zap, Sparkles, Globe, Shield,
  ShoppingCart, Video, BookOpen, Briefcase, Radio,
  Camera, Mic, Brain, MessageCircle, Users, TrendingUp,
  Heart, Star, ChevronRight, ArrowRight, Play
} from 'lucide-react';


const steps = [
  {
    id: 'offline',
    icon: <WifiOff className="w-24 h-24" />,
    gradient: 'from-green-400 to-emerald-600',
    bgGradient: 'from-green-50 to-emerald-50',
    title: 'Works 100% Offline. Anywhere.',
    headline: 'No WiFi? No Problem.',
    features: [
      { icon: <MessageCircle size={18} />, text: 'Chat & post via WaveMesh P2P' },
      { icon: <Globe size={18} />, text: 'Syncs automatically when online' },
      { icon: <Shield size={18} />, text: 'End-to-end encrypted always' },
      { icon: <Radio size={18} />, text: 'Connect up to 20km via mesh' },
    ],
    stat: 'Works in 190+ countries',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'earn',
    icon: <DollarSign className="w-24 h-24" />,
    gradient: 'from-yellow-400 to-orange-600',
    bgGradient: 'from-yellow-50 to-orange-50',
    title: 'Earn Real Money. Daily.',
    headline: 'Multiple Income Streams',
    earnings: [
      { role: '🎥 Creators', amount: '$2,500', period: '/month', icon: <Star size={16} className="text-yellow-500" /> },
      { role: '🛍️ Sellers', amount: '$1,800', period: '/month', icon: <ShoppingCart size={16} className="text-blue-500" /> },
      { role: '📚 Teachers', amount: '$4,500', period: '/month', icon: <BookOpen size={16} className="text-purple-500" /> },
      { role: '💼 Gig Workers', amount: '$1,200', period: '/month', icon: <Briefcase size={16} className="text-indigo-500" /> },
    ],
    stat: '95% goes to creators',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    id: 'superapp',
    icon: <Zap className="w-24 h-24" />,
    gradient: 'from-purple-400 to-pink-600',
    bgGradient: 'from-purple-50 to-pink-50',
    title: 'One App. Everything.',
    headline: 'The Ultimate Super App',
    apps: [
      { icon: <MessageCircle size={20} />, name: 'Social Feed', color: 'text-blue-500' },
      { icon: <ShoppingCart size={20} />, name: 'Marketplace', color: 'text-green-500' },
      { icon: <Video size={20} />, name: 'Streaming', color: 'text-red-500' },
      { icon: <BookOpen size={20} />, name: 'Tutoring', color: 'text-purple-500' },
      { icon: <Briefcase size={20} />, name: 'Gig Central', color: 'text-indigo-500' },
      { icon: <Radio size={20} />, name: 'Live Audio', color: 'text-orange-500' },
      { icon: <Camera size={20} />, name: 'Snap & Stories', color: 'text-pink-500' },
      { icon: <Brain size={20} />, name: 'AI Assistant', color: 'text-violet-500' },
    ],
    stat: 'All working offline',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const currentStep = steps[step];

  useEffect(() => {
    // Auto-advance animation
    const interval = setInterval(() => {
      const el = document.getElementById('progress-bar');
      if (el) {
        el.style.width = `${((step + 1) / steps.length) * 100}%`;
      }
    }, 50);
    return () => clearInterval(interval);
  }, [step]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

const handleFinish = () => {
  localStorage.setItem('sasl_onboarded', 'true');
  navigate('/', { replace: true });
};

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className={`absolute inset-0 bg-gradient-to-br ${currentStep.bgGradient}`} />
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-sm font-medium">Step {step + 1} of {steps.length}</span>
            <button onClick={handleSkip} className="text-white/40 hover:text-white/80 text-sm transition">
              Skip →
            </button>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              id="progress-bar"
              className={`h-full bg-gradient-to-r ${currentStep.gradient} rounded-full`}
              initial={{ width: `${(step / steps.length) * 100}%` }}
              animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* Main Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -50, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="relative"
          >
            {/* Glass Card */}
            <div className="backdrop-blur-2xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
              {/* Icon Hero */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center shadow-2xl ${currentStep.color}`}
              >
                <div className="text-white drop-shadow-lg">
                  {currentStep.icon}
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className={`text-sm font-bold uppercase tracking-wider text-center mb-2 ${currentStep.color}`}>
                  {currentStep.headline}
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-6 leading-tight">
                  {currentStep.title}
                </h2>
              </motion.div>

              {/* Features Grid — Step 1 */}
              {step === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-3 mb-6"
                >
                  {currentStep.features?.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/20 transition cursor-default"
                    >
                      <div className={`${currentStep.color}`}>{feature.icon}</div>
                      <span className="text-white/80 text-xs font-medium">{feature.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Earnings Cards — Step 2 */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3 mb-6"
                >
                  {currentStep.earnings?.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/20 transition cursor-default"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          {item.icon}
                        </div>
                        <span className="text-white font-semibold text-sm">{item.role}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">{item.amount}</p>
                        <p className="text-white/50 text-xs">{item.period}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* App Grid — Step 3 */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-4 gap-2 mb-6"
                >
                  {currentStep.apps?.map((app, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05, type: 'spring' }}
                      className="flex flex-col items-center gap-1 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition cursor-default group"
                    >
                      <div className={`${app.color} group-hover:scale-110 transition-transform`}>
                        {app.icon}
                      </div>
                      <span className="text-white/60 text-[10px] font-medium text-center leading-tight">
                        {app.name}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Stat Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`${currentStep.bgColor} bg-opacity-20 rounded-full px-4 py-2 text-center`}
              >
                <span className={`${currentStep.color} text-sm font-bold`}>
                  ✨ {currentStep.stat}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="text-white/40 hover:text-white transition disabled:opacity-0 disabled:cursor-default font-medium text-sm"
          >
            ← Back
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? `bg-gradient-to-r ${steps[i].gradient} w-8`
                    : 'bg-white/20 w-2 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className={`bg-gradient-to-r ${currentStep.gradient} text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition shadow-lg`}
          >
            {step < steps.length - 1 ? (
              <>Next <ChevronRight size={16} /></>
            ) : (
              <>Get Started <ArrowRight size={16} /></>
            )}
          </button>
        </div>

        {/* Logo */}
        <div className="mt-6 text-center">
          <Logo className="justify-center opacity-40 hover:opacity-60 transition" />
        </div>
      </div>
    </div>
  );
}