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
    <div className="max-w-4xl mx-auto px-12 py-24">
      <div className="mb-20 text-center">
        <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-4 block">Publications</span>
        <h2 className="text-4xl font-serif text-brand-primary tracking-tight italic">주보 안내</h2>
        <p className="mt-4 text-brand-sub font-light text-sm italic">매주 발행되는 교회 소식</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-brand-border h-24 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
            {currentBulletins.map((bulletin, idx) => (
              <motion.div
                key={bulletin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="group bg-white p-8 rounded-xl border border-brand-border flex items-center justify-between hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-8">
                  <div className="w-12 h-12 bg-brand-bg border border-brand-border flex items-center justify-center rounded-lg text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-all">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-brand-primary group-hover:text-brand-accent transition-colors">{bulletin.title}</h3>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-brand-sub mt-1">
                      <Calendar className="w-3 h-3" />
                      {bulletin.date}
                    </div>
                  </div>
                </div>
                
                <a 
                  href={bulletin.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 border border-brand-primary text-brand-primary text-[11px] font-bold uppercase tracking-widest rounded hover:bg-brand-primary hover:text-white transition-all"
                >
                  <Download className="w-3 h-3" />
                  DOWNLOAD
                </a>
              </motion.div>
            ))}

            {bulletins.length === 0 && (
              <div className="py-32 text-center text-brand-sub font-light italic">
                등록된 주보가 없습니다.
              </div>
            )}
          </div>

          {/* Pagination Controls (한 페이지당 8개) */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-16">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                title="이전 페이지"
                className={`p-2.5 rounded-full border border-brand-border transition-all ${
                  currentPage === 1
                    ? 'opacity-30 cursor-not-allowed bg-brand-bg text-brand-sub'
                    : 'bg-white text-brand-primary hover:border-brand-accent hover:text-brand-accent shadow-xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  className={`w-10 h-10 rounded-full border text-[12px] font-bold transition-all ${
                    currentPage === num 
                      ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                      : 'bg-white border-brand-border text-brand-sub hover:border-brand-accent hover:text-brand-accent'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                title="다음 페이지"
                className={`p-2.5 rounded-full border border-brand-border transition-all ${
                  currentPage === totalPages
                    ? 'opacity-30 cursor-not-allowed bg-brand-bg text-brand-sub'
                    : 'bg-white text-brand-primary hover:border-brand-accent hover:text-brand-accent shadow-xs'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
