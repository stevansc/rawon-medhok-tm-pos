/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, useParams, Link } from "react-router-dom";
import CustomerApp from "./apps/CustomerApp";
import KitchenApp from "./apps/KitchenApp";
import CashierApp from "./apps/CashierApp";
import AdminApp from "./apps/AdminApp";
import { ChefHat, Banknote, ShieldAlert, Smartphone } from "lucide-react";

// Wrapper components to extract URL parameters and pass as props
function CustomerWrapper() {
  const { branchName, tableNumber } = useParams();
  return <CustomerApp branchNameQuery={branchName} tableNumberQuery={tableNumber} />;
}

function KitchenWrapper() {
  const { branchName } = useParams();
  return <KitchenApp currentBranch={branchName} />;
}

function CashierWrapper() {
  const { branchName } = useParams();
  return <CashierApp currentBranch={branchName} />;
}

// Simple directory landing page
function AppDirectory() {
  const defaultBranch = "Gayung Sari"; // We can default to Gayung Sari for quick links
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-stone-800 mb-2 text-center">Rawon TM POS System</h1>
        <p className="text-stone-500 text-center mb-8">Select an application portal to begin.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={`/customer/${defaultBranch}/5`} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-stone-200 flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Smartphone size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-1">Customer</h2>
            <p className="text-sm text-stone-500">Public menu & ordering</p>
          </Link>
          
          <Link to={`/kitchen/${defaultBranch}`} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-stone-200 flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ChefHat size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-1">Kitchen</h2>
            <p className="text-sm text-stone-500">Order ticket management</p>
          </Link>
          
          <Link to={`/cashier/${defaultBranch}`} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-stone-200 flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Banknote size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-1">Cashier</h2>
            <p className="text-sm text-stone-500">Payments & fulfillment</p>
          </Link>
          
          <Link to="/admin" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-stone-200 flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-1">Admin HQ</h2>
            <p className="text-sm text-stone-500">Global configuration</p>
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
        <Route path="/customer/:branchName/:tableNumber?" element={<CustomerWrapper />} />
        <Route path="/kitchen/:branchName" element={<KitchenWrapper />} />
        <Route path="/cashier/:branchName" element={<CashierWrapper />} />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
