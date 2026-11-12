/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bulletin } from '../types';
import { motion } from 'motion/react';
import { FileText, Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Bulletins() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const q = query(collection(db, 'bulletins'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bulletin));
      setBulletins(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bulletins');
    });
    return () => unsubscribe();
  }, []);

  // Pagination calculation (한 페이지에 8개씩)
  const totalPages = Math.ceil(bulletins.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBulletins = bulletins.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 sm:py-16 md:py-20">
      <div className="mb-8 sm:mb-12 md:mb-16 text-center">
        <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-2 sm:mb-3 block">Publications</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-brand-primary tracking-tight italic">주보 안내</h2>
        <p className="mt-2 sm:mt-3 text-brand-sub font-light text-xs sm:text-sm italic">매주 발행되는 교회 소식</p>
      </div>

      {loading ? (
        <div className="space-y-4 sm:space-y-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-brand-border h-20 sm:h-24 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {currentBulletins.map((bulletin, idx) => (
              <motion.div
                key={bulletin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="group bg-white p-4 sm:p-6 md:p-7 rounded-xl border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 hover:shadow-lg sm:hover:shadow-xl transition-all"
              >
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-bg border border-brand-border flex items-center justify-center rounded-lg text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-all shrink-0 mt-0.5 sm:mt-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h3 className="font-serif text-base sm:text-lg font-medium text-brand-primary group-hover:text-brand-accent transition-colors break-keep leading-snug">
                      {bulletin.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-brand-sub mt-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-accent/70 shrink-0" />
                      <span className="tracking-wide">{bulletin.date}</span>
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 pt-2 sm:pt-0 border-t border-brand-border/40 sm:border-0">
                  <a 
                    href={bulletin.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 border border-brand-primary text-brand-primary text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-brand-primary hover:text-white active:bg-brand-primary/90 transition-all text-center shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>주보 다운로드 (PDF)</span>
                  </a>
                </div>
              </motion.div>
            ))}

            {bulletins.length === 0 && (
              <div className="py-20 sm:py-32 text-center text-brand-sub font-light italic text-sm">
                등록된 주보가 없습니다.
              </div>
            )}
          </div>

          {/* Pagination Controls (한 페이지당 8개) - 모바일 세로화면에서도 한 줄에 완벽 정렬 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 sm:gap-2 mt-10 sm:mt-16 flex-nowrap max-w-full overflow-x-auto py-2 px-1">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                title="이전 페이지"
                aria-label="이전 페이지"
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-brand-border flex items-center justify-center shrink-0 transition-all ${
                  currentPage === 1
                    ? 'opacity-30 cursor-not-allowed bg-brand-bg text-brand-sub'
                    : 'bg-white text-brand-primary hover:border-brand-accent hover:text-brand-accent shadow-xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
              </button>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border text-xs sm:text-[12px] font-bold shrink-0 transition-all ${
                      currentPage === num 
                        ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                        : 'bg-white border-brand-border text-brand-sub hover:border-brand-accent hover:text-brand-accent'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                title="다음 페이지"
                aria-label="다음 페이지"
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-brand-border flex items-center justify-center shrink-0 transition-all ${
                  currentPage === totalPages
                    ? 'opacity-30 cursor-not-allowed bg-brand-bg text-brand-sub'
                    : 'bg-white text-brand-primary hover:border-brand-accent hover:text-brand-accent shadow-xs'
                }`}
              >
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
