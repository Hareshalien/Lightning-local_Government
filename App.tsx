
import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import ReportTable from './components/ReportTable';
import SolutionPanel from './components/SolutionPanel';
import { fetchReports, deleteReport } from './services/firebase';
import { Report, ViewMode } from './types';
import { COLLECTION_NAME } from './constants';

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [view, setView] = useState<ViewMode>('map');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.message || "An unexpected error occurred while fetching reports.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    console.log("Processing delete request for:", id);
    try {
      await deleteReport(id);
      console.log("Delete successful in UI, updating state.");
      // Optimistically remove from state
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert(`Failed to delete report: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-blue-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-xl z-20 border-b border-blue-800">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-2">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none tracking-tighter" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                Lightning
              </h1>
            </div>
          </div>
          
          <nav className="flex space-x-1 bg-blue-950/50 p-1.5 rounded-xl backdrop-blur-sm border border-blue-800 shadow-inner">
            {(['map', 'list', 'solution'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                  view === mode 
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                    : 'text-blue-300 hover:text-white hover:bg-blue-800'
                }`}
              >
                {mode === 'map' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
                {mode === 'list' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                {mode === 'solution' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                
                {mode === 'map' && <span>Map</span>}
                {mode === 'list' && <span>Reports</span>}
                {mode === 'solution' && <span>AI Solutions</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative p-4 w-full">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-bold">System Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
              <button onClick={loadData} className="text-sm text-red-700 hover:text-red-900 font-semibold underline">Retry Connection</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-cyan-500 mb-6"></div>
               <p className="text-blue-800 font-medium animate-pulse text-lg">Lightning on the way</p>
            </div>
          </div>
        ) : (
          <>
            {/* Empty State */}
            {!error && reports.length === 0 && (
              <div className="bg-blue-100 border-l-4 border-blue-400 p-6 mb-4 rounded-r shadow-sm flex items-start">
                <svg className="h-6 w-6 text-blue-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <h3 className="text-blue-800 font-bold text-lg">No Active Reports</h3>
                    <p className="text-blue-700 mt-1">
                      Great news! There are currently no unresolved reports in the <strong>{COLLECTION_NAME}</strong> collection.
                    </p>
                </div>
              </div>
            )}

            {/* Map View */}
            <div className={`w-full h-full transition-opacity duration-300 ${view === 'map' ? 'block' : 'hidden'}`}>
              <Map reports={reports} isActive={view === 'map'} />
            </div>

            {/* List View */}
            <div className={`w-full h-full overflow-auto transition-opacity duration-300 ${view === 'list' ? 'block' : 'hidden'}`}>
              <div className="w-full mx-auto">
                 <div className="mb-6 flex justify-between items-end bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <div>
                      <h2 className="text-2xl font-bold text-blue-900">Reports Database</h2>
                      <p className="text-blue-500 text-sm mt-1">Live feed from citizen mobile applications</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-bold">
                      {reports.length} Total Cases
                    </span>
                 </div>
                 <ReportTable reports={reports} onDelete={handleDelete} />
              </div>
            </div>

            {/* Solution View */}
            <div className={`w-full h-full overflow-hidden transition-opacity duration-300 ${view === 'solution' ? 'block' : 'hidden'}`}>
              <div className="w-full mx-auto h-full pb-4">
                <SolutionPanel reports={reports} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
