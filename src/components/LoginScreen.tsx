import React from "react";
import { AlertCircle } from "lucide-react";

interface LoginScreenProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  buttonText: string;
  loadingText: string;
  credentialHint?: { username: string; password: string };
  // Auth state
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  isLoggingIn: boolean;
  loginError: string | null;
  handleLogin: (e: React.FormEvent) => void;
}

export default function LoginScreen({
  title,
  subtitle,
  icon,
  buttonText,
  loadingText,
  credentialHint,
  username,
  setUsername,
  password,
  setPassword,
  isLoggingIn,
  loginError,
  handleLogin,
}: LoginScreenProps) {
  return (
    <div className="mx-auto max-w-md bg-stone-900 text-white min-h-screen flex flex-col justify-center px-6 py-12 font-sans border-x border-stone-800">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-orange-600 rounded-none flex items-center justify-center mb-4 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.9)]">
          {icon}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">{title}</h2>
        <p className="text-[10px] text-orange-500 mt-1 uppercase tracking-widest font-mono">{subtitle}</p>
      </div>

      <div className="bg-stone-950 rounded-none p-6 shadow-2xl border-2 border-orange-600">
        <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
          <span>Staff Authentication Required</span>
        </h3>

        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          <div>
            <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Username</label>
            <input
              type="text"
              required
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-none px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-xs placeholder-stone-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-none px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-xs placeholder-stone-600 font-mono"
            />
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-none text-red-200 text-xs flex items-start gap-1.5 leading-snug font-mono">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold py-3 rounded-none uppercase tracking-wider text-xs shadow-md active:scale-95 transition-all mt-6"
          >
            {isLoggingIn ? loadingText : buttonText}
          </button>
        </form>
      </div>

    </div>
  );
}
