/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sermon } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Calendar, User, ExternalLink, X, RotateCcw, CheckCircle2 } from 'lucide-react';

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

export default function Sermons() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [isEnded, setIsEnded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'sermons'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sermon));
      setSermons(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sermons');
    });
    return () => unsubscribe();
  }, []);

  // Listen for YouTube player state changes to intercept end-screen recommendations
  useEffect(() => {
    if (!selectedSermon) {
      setIsEnded(false);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && (data.event === 'onStateChange' || data.info !== undefined)) {
          // YT.PlayerState.ENDED is 0
          if (data.info === 0) {
            setIsEnded(true);
          } else if (data.info === 1) { // PLAYING
            setIsEnded(false);
          }
        }
      } catch {
        // Non-JSON postMessage ignored
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSermon(null);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSermon]);

  const handleIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      // Subscribe to YouTube Iframe events
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'listening' }),
        '*'
      );
    }
  };

  const handleReplay = () => {
    setIsEnded(false);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(sermons.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sermons.slice(indexOfFirstItem, indexOfLastItem);

  const activeVideoId = selectedSermon ? getYouTubeId(selectedSermon.videoUrl) : null;
  // rel=0 prevents third-party/external "More videos" suggestions
  // modestbranding=1 hides YouTube logo
  // iv_load_policy=3 hides annotations
  // playsinline=1 allows inline playback on mobile
  // enablejsapi=1 enables communication to handle end of video
  const embedUrl = activeVideoId
    ? `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 sm:py-16 md:py-24">
      <div className="mb-10 sm:mb-16 md:mb-20">
        <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-2 sm:mb-4 block">Media Archive</span>
        <h2 className="text-3xl sm:text-4xl font-serif text-brand-primary tracking-tight italic">설교 말씀</h2>
        <div className="mt-3 sm:mt-4 w-12 h-[1px] bg-brand-border"></div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white border border-brand-border rounded-xl aspect-video animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {currentItems.map((sermon, idx) => {
              const videoId = getYouTubeId(sermon.videoUrl);
              return (
                <motion.div
                  key={sermon.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white border border-brand-border overflow-hidden rounded-xl hover:shadow-2xl transition-all"
                >
                  <button 
                    onClick={() => {
                      setIsEnded(false);
                      setSelectedSermon(sermon);
                    }}
                    className="w-full relative block aspect-video overflow-hidden bg-[#F0EEE9]"
                  >
                    <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-all z-10 flex items-center justify-center">
                       <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                         <Play className="w-5 h-5 text-brand-primary fill-brand-primary ml-0.5" />
                       </div>
                    </div>
                    <img 
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt={sermon.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=1000&auto=format&fit=crop';
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className="p-8">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] text-brand-sub uppercase tracking-wider">{sermon.date}</span>
                      <span className="text-[10px] bg-brand-bg px-2 py-0.5 border border-brand-border rounded text-brand-muted uppercase">{sermon.speaker}</span>
                    </div>
                    <h3 className="text-xl font-serif mb-6 group-hover:text-brand-accent transition-colors leading-snug line-clamp-2">{sermon.title}</h3>
                    <button 
                       onClick={() => {
                         setIsEnded(false);
                         setSelectedSermon(sermon);
                       }}
                       className="w-full flex items-center justify-center gap-2 py-3 border border-brand-border text-[11px] font-bold text-brand-primary uppercase tracking-widest hover:bg-brand-bg transition-colors"
                    >
                      WATCH VIDEO <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            
            {sermons.length === 0 && (
              <div className="col-span-full py-32 text-center text-brand-sub font-light italic">
                아직 등록된 설교 영상이 없습니다.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-20">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setCurrentPage(num);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-10 h-10 rounded-full border border-brand-border text-[11px] font-bold transition-all ${
                    currentPage === num 
                      ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                      : 'bg-white text-brand-sub hover:border-brand-accent hover:text-brand-accent'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Video Modal with Clean Player (No External More Videos) */}
      <AnimatePresence>
        {selectedSermon && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-brand-primary/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-5xl bg-black shadow-2xl rounded-2xl overflow-hidden border border-white/10 flex flex-col"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#141414] border-b border-white/10">
                <div className="min-w-0 pr-4">
                  <h3 className="font-serif italic text-white text-base md:text-lg truncate">
                    {selectedSermon.title}
                  </h3>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {selectedSermon.speaker} • {selectedSermon.date}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSermon(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-all shrink-0"
                >
                  <span>닫기</span>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Player Container */}
              <div className="relative aspect-video w-full bg-black">
                {embedUrl ? (
                  <iframe 
                    ref={iframeRef}
                    src={embedUrl}
                    title={selectedSermon.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/70 p-6 text-center">
                    <p className="text-sm">올바른 유튜브 영상 링크를 찾을 수 없습니다.</p>
                    <a 
                      href={selectedSermon.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-3 text-xs text-brand-accent underline flex items-center gap-1"
                    >
                      새 창에서 열기 <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Video Ended Overlay - Replaces YouTube's "More Videos" Grid */}
                <AnimatePresence>
                  {isEnded && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/92 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center text-white"
                    >
                      <div className="w-14 h-14 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center mb-4 text-brand-accent">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h4 className="font-serif italic text-xl md:text-2xl text-white mb-2">
                        말씀 영상 시청이 완료되었습니다
                      </h4>
                      <p className="text-xs text-white/70 max-w-md mb-6">
                        "{selectedSermon.title}" ({selectedSermon.speaker})
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleReplay}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-accent hover:bg-[#8e7557] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>처음부터 다시 보기</span>
                        </button>
                        <button
                          onClick={() => setSelectedSermon(null)}
                          className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          <span>창 닫기</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            <div 
              className="absolute inset-0 -z-10" 
              onClick={() => setSelectedSermon(null)}
            ></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Support direct 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  // Support youtu.be, youtube.com/watch, embed, v, shorts, live, etc.
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}
