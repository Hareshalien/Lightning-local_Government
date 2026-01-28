
import React, { useState } from 'react';
import { Report, VerificationResult } from '../types';
import { verifyReportImage } from '../services/geminiService';

interface ReportTableProps {
  reports: Report[];
  onDelete: (id: string) => Promise<void>;
}

const ReportRow: React.FC<{ report: Report; onDelete: (id: string) => Promise<void> }> = ({ report, onDelete }) => {
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [auditResult, setAuditResult] = useState<VerificationResult | null>(null);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deleteState === 'idle') {
      setDeleteState('confirm');
      setTimeout(() => {
        setDeleteState(prev => prev === 'confirm' ? 'idle' : prev);
      }, 3000);
      return;
    }

    if (deleteState === 'confirm') {
      setDeleteState('deleting');
      await onDelete(report.id);
      setDeleteState('idle'); 
    }
  };

  const handleVerifyClick = async () => {
    if (!report.imageBase64) return;
    
    setVerifyState('loading');
    try {
      const result = await verifyReportImage(report);
      setAuditResult(result);
      setVerifyState('done');
    } catch (e) {
      console.error(e);
      setVerifyState('idle');
      alert("Verification failed. Please ensure the image is valid.");
    }
  };

  const imageSrc = report.imageBase64.startsWith('data:image') 
    ? report.imageBase64 
    : `data:image/jpeg;base64,${report.imageBase64}`;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <tr className="hover:bg-blue-50/50 transition-colors group">
      <td className="p-5 align-top">
        <div className="h-20 w-20 rounded-lg overflow-hidden border border-blue-100 shadow-sm group-hover:shadow-md transition-shadow bg-white">
          {report.imageBase64 ? (
            <img src={imageSrc} alt="Report evidence" className="w-full h-full object-cover" loading="lazy" />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
          )}
        </div>
      </td>
      <td className="p-5 align-top">
        <div className="font-bold text-blue-900 text-sm max-w-[200px] leading-snug">
          {report.address}
        </div>
        <div className="text-xs text-blue-400 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {formatDate(report.dateTime)}
        </div>
      </td>
      <td className="p-5 align-top">
        <p className="text-sm font-bold text-blue-900 leading-relaxed max-w-md">
          {report.description}
        </p>
      </td>
      {/* AI Audit Column */}
      <td className="p-5 align-top w-80">
        {verifyState === 'idle' ? (
          <button 
            onClick={handleVerifyClick}
            disabled={!report.imageBase64}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all w-full justify-center
              ${report.imageBase64 
                ? 'bg-gradient-to-r from-blue-50 to-white text-blue-600 border-blue-200 hover:border-blue-300 hover:shadow-md' 
                : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            AI Audit
          </button>
        ) : verifyState === 'loading' ? (
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex items-center justify-center gap-3">
             <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <span className="text-xs font-bold text-blue-800">Analysing Evidence...</span>
          </div>
        ) : auditResult ? (
          <div className="bg-slate-50 rounded-xl border border-blue-200 p-4 shadow-sm text-xs relative overflow-hidden">
            {/* Status Indicator Bar */}
            <div className={`absolute top-0 left-0 w-1.5 h-full 
              ${!auditResult.matchesDescription ? 'bg-red-500' 
                : !auditResult.isRelevant ? 'bg-orange-400' 
                : 'bg-green-500'}`}>
            </div>
            
            <div className="flex items-center justify-between mb-3 pl-2 gap-2">
               {/* Match Status Badge */}
               <span className={`font-extrabold px-2 py-1 rounded text-[10px] tracking-wider uppercase border whitespace-nowrap ${
                auditResult.matchesDescription 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                {auditResult.matchesDescription ? 'Confirmed' : 'No Match'}
              </span>

              {/* Jurisdiction Badge */}
              <span className={`font-extrabold px-2 py-1 rounded text-[10px] tracking-wider uppercase border whitespace-nowrap ${
                auditResult.isRelevant
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-orange-100 text-orange-700 border-orange-200'
              }`}>
                {auditResult.isRelevant ? 'Gov Issue' : 'Private'}
              </span>
            </div>
            
            <div className="pl-2 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide block mb-1">Findings</span>
                <ul className="list-disc list-outside ml-3 space-y-1">
                  {auditResult.findings.map((point, i) => (
                    <li key={i} className="text-slate-700 font-medium leading-snug">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </td>
      <td className="p-5 text-right align-top">
        <button 
          type="button"
          onClick={handleDeleteClick}
          disabled={deleteState === 'deleting'}
          className={`
            relative p-2 rounded-lg transition-all shadow-sm border
            ${deleteState === 'idle' ? 'bg-white text-slate-400 border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-100 hover:shadow' : ''}
            ${deleteState === 'confirm' ? 'bg-red-600 text-white border-red-700 w-24' : ''}
            ${deleteState === 'deleting' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
          `}
        >
          {deleteState === 'idle' && (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
             </svg>
          )}
          {deleteState === 'confirm' && <span className="text-xs font-bold animate-pulse">Confirm?</span>}
          {deleteState === 'deleting' && (
             <svg className="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          )}
        </button>
      </td>
    </tr>
  );
}

const ReportTable: React.FC<ReportTableProps> = ({ reports, onDelete }) => {
  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-blue-400 bg-white rounded-xl border border-blue-100">
        No reports found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-blue-100 pb-12">
      <table className="w-full text-left border-collapse">
        <thead className="bg-blue-50 text-blue-600 uppercase text-xs font-bold tracking-wider">
          <tr>
            <th className="p-5 border-b border-blue-100">Evidence</th>
            <th className="p-5 border-b border-blue-100">Location & Date</th>
            <th className="p-5 border-b border-blue-100">Problem Description</th>
            <th className="p-5 border-b border-blue-100 w-80 text-center">AI Audit</th>
            <th className="p-5 border-b border-blue-100 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
