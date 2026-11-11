/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, User, Camera, RotateCcw, Church, ExternalLink } from 'lucide-react';
import pastorPhoto from '../assets/images/pastor_lee_photo_1789371007095.jpg';
import staffPhoto from '../assets/images/church_staff_group_1789372024709.jpg';

export default function About() {
  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    return localStorage.getItem('pastor_custom_photo');
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group Photo State
  const [customStaffPhoto, setCustomStaffPhoto] = useState<string | null>(() => {
    return localStorage.getItem('church_custom_staff_photo');
  });
  const [isStaffDragging, setIsStaffDragging] = useState(false);
  const staffFileInputRef = useRef<HTMLInputElement>(null);

  const handleStaffFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processStaffFile(file);
    }
  };

  const processStaffFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      localStorage.setItem('church_custom_staff_photo', result);
      setCustomStaffPhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleStaffDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsStaffDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processStaffFile(file);
    }
  };

  const handleResetStaffPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('church_custom_staff_photo');
    setCustomStaffPhoto(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      localStorage.setItem('pastor_custom_photo', result);
      setCustomPhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleResetPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('pastor_custom_photo');
    setCustomPhoto(null);
  };
  return (
    <div className="flex flex-col">
      {/* Page Header */}
      <section className="py-16 sm:py-20 md:py-28 px-5 sm:px-8 md:px-12 text-center max-w-4xl mx-auto">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 32 }}
          className="h-[1px] bg-brand-accent mx-auto mb-6"
        ></motion.div>
        <span className="text-[11px] font-bold text-brand-accent uppercase tracking-[0.25em] mb-3 block">
          Melbourne Disciple Korean Church
        </span>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl md:text-5xl font-serif text-brand-primary tracking-tight"
        >
          교회 소개
        </motion.h2>
      </section>

      {/* Church Overview Section */}
      <section className="py-16 sm:py-20 md:py-28 px-5 sm:px-8 md:px-12 bg-white border-y border-brand-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-[0.25em] mb-2 sm:mb-3 block">
              About Us
            </span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif text-brand-primary tracking-tight">
              멜번제자교회
            </h3>
            <div className="w-10 h-[2px] bg-brand-accent mx-auto mt-3 sm:mt-4"></div>
          </div>

          {/* Leaders & Staff Group Photo */}
          <div className="mb-10 sm:mb-14">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsStaffDragging(true); }}
              onDragLeave={() => setIsStaffDragging(false)}
              onDrop={handleStaffDrop}
              className={`aspect-[16/9] rounded-2xl overflow-hidden shadow-xl border relative bg-brand-bg group transition-all duration-300 ${
                isStaffDragging ? 'border-brand-accent ring-2 ring-brand-accent scale-[1.01]' : 'border-brand-border'
              }`}
            >
              <img 
                src={customStaffPhoto || staffPhoto} 
                alt="멜번제자교회" 
                className="w-full h-full object-cover object-top hover:scale-[1.01] transition-transform duration-700"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/church_staff.jpg';
                }}
              />

              {/* Photo Change Controls */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-1.5 sm:gap-2">
                {customStaffPhoto && (
                  <button
                    onClick={handleResetStaffPhoto}
                    title="기본 사진으로 되돌리기"
                    className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-brand-sub hover:text-brand-primary text-[10px] sm:text-[11px] font-medium shadow-md border border-brand-border flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>초기화</span>
                  </button>
                )}
                <button
                  onClick={() => staffFileInputRef.current?.click()}
                  title="소장하신 원본 단체 사진 파일(JPEG, PNG)을 선택하여 바로 적용합니다"
                  className="px-3 sm:px-3.5 py-1.5 rounded-full bg-brand-primary/90 hover:bg-brand-primary text-white text-[10px] sm:text-[11px] font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-brand-accent" />
                  <span>사진 변경</span>
                </button>
              </div>

              {/* Drag Over Overlay */}
              {isStaffDragging && (
                <div className="absolute inset-0 bg-brand-primary/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                  <Camera className="w-10 h-10 text-brand-accent mb-2 animate-bounce" />
                  <p className="text-sm font-medium">여기에 사진 파일을 놓아주세요</p>
                </div>
              )}

              <input 
                ref={staffFileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleStaffFileChange}
                className="hidden" 
              />
            </div>
            <p className="text-[11px] text-brand-sub text-center mt-2.5 font-light break-keep">
              멜번제자교회 공동체 · 우측 상단 <strong>사진 변경</strong> 버튼으로 소장하신 원본 사진을 언제든 등록하실 수 있습니다.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8 text-brand-muted leading-relaxed font-light text-[15px] sm:text-base md:text-lg break-keep">
            {/* 개척 및 목회 비전 본문 */}
            <p className="text-base sm:text-lg md:text-xl font-serif text-brand-primary leading-relaxed font-medium break-keep">
              멜번제자교회는 2013년 9월 8일에 첫예배를 드림으로 성도 한 사람, 한 사람을 예수님의 제자로 세워가는 목회 비전을 가지고 개척되었습니다. 예수님의 제자로서의 온전한 사명을 다하기 위해 무엇보다도 하나님의 말씀 위에 신앙의 뿌리를 내릴 뿐만 아니라, 건강한 자아와 자존감을 회복하며 이민교회에 맡겨 주신 사명을 감당하고자 합니다.
            </p>

            {/* 목회비전 하이라이트 박스 */}
            <div className="my-6 sm:my-8 p-5 sm:p-7 md:p-9 bg-brand-bg border border-brand-border rounded-2xl shadow-sm">
              <div>
                <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest block mb-4">
                  ‘목회비전(Vision)’
                </span>
                <ul className="space-y-3.5 text-sm sm:text-base md:text-lg text-brand-primary">
                  <li className="flex items-start gap-3 sm:gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-brand-accent/15 text-brand-accent font-serif font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span className="leading-relaxed break-keep">
                      <strong>예수를 닮아가는 정체성의 회복</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3 sm:gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-brand-accent/15 text-brand-accent font-serif font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span className="leading-relaxed break-keep">
                      <strong>예수를 따라가는 사명의 회복</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3 sm:gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-brand-accent/15 text-brand-accent font-serif font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span className="leading-relaxed break-keep">
                      <strong className="break-keep xl:whitespace-nowrap">좁은문으로 가지만 하나님과 동행하는 풍성하고 행복한 삶으로 복음을 전하는 축복의 통로가 되는 것</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 정체성 회복 & 사명 회복 (사역 & 훈련) */}
            <p className="break-keep">
              정체성 회복을 위해, 특별히 ‘다음 세대’의 ‘신앙정체성’을 바로 세우기 위해 행복한 주일학교와 학생부, 청년부를 위한 신앙교육을 합니다. 또한 장년부들의 평생신앙을 위해 ‘새가족모임’, ‘소그룹모임’, ‘어~성경이 읽어지네(구약/신약)’, ‘기초교리반’, ‘제자훈련반’, ‘사역자훈련반’을 진행하고 있습니다. 그리고 사명 회복을 위해 각자 주신 은사에 따라 다양한 봉사 및 선교의 사역을 하고 있습니다. 찬양팀 및 미술팀, 미디어팀, 새가족팀, 가정사역팀, 선교팀 등으로 나누어진 ‘팀사역’을 통해 함께 세워져 가는 교회공동체의 기쁨을 누리고 있습니다.
            </p>

            {/* 교단 및 대양주노회 안내 */}
            <div className="mt-6 sm:mt-8 p-5 sm:p-7 md:p-8 bg-brand-bg/50 border border-brand-border rounded-xl space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3">
                <Church className="w-5 h-5 text-brand-accent shrink-0" />
                <h4 className="text-base sm:text-lg font-serif font-bold text-brand-primary">소속 교단 및 노회</h4>
              </div>
              <p className="text-brand-muted break-keep text-sm sm:text-base leading-relaxed">
                그리고 멜번제자교회는 ‘대한예수교장로회(순장)’에 소속된 교회로서 ‘대양주노회’의 회원교회입니다. ‘대양주노회’는 멜번제자교회를 포함하여 아들레이드장로교회(문광식 목사), 뉴질랜드평강교회(안정기 목사), 골드코스트장로교회(곽석근 목사), 시드니브릿지교회(박용대 목사), 시드니오션파크교회(김성태 목사), 번버리좋은소식교회(박대원 목사), 브리즈번주는교회(엄현준 목사)로 구성되어 있습니다.
              </p>

              {/* 대양주노회 회원교회 리스트 그리드 */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest block mb-3">
                  대양주노회 회원교회 (8개 교회)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-sm">
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">멜번제자교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">이치형 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">아들레이드장로교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">문광식 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">뉴질랜드평강교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">안정기 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">골드코스트장로교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">곽석근 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">시드니브릿지교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">박용대 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">시드니오션파크교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">김성태 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">번버리좋은소식교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">박대원 목사</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-brand-border">
                    <span className="text-brand-primary font-semibold">브리즈번주는교회</span>
                    <span className="text-xs text-brand-muted block mt-0.5">엄현준 목사</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Greetings */}
      <section className="py-16 sm:py-24 md:py-32 px-5 sm:px-8 md:px-12 bg-white border-y border-brand-border">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 sm:gap-16 xl:gap-20 items-start">
          <div className="flex-1 w-full order-2 lg:order-1">
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-3 sm:mb-4 block">Greetings</span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif text-brand-primary mb-6 sm:mb-10 tracking-tight leading-tight">담임목사 인사말</h3>
            
            <div className="space-y-5 sm:space-y-6 text-brand-muted leading-relaxed font-light text-[15px] sm:text-base md:text-lg break-keep">
              <p className="text-base sm:text-lg md:text-xl font-serif text-brand-primary font-medium leading-snug break-keep">
                안녕하십니까? 멜번제자교회를 섬기는 이치형 목사입니다.
              </p>
              
              <p className="break-keep">
                저는 불신 가정에서 태어났지만, 하나님의 은혜로 교회를 알게 되고 예수님을 믿어 목사가 되었습니다. 
                저의 모교회인 ‘대구서문교회’에서 고등학교 2학년 때 예수님을 인격적으로 만나고 열심으로 신앙생활을 하였습니다. 
                이후 군생활 중 ‘군종병’으로 섬기며 목회의 비전을 가지게 되었고 대학 졸업 후 ‘총신대학교 신학대학원’에 입학하였습니다. 
                대구서문교회에서 교육전도사, 전도사, 강도사, 목사의 과정을 거쳐 7년간 사역 후에 아들레이드로 유학을 오게 되었습니다. 
                하나님의 예비하심으로 아들레이드장로교회에서 협동부목사로 섬기며 이민목회의 중요성을 절실히 느꼈습니다. 
                이후 2013년 9월 멜번제자교회의 개척을 위해 파송을 받고 오늘에 이르게 되었습니다.
              </p>

              <p className="break-keep">
                ‘멜번제자교회’라는 이름은 고 옥한흠 목사님(사랑의교회)의 영향으로 한 사람의 성도를 한 사람의 제자로 세우는 
                ‘평신도신학’의 비전을 가지고 교회를 개척하였기 때문입니다. 
                단순히 교회를 출석하는 ‘Sunday Christian’이 아니라, 이 땅에 우리를 구원하신 하나님의 목적과 뜻을 이뤄드리는 
                ‘예수님의 제자’로서의 삶이 얼마나 복되며 행복한 것인지를 함께 경험하는 것입니다.
              </p>

              <p className="break-keep">
                멜번제자교회는 사도행전에 나온 ‘초대교회의 본질’을 균형있게 회복해 가는 건강한 개혁주의를 표방하는 장로교입니다. 
                그래서 ‘목회의 비전’을 이룰 다음의 다섯 가지 <strong className="font-semibold text-brand-primary">‘목회철학(Pastoral Principles)’</strong>을 명시하고 있습니다.
              </p>

              {/* 5 Pastoral Principles */}
              <div className="my-6 sm:my-8 p-5 sm:p-6 md:p-8 bg-brand-bg/70 border border-brand-border rounded-xl space-y-3.5 not-italic">
                <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest block mb-1">
                  Pastoral Principles · 5대 목회철학
                </span>
                <ol className="space-y-2.5 text-sm md:text-base text-brand-primary">
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <span className="font-serif font-bold text-brand-accent shrink-0">(1)</span>
                    <span className="break-keep">하나님을 만나는 감격의 예배와 말씀</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <span className="font-serif font-bold text-brand-accent shrink-0">(2)</span>
                    <span className="break-keep">다음 세대를 세우는 교육과 훈련</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <span className="font-serif font-bold text-brand-accent shrink-0">(3)</span>
                    <span className="break-keep">땅 끝까지 복음을 전하는 전도와 선교</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <span className="font-serif font-bold text-brand-accent shrink-0">(4)</span>
                    <span className="break-keep">선한 이웃이 되는 봉사와 구제</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <span className="font-serif font-bold text-brand-accent shrink-0">(5)</span>
                    <span className="break-keep">그리스도의 몸된 공동체를 세우는 친교와 교제</span>
                  </li>
                </ol>
              </div>

              <p className="break-keep">
                이 다섯 가지의 목회 철학을 통해 구체적으로 예수님의 제자로서의 정체성과 사명을 회복하며 비록 십자가의 좁은 길을 가지만, 늘 하나님과 동행하는 행복과 함께 공동체 안에서 누리는 기쁨을 잃지 않는 멜번제자교회가 되고자 합니다.
              </p>

              <p className="text-brand-primary font-medium break-keep">
                멜번에서 새로운 신앙의 공동체를 찾고 계시다면, 한 번 방문하여 함께 예배 드리며 교제를 나눌 수 있기를 바라는 마음으로 여러분을 초대합니다!
              </p>

              <div className="pt-6 sm:pt-8 border-t border-brand-border flex flex-col items-end text-right not-italic">
                 <p className="font-serif text-xl md:text-2xl font-bold text-brand-primary">이치형 담임목사</p>
                 <p className="text-[11px] uppercase tracking-[0.2em] text-brand-sub mt-1">Melbourne Disciple Korean Church</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[420px] mx-auto lg:mx-0 shrink-0 lg:sticky lg:top-28 order-1 lg:order-2">
             <div 
               onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
               onDragLeave={() => setIsDragging(false)}
               onDrop={handleDrop}
               className={`aspect-[3/4] rounded-xl overflow-hidden shadow-xl border relative bg-brand-bg group transition-all duration-300 ${
                 isDragging ? 'border-brand-accent ring-2 ring-brand-accent scale-[1.01]' : 'border-brand-border'
               }`}
             >
               <img 
                 src={customPhoto || pastorPhoto} 
                 alt="이치형 담임목사" 
                 className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                 referrerPolicy="no-referrer"
                 onError={(e) => {
                   (e.currentTarget as HTMLImageElement).src = '/pastor.jpg';
                 }}
               />
               <div className="absolute inset-0 border-[12px] sm:border-[16px] md:border-[20px] border-white/10 pointer-events-none"></div>

               {/* Photo Change Controls */}
               <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-1.5 sm:gap-2">
                 {customPhoto && (
                   <button
                     onClick={handleResetPhoto}
                     title="기본 사진으로 되돌리기"
                     className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-brand-sub hover:text-brand-primary text-[10px] sm:text-[11px] font-medium shadow-md border border-brand-border flex items-center gap-1.5 transition-all cursor-pointer"
                   >
                     <RotateCcw className="w-3.5 h-3.5" />
                     <span>초기화</span>
                   </button>
                 )}
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   title="소장하신 원본 사진 파일(JPEG, PNG)을 선택하여 바로 적용합니다"
                   className="px-3 sm:px-3.5 py-1.5 rounded-full bg-brand-primary/90 hover:bg-brand-primary text-white text-[10px] sm:text-[11px] font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
                 >
                   <Camera className="w-3.5 h-3.5 text-brand-accent" />
                   <span>사진 변경</span>
                 </button>
               </div>

               {/* Drag Over Overlay */}
               {isDragging && (
                 <div className="absolute inset-0 bg-brand-primary/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                   <Camera className="w-10 h-10 text-brand-accent mb-2 animate-bounce" />
                   <p className="text-sm font-medium">여기에 사진 파일을 놓아주세요</p>
                 </div>
               )}

               <input 
                 ref={fileInputRef}
                 type="file" 
                 accept="image/*" 
                 onChange={handleFileChange}
                 className="hidden" 
               />
             </div>
             <p className="text-[11px] text-brand-sub text-center mt-2.5 sm:mt-3 font-light break-keep">
               소장하고 계신 원본 사진을 <strong>사진 변경</strong> 버튼을 눌러 바로 등록하실 수 있습니다.
             </p>
          </div>
        </div>
      </section>

      {/* Map & Info */}
      <section id="location" className="py-16 sm:py-24 md:py-32 px-5 sm:px-8 md:px-12 bg-brand-bg scroll-mt-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-20 xl:gap-24">
          <div>
            <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-3 sm:mb-4 block">Contact Us</span>
            <h3 className="text-2xl sm:text-3xl font-serif text-brand-primary mb-8 sm:mb-12 tracking-tight italic">오시는 길</h3>
            <div className="space-y-8 sm:space-y-12">
              <div className="flex gap-4 sm:gap-8 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white border border-brand-border rounded-lg flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5 sm:mb-2">교회 주소</h4>
                  <p className="text-brand-muted font-light text-sm italic mb-3 sm:mb-4 break-keep">245 Middleborough Rd, Box Hill South VIC 3128</p>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=245+Middleborough+Rd,+Box+Hill+South+VIC+3128" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-accent hover:text-brand-primary border-b border-brand-accent pb-0.5 transition-colors"
                  >
                    <span>VIEW ON GOOGLE MAPS</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex gap-4 sm:gap-8 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white border border-brand-border rounded-lg flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5 sm:mb-2">전화번호</h4>
                  <p className="text-brand-muted font-light text-sm italic">0425 773 914</p>
                </div>
              </div>

              <div className="flex gap-4 sm:gap-8 group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white border border-brand-border rounded-lg flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5 sm:mb-2">이메일</h4>
                  <a href="mailto:info@mkdc.org.au" className="text-brand-muted font-light text-sm italic hover:text-brand-accent transition-colors">info@mkdc.org.au</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-brand-border p-2.5 sm:p-3 rounded-2xl shadow-xl min-h-[380px] sm:min-h-[420px] flex flex-col relative overflow-hidden group">
            <div className="w-full h-full min-h-[340px] sm:min-h-[380px] rounded-xl overflow-hidden relative border border-brand-border/60 bg-brand-bg">
              <iframe
                title="Church Location - 245 Middleborough Rd, Box Hill South VIC 3128"
                src="https://maps.google.com/maps?q=245+Middleborough+Rd,+Box+Hill+South+VIC+3128&t=&z=16&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full min-h-[340px] sm:min-h-[380px] border-0"
                loading="lazy"
                allowFullScreen
              />

              {/* Floating View on Google Maps Button */}
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=245+Middleborough+Rd,+Box+Hill+South+VIC+3128"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-brand-primary/95 hover:bg-brand-primary text-white text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-[1.02] border border-white/20"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                  <span>View on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-3 pb-1 text-[11px] text-brand-sub">
              <span className="break-keep">245 Middleborough Rd, Box Hill South VIC 3128</span>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=245+Middleborough+Rd,+Box+Hill+South+VIC+3128" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-accent font-semibold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Google 지도 길찾기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
