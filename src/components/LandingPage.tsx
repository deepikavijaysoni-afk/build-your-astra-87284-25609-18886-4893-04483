import { Header } from './Header';
import { BackgroundGlow } from './BackgroundGlow';
import { PromptBox } from './PromptBox';
import { Footer } from './Footer';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  const handleSendMessage = (message: string, file?: File) => {
    navigate('/workshop', { state: { initialMessage: message, initialFile: file } });
  };

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      <BackgroundGlow />

      <Header />

      <main className="relative z-10 flex flex-col items-center justify-center px-2 md:px-6 lg:px-8 pb-16 pt-[3.5rem] min-h-[calc(100vh-80px)]">
        <div className="max-w-5xl w-full text-center space-y-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-white">What will you </span>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              build
            </span>
            <span className="text-white"> today?</span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-400 font-light max-w-3xl mx-auto">
            Create stunning apps & websites by chatting with AI.
          </p>

          <div className="pt-8">
            <PromptBox onSendMessage={handleSendMessage} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
