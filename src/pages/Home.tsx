/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Video, BookOpen, Clock, Camera, RotateCcw, Users, GraduationCap, Sparkles, MapPin, Heart, Baby, Phone, Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import defaultHeroLogo from '../assets/images/church_green_logo_1789372670800.jpg';
import { useAdminAuth } from '../lib/useAdminAuth';
import { subscribeToChurchPhotos, compressAndProcessImage, saveChurchPhoto, resetChurchPhoto, syncLocalPhotosToFirestore } from '../lib/photoService';

export default function Home() {
  const { isAdmin } = useAdminAuth();
  const [heroPhoto, setHeroPhoto] = useState<string | null>(() => {
    return localStorage.getItem('church_hero_landing_photo');
  });
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToChurchPhotos((photos) => {
      if (photos.heroPhoto !== undefined) {
        setHeroPhoto(photos.heroPhoto);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      syncLocalPhotosToFirestore(isAdmin).catch((e) => console.warn("Auto sync failed:", e));
    }
  }, [isAdmin]);

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      await processHeroFile(file);
    }
  };

  const processHeroFile = async (file: File) => {
    if (!isAdmin) return;
    try {
      const result = await compressAndProcessImage(file);
      await saveChurchPhoto('heroPhoto', result, isAdmin);
      setHeroPhoto(result);
    } catch (err) {
      console.error("Hero photo upload failed:", err);
    }
  };

  const handleHeroDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsHeroDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processHeroFile(file);
    }
  };

  const handleResetHeroPhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    await resetChurchPhoto('heroPhoto', isAdmin);
    setHeroPhoto(null);
  };
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative px-6 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-7xl mx-auto overflow-hidden">
        <div className="flex-1 lg:flex-[1.2] flex flex-col justify-center w-full">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            className="mb-8 h-[1px] bg-brand-accent"
          ></motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[20px] xs:text-[22px] sm:text-[26px] md:text-[32px] lg:text-[40px] xl:text-5xl font-serif leading-[1.4] sm:leading-[1.35] mb-6 sm:mb-8 text-brand-primary tracking-tight font-medium"
          >
            <span className="block whitespace-nowrap">멜번제자교회는</span>
            <span className="block whitespace-nowrap">예수를 닮고 따라가며</span>
            <span className="block whitespace-nowrap">참된 정체성과 사명을 회복하는</span>
            <span className="block whitespace-nowrap">
              <span className="text-brand-accent italic font-normal">‘행복한 제자’</span>들의 공동체입니다.
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-brand-muted leading-relaxed mb-8 sm:mb-10 max-w-xl text-sm sm:text-base md:text-lg font-light"
          >
            <span className="block">하나님과 동행하는 풍성한 삶을 누리며,</span>
            <span className="block">세상에 복음을 전하는 축복의 통로로 여러분을 초대합니다.</span>
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap lg:max-xl:flex-nowrap gap-2.5 sm:gap-3.5 lg:max-xl:gap-2"
          >
            <Link to="/about" className="px-5 sm:px-6 lg:max-xl:px-3 py-3 sm:py-3.5 lg:max-xl:py-2.5 bg-brand-primary text-white text-xs sm:text-sm lg:max-xl:text-xs rounded-sm shadow-xl shadow-brand-primary/10 hover:bg-black transition-all flex items-center gap-2 lg:max-xl:gap-1.5 group whitespace-nowrap">
              교회소개 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
            <button 
              onClick={() => document.getElementById('worship-schedule')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-5 sm:px-6 lg:max-xl:px-3 py-3 sm:py-3.5 lg:max-xl:py-2.5 border border-brand-border text-xs sm:text-sm lg:max-xl:text-xs text-brand-accent rounded-sm bg-white hover:bg-brand-bg transition-colors whitespace-nowrap cursor-pointer"
            >
              예배 시간 보기
            </button>
            <button 
              onClick={() => document.getElementById('ministry-groups')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-5 sm:px-6 lg:max-xl:px-3 py-3 sm:py-3.5 lg:max-xl:py-2.5 border border-brand-border text-xs sm:text-sm lg:max-xl:text-xs text-brand-primary rounded-sm bg-white hover:bg-brand-bg transition-colors font-medium whitespace-nowrap cursor-pointer"
            >
              주일학교 · 청년부
            </button>
            <button 
              onClick={() => document.getElementById('location')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-5 sm:px-6 lg:max-xl:px-3 py-3 sm:py-3.5 lg:max-xl:py-2.5 border border-brand-border text-xs sm:text-sm lg:max-xl:text-xs text-brand-sub hover:text-brand-primary rounded-sm bg-white hover:bg-brand-bg transition-colors cursor-pointer whitespace-nowrap"
            >
              오시는 길
            </button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex-1 relative w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto"
        >
          <div 
            onDragOver={isAdmin ? (e) => { e.preventDefault(); setIsHeroDragging(true); } : undefined}
            onDragLeave={isAdmin ? () => setIsHeroDragging(false) : undefined}
            onDrop={isAdmin ? handleHeroDrop : undefined}
            className={`aspect-square rounded-3xl overflow-hidden shadow-2xl relative z-10 border transition-all duration-300 group bg-[#A5BC73] flex items-center justify-center ${
              isAdmin && isHeroDragging ? 'border-white ring-4 ring-white/50 scale-[1.01]' : 'border-white/50'
            }`}
          >
             <img 
               src={heroPhoto || '/church_logo_green.svg'} 
               alt="멜번제자교회" 
               className="w-full h-full object-contain hover:scale-[1.02] transition-transform duration-700"
               referrerPolicy="no-referrer"
               onError={(e) => {
                 (e.currentTarget as HTMLImageElement).src = '/church_logo_green.png';
               }}
             />

             {/* Change Controls - Only visible to Church Admins */}
             {isAdmin && (
               <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                 {heroPhoto && (
                   <button
                     onClick={handleResetHeroPhoto}
                     title="기본 이미지로 되돌리기"
                     className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-brand-sub hover:text-brand-primary text-[11px] font-medium shadow-md border border-brand-border flex items-center gap-1.5 transition-all cursor-pointer"
                   >
                     <RotateCcw className="w-3.5 h-3.5" />
                     <span>초기화</span>
                   </button>
                 )}
                 <button
                   onClick={() => heroFileInputRef.current?.click()}
                   title="소장하신 원본 로고 이미지(녹색.png)를 선택하여 바로 적용합니다"
                   className="px-3.5 py-1.5 rounded-full bg-brand-primary/90 hover:bg-brand-primary text-white text-[11px] font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-white/30"
                 >
                   <Camera className="w-3.5 h-3.5 text-brand-accent" />
                   <span>사진 변경</span>
                 </button>
               </div>
             )}

             {/* Drag Overlay - Only for Admins */}
             {isAdmin && isHeroDragging && (
               <div className="absolute inset-0 bg-[#7B954E]/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30 pointer-events-none">
                 <Camera className="w-12 h-12 text-white mb-2 animate-bounce" />
                 <p className="text-sm font-medium">여기에 녹색.png 파일을 놓아주세요</p>
               </div>
             )}

             {isAdmin && (
               <input 
                 ref={heroFileInputRef}
                 type="file" 
                 accept="image/*" 
                 onChange={handleHeroFileChange}
                 className="hidden" 
               />
             )}
          </div>
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#9CB570]/20 rounded-full -z-0 blur-2xl"></div>
        </motion.div>
      </section>

      {/* Highlights Section */}
      <section className="py-24 px-6 md:px-8 lg:px-12 bg-[#F5F3EF]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <Link to="/sermons" className="bg-white border border-brand-border p-6 lg:p-8 rounded-2xl flex flex-col group hover:shadow-xl hover:border-brand-accent transition-all">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest">Sermon</span>
              <Video className="w-4 h-4 text-brand-sub" />
            </div>
            <h3 className="text-xl font-serif mb-2 group-hover:text-brand-accent transition-colors">말씀 영상</h3>
            <p className="text-xs text-brand-sub mb-8 font-light">매주 선포되는 생명의 양식</p>
            <span className="text-[11px] font-bold text-brand-primary border-b border-brand-primary w-fit pb-0.5 mt-auto">VIEW SERMON</span>
          </Link>

          <Link to="/bulletins" className="bg-white border border-brand-border p-6 lg:p-8 rounded-2xl flex flex-col group hover:shadow-xl hover:border-brand-accent transition-all">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest">Weekly Newsletter</span>
              <BookOpen className="w-4 h-4 text-brand-sub" />
            </div>
            <h3 className="text-xl font-serif mb-2 group-hover:text-brand-accent transition-colors">주보 보기</h3>
            <p className="text-xs text-brand-sub mb-8 font-light">교회 소식과 예배 안내</p>
            <span className="text-[11px] font-bold text-brand-primary border-b border-brand-primary w-fit pb-0.5 mt-auto">VIEW BULLETIN</span>
          </Link>

          <div id="worship-schedule" className="bg-[#4A4A40] p-6 lg:p-8 rounded-2xl flex flex-col text-white scroll-mt-32">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest">Schedule</span>
              <Clock className="w-4 h-4 text-white/50" />
            </div>
            <h3 className="text-xl font-serif mb-6 italic">예배 시간 안내</h3>
            <div className="space-y-3.5 text-[13px] font-light">
              <div className="flex flex-row md:flex-col lg:flex-col xl:flex-row justify-between md:items-start lg:items-start xl:items-center border-b border-white/10 pb-2.5 gap-1">
                <span className="text-white/90">주일1부 예배(본당)</span>
                <span className="font-medium text-brand-accent">11:45 AM</span>
              </div>
              <div className="flex flex-row md:flex-col lg:flex-col xl:flex-row justify-between md:items-start lg:items-start xl:items-center border-b border-white/10 pb-2.5 gap-1">
                <span className="text-white/90">주일2부 예배(본당)</span>
                <span className="font-medium text-brand-accent">1:45 PM</span>
              </div>
              <div className="flex flex-row md:flex-col lg:flex-col xl:flex-row justify-between md:items-start lg:items-start xl:items-center border-b border-white/10 pb-2.5 gap-1">
                <span className="text-white/90">금요기도회(본당)</span>
                <span className="font-medium text-brand-accent">7:30 PM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 주일학교 및 청년부 모임 Section */}
      <section id="ministry-groups" className="py-24 px-6 md:px-12 bg-white border-t border-brand-border scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-[0.25em] mb-3 block">
              Next Generation & Youth Fellowship
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-brand-primary tracking-tight font-medium">
              주일학교 및 청년부 모임
            </h2>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Card 1: 주일학교 */}
            <div className="bg-[#FAF8F5] border border-brand-border/90 rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4 mb-7">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-brand-border flex items-center justify-center text-brand-accent shadow-sm shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-brand-accent block whitespace-nowrap">
                        Sunday School · 다음 세대
                      </span>
                      <h3 className="text-2xl font-serif font-bold text-brand-primary whitespace-nowrap">
                        주일학교
                      </h3>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-white text-brand-sub border border-brand-border/70 whitespace-nowrap">
                      영유아부 · 유치부 · 유초등부 · 학생부
                    </span>
                  </div>
                </div>

                {/* 4개 부서별 시간 및 장소 안내 (영유아부, 유치부, 유초등부, 학생부) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* 영유아부 */}
                  <div className="p-4 sm:p-4.5 bg-white rounded-2xl border border-brand-border/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-serif font-bold text-base text-brand-primary flex items-center gap-1.5 whitespace-nowrap">
                          <Baby className="w-4 h-4 text-brand-accent shrink-0" />
                          영유아부
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg text-brand-sub border border-brand-border/60 whitespace-nowrap shrink-0">
                          0~2세
                        </span>
                      </div>
                      <div className="flex flex-col lg:max-xl:flex-row lg:max-xl:items-center lg:max-xl:gap-4 space-y-1.5 lg:max-xl:space-y-0 text-xs text-brand-muted font-light">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">시간:</strong> 주일 1:45 PM</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">장소:</strong> 영유아실</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 유치부 */}
                  <div className="p-4 sm:p-4.5 bg-white rounded-2xl border border-brand-border/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-serif font-bold text-base text-brand-primary flex items-center gap-1.5 whitespace-nowrap">
                          <Sparkles className="w-4 h-4 text-brand-accent shrink-0" />
                          유치부
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg text-brand-sub border border-brand-border/60 whitespace-nowrap shrink-0">
                          3 ~ Before Prep
                        </span>
                      </div>
                      <div className="flex flex-col lg:max-xl:flex-row lg:max-xl:items-center lg:max-xl:gap-4 space-y-1.5 lg:max-xl:space-y-0 text-xs text-brand-muted font-light">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">시간:</strong> 주일 1:45 PM</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">장소:</strong> 유치부실</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 유초등부 */}
                  <div className="p-4 sm:p-4.5 bg-white rounded-2xl border border-brand-border/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-serif font-bold text-base text-brand-primary flex items-center gap-1.5 whitespace-nowrap">
                          <BookOpen className="w-4 h-4 text-brand-accent shrink-0" />
                          유초등부
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg text-brand-sub border border-brand-border/60 whitespace-nowrap shrink-0">
                          Prep ~ Year 6
                        </span>
                      </div>
                      <div className="flex flex-col lg:max-xl:flex-row lg:max-xl:items-center lg:max-xl:gap-4 space-y-1.5 lg:max-xl:space-y-0 text-xs text-brand-muted font-light">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">시간:</strong> 주일 1:45 PM</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">장소:</strong> 유초등부실</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 학생부 */}
                  <div className="p-4 sm:p-4.5 bg-white rounded-2xl border border-brand-border/70 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-serif font-bold text-base text-brand-primary flex items-center gap-1.5 whitespace-nowrap">
                          <GraduationCap className="w-4 h-4 text-brand-accent shrink-0" />
                          학생부
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg text-brand-sub border border-brand-border/60 whitespace-nowrap shrink-0">
                          Year 7 ~ 12
                        </span>
                      </div>
                      <div className="flex flex-col lg:max-xl:flex-row lg:max-xl:items-center lg:max-xl:gap-4 space-y-1.5 lg:max-xl:space-y-0 text-xs text-brand-muted font-light">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">시간:</strong> 주일 1:45 PM</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span className="whitespace-nowrap"><strong className="font-medium text-brand-primary">장소:</strong> 학생부실</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: 청년부 */}
            <div className="bg-[#FAF8F5] border border-brand-border/90 rounded-3xl p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-brand-border flex items-center justify-center text-brand-accent shadow-sm shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-brand-accent block whitespace-nowrap">
                        Young Adults · 청년 공동체
                      </span>
                      <h3 className="text-2xl font-serif font-bold text-brand-primary whitespace-nowrap">
                        청년부
                      </h3>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-white text-brand-sub border border-brand-border/70 whitespace-nowrap">
                      대학생 · 유학생 · 워홀 · 직장인
                    </span>
                  </div>
                </div>

                {/* Schedule & Location Box */}
                <div className="space-y-4 sm:space-y-3.5 p-5 sm:p-6 bg-white rounded-2xl border border-brand-border/70 text-[13px] shadow-xs">
                  {/* 모임시간 */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-brand-primary">
                    <div className="flex items-center gap-1.5 text-brand-accent font-semibold text-xs sm:text-brand-sub sm:text-[13px] sm:font-normal shrink-0 sm:w-20 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span>모임시간</span>
                    </div>
                    <span className="font-medium text-brand-primary text-[13.5px] sm:text-[13px] whitespace-nowrap">
                      매주 주일 2부 예배 직후
                    </span>
                  </div>

                  <div className="h-px bg-brand-border/50 sm:hidden" />

                  {/* 모임장소 */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-brand-primary">
                    <div className="flex items-center gap-1.5 text-brand-accent font-semibold text-xs sm:text-brand-sub sm:text-[13px] sm:font-normal shrink-0 sm:w-20 whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span>모임장소</span>
                    </div>
                    <span className="font-medium text-brand-primary text-[13.5px] sm:text-[13px] whitespace-nowrap">
                      청년부실
                    </span>
                  </div>

                  <div className="h-px bg-brand-border/50 sm:hidden" />

                  {/* 참여대상 */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-brand-primary">
                    <div className="flex items-center gap-1.5 text-brand-accent font-semibold text-xs sm:text-brand-sub sm:text-[13px] sm:font-normal shrink-0 sm:w-20 whitespace-nowrap">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span>참여대상</span>
                    </div>
                    <span className="font-medium text-brand-primary text-[13.5px] sm:text-[13px] whitespace-nowrap">
                      대학생 · 유학생 · 워홀 · 직장인
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Directions & Location Section (오시는 길) */}
      <section id="location" className="py-16 sm:py-20 md:py-24 px-6 sm:px-8 md:px-12 bg-brand-bg border-t border-brand-border scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-2 block">
              Directions & Location
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-brand-primary tracking-tight font-medium">
              오시는 길
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Info Cards Column */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5">
                {/* 교회 주소 Card (spans 2 cols on tablet portrait) */}
                <div className="sm:col-span-2 lg:col-span-1 bg-white border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-brand-accent/40 transition-all flex flex-col justify-between group">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-brand-bg rounded-xl flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all shadow-xs">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10.5px] font-bold text-brand-sub uppercase tracking-wider block mb-1">교회 주소</span>
                      <p className="text-brand-primary font-medium text-sm sm:text-[15px] leading-snug break-keep mb-3">
                        245 Middleborough Rd, Box Hill South VIC 3128
                      </p>
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=245+Middleborough+Rd,+Box+Hill+South+VIC+3128" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:text-brand-primary transition-colors"
                      >
                        <span>Google 지도에서 확인하기</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 전화번호 Card */}
                <div className="bg-white border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-brand-accent/40 transition-all flex flex-col justify-between group">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-brand-bg rounded-xl flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all shadow-xs">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10.5px] font-bold text-brand-sub uppercase tracking-wider block mb-1">전화번호</span>
                      <a 
                        href="tel:0401800109" 
                        className="text-brand-primary font-medium text-sm sm:text-[15px] hover:text-brand-accent transition-colors block leading-snug"
                      >
                        0401 800 109
                      </a>
                    </div>
                  </div>
                </div>

                {/* 이메일 Card */}
                <div className="bg-white border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-brand-accent/40 transition-all flex flex-col justify-between group">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-brand-bg rounded-xl flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all shadow-xs">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10.5px] font-bold text-brand-sub uppercase tracking-wider block mb-1">이메일</span>
                      <a 
                        href="mailto:info@mkdc.org.au" 
                        className="text-brand-accent font-medium text-sm sm:text-[15px] hover:underline transition-colors block leading-snug break-all"
                      >
                        info@mkdc.org.au
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Column */}
            <div className="lg:col-span-7 bg-white border border-brand-border p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col relative overflow-hidden group">
              <div className="w-full h-[320px] sm:h-[380px] md:h-[420px] lg:h-[440px] rounded-xl sm:rounded-2xl overflow-hidden relative border border-brand-border/60 bg-brand-bg">
                <iframe
                  title="Church Location - 245 Middleborough Rd, Box Hill South VIC 3128"
                  src="https://maps.google.com/maps?q=245+Middleborough+Rd,+Box+Hill+South+VIC+3128&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                />

                {/* Floating View on Google Maps Button */}
                <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=245+Middleborough+Rd,+Box+Hill+South+VIC+3128"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-brand-primary/95 hover:bg-brand-primary text-white text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-2 transition-all hover:scale-[1.02] border border-white/20"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>
              </div>

              {/* Map Footer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-3 pb-1 text-xs text-brand-sub">
                <span className="font-medium text-brand-primary">245 Middleborough Rd, Box Hill South VIC 3128</span>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=245+Middleborough+Rd,+Box+Hill+South+VIC+3128" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-accent font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Google 지도 길찾기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
