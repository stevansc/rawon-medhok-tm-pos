import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, Link } from "react-router-dom";
import CustomerApp from "./apps/CustomerApp";
import EmployeeApp from "./apps/EmployeeApp";
import CashierApp from "./apps/CashierApp";
import AdminApp from "./apps/AdminApp";
import { ChefHat, Banknote, ShieldAlert, Smartphone } from "lucide-react";
import { ApiService } from "./services/api";

// Wrapper components to extract URL parameters and pass as props
function CustomerWrapper() {
  const { branchName, tableNumber } = useParams();
  return <CustomerApp branchNameQuery={branchName} tableNumberQuery={tableNumber} />;
}

function EmployeeWrapper() {
  const { branchName } = useParams();
  return <EmployeeApp currentBranch={branchName || ""} />;
}

function CashierWrapper() {
  const { branchName } = useParams();
  return <CashierApp currentBranch={branchName || ""} />;
}

// Simple directory landing page
function AppDirectory() {
  const [defaultBranch, setDefaultBranch] = useState("");

  useEffect(() => {
    ApiService.getBranches().then(branches => {
      if (branches.length > 0) {
        setDefaultBranch(branches[0].name);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-black text-stone-900 mb-2 text-center uppercase tracking-tight">Rawon TM POS System</h1>
        <p className="text-stone-500 text-center mb-8 font-mono text-sm uppercase">Select an application portal to begin.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to={`/customer/${defaultBranch}/5`} className="bg-white p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all border-2 border-stone-900 flex flex-col items-center text-center group active:scale-95">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-none border border-orange-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Smartphone size={32} />
            </div>
            <h2 className="text-xl font-black text-stone-900 mb-1 uppercase tracking-wide">Customer</h2>
            <p className="text-[10px] text-stone-500 font-mono uppercase">Public menu & ordering</p>
          </Link>
          
          <Link to={`/employee/${defaultBranch}`} className="bg-white p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all border-2 border-stone-900 flex flex-col items-center text-center group active:scale-95">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-none border border-red-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ChefHat size={32} />
            </div>
            <h2 className="text-xl font-black text-stone-900 mb-1 uppercase tracking-wide">Employee</h2>
            <p className="text-[10px] text-stone-500 font-mono uppercase">Order ticket management</p>
          </Link>
          
          <Link to={`/cashier/${defaultBranch}`} className="bg-white p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all border-2 border-stone-900 flex flex-col items-center text-center group active:scale-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-none border border-emerald-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Banknote size={32} />
            </div>
            <h2 className="text-xl font-black text-stone-900 mb-1 uppercase tracking-wide">Cashier</h2>
            <p className="text-[10px] text-stone-500 font-mono uppercase">Payments & fulfillment</p>
          </Link>
          
          <Link to="/admin" className="bg-white p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all border-2 border-stone-900 flex flex-col items-center text-center group active:scale-95">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-none border border-indigo-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-black text-stone-900 mb-1 uppercase tracking-wide">Admin HQ</h2>
            <p className="text-[10px] text-stone-500 font-mono uppercase">Global configuration</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppDirectory />} />
        <Route path="/customer/:branchName?/:tableNumber?" element={<CustomerWrapper />} />
        <Route path="/employee/:branchName?" element={<EmployeeWrapper />} />
        <Route path="/cashier/:branchName?" element={<CashierWrapper />} />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
