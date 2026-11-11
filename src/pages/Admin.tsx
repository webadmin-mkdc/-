/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, setDoc, updateDoc, doc, getDoc, getDocs, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, LogOut, Plus, Trash2, FileText, Video, Loader2, ShieldCheck, Copy, Check, Info, Users, RotateCcw, AlertTriangle, CheckSquare, Square, X, UserPlus, ArrowRight, Pencil, Camera, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Bulletin, Sermon, AdminUser } from '../types';
import staffPhotoDefault from '../assets/images/church_staff_group_1789372024709.jpg';
import pastorPhotoDefault from '../assets/images/pastor_lee_photo_1789371007095.jpg';
import { subscribeToChurchPhotos, compressAndProcessImage, saveChurchPhoto, resetChurchPhoto, ChurchPhotos } from '../lib/photoService';

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

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'sermons' | 'bulletins' | 'photos' | 'admins'>('sermons');
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setCheckingAdmin(true);
        try {
          const userEmail = u.email ? u.email.toLowerCase() : '';
          const isRootAdmin = userEmail === 'webadmin@mkdc.org.au';

          // Check 1: Doc by UID
          const adminDocByUid = await getDoc(doc(db, 'admins', u.uid));
          let hasAdminDoc = adminDocByUid.exists();

          // Check 2: Doc by Email (when registered via email address by another admin)
          let adminDocByEmail = null;
          if (!hasAdminDoc && userEmail) {
            adminDocByEmail = await getDoc(doc(db, 'admins', userEmail));
            if (adminDocByEmail.exists()) {
              hasAdminDoc = true;
            }
          }

          let userIsAdmin = hasAdminDoc || isRootAdmin;

          // Auto-link/provision doc by UID if validated via email or root admin
          if (userIsAdmin && !adminDocByUid.exists()) {
            try {
              const prevData = adminDocByEmail?.data();
              await setDoc(doc(db, 'admins', u.uid), {
                email: userEmail,
                name: prevData?.name || (isRootAdmin ? '대표 관리자 (웹마스터)' : '교회 관리자'),
                createdAt: prevData?.createdAt || Date.now(),
                addedBy: prevData?.addedBy || '시스템 초기화',
                uid: u.uid
              });
            } catch (seedErr) {
              console.error("Auto-provisioning admin doc failed", seedErr);
            }
          }

          // Atomically set user and admin status together after verification
          setUser(u);
          setIsAdmin(userIsAdmin);
        } catch (error) {
          console.error("Admin check failed", error);
          setUser(u);
          setIsAdmin(u.email === 'webadmin@mkdc.org.au');
        } finally {
          setCheckingAdmin(false);
          setAuthLoading(false);
          setIsLoggingIn(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setCheckingAdmin(false);
        setAuthLoading(false);
        setIsLoggingIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const cleanupRef = useRef<(() => void) | null>(null);

  const cancelLogin = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
    } else {
      setIsLoggingIn(false);
      setCheckingAdmin(false);
    }
  };

  const signInWithGoogle = async () => {
    // If a previous attempt was running, clean it up first
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    setIsLoggingIn(true);
    let popupWindow: Window | null = null;
    const originalOpen = window.open;

    // Capture the popup reference opened by Firebase
    window.open = function (...args: any[]) {
      // @ts-ignore
      const win = originalOpen.apply(this, args);
      popupWindow = win;
      return win;
    };

    let isCleanedUp = false;
    let pollTimer: any = null;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.open = originalOpen;
      setIsLoggingIn(false);
      setCheckingAdmin(false);
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;

    // Fast detector: check if popup was closed every 200ms
    pollTimer = setInterval(() => {
      try {
        if (popupWindow && popupWindow.closed) {
          cleanup();
        }
      } catch {
        // Fallback handled by focus/visibility
      }
    }, 200);

    // Focus detector: when user closes/cancels popup and clicks back to page
    const handleFocus = () => {
      setTimeout(() => {
        try {
          if (!popupWindow || popupWindow.closed) {
            cleanup();
          }
        } catch {
          cleanup();
        }
      }, 300);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          try {
            if (!popupWindow || popupWindow.closed) {
              cleanup();
            }
          } catch {
            cleanup();
          }
        }, 300);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // 5-second safety timeout if user closed popup and browser blocked all events
    const safetyTimer = setTimeout(() => {
      if (!auth.currentUser) {
        cleanup();
      }
    }, 5000);

    try {
      const provider = new GoogleAuthProvider();
      // Forces Google to always show the Account Chooser dialog ("계정 선택 / 다른 계정 사용")
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Google sign-in was closed or cancelled:", error?.code || error?.message);
    } finally {
      clearTimeout(safetyTimer);
      cleanup();
    }
  };

  const handleLogin = () => {
    signInWithGoogle();
  };

  const handleSwitchAccount = async () => {
    cancelLogin();
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      await signInWithGoogle();
    } catch (error: any) {
      console.warn("Account switch cancelled:", error?.code || error?.message);
      cancelLogin();
    }
  };

  const handleLogout = async () => {
    cancelLogin();
    setUser(null);
    setIsAdmin(false);
    setCheckingAdmin(false);
    setIsLoggingIn(false);
    await signOut(auth);
  };

  const copyMyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
        <p className="text-xs text-brand-sub font-light tracking-wide">
          관리자 권한을 확인하고 있습니다...
        </p>
        <button 
          type="button" 
          onClick={() => { setCheckingAdmin(false); setAuthLoading(false); setIsLoggingIn(false); }}
          className="text-[11px] text-brand-muted hover:text-brand-primary underline mt-2"
        >
          화면이 멈춘 경우 로그인 창으로 돌아가기
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 sm:px-12 py-32">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 sm:p-12 rounded-xl border border-brand-border shadow-xl text-center"
        >
          <div className="w-16 h-16 bg-brand-bg text-brand-accent rounded-full flex items-center justify-center mx-auto mb-8 border border-brand-border">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-4 text-brand-primary">관리자 로그인</h2>
          <p className="text-brand-sub mb-8 font-light leading-relaxed text-sm">
            교회 관리자 권한이 있는 구글 계정으로 <br /> 로그인해 주세요.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full bg-white border border-brand-border py-4 rounded-full flex items-center justify-center gap-3 text-brand-primary font-bold text-[11px] uppercase tracking-widest hover:bg-brand-bg transition-all shadow-sm"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-brand-accent shrink-0" />
                <span>구글 로그인 연결 중... (클릭 시 재시도)</span>
              </>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 shrink-0" alt="Google" />
                <span>구글 계정으로 로그인 (계정 선택)</span>
              </>
            )}
          </button>

          {isLoggingIn && (
            <div className="mt-3 text-center">
              <button 
                type="button" 
                onClick={cancelLogin}
                className="text-xs text-red-600 hover:text-red-700 font-medium underline py-1"
              >
                ✕ 로그인 취소하고 초기화
              </button>
            </div>
          )}

          <div className="mt-8 p-4 bg-brand-bg rounded-lg border border-brand-border text-left space-y-1.5 text-xs text-brand-sub leading-relaxed font-light">
            <p className="font-semibold text-brand-primary">새 관리자 등록 방법:</p>
            <p>1. 기존 관리자(대표 관리자)로 로그인하신 후</p>
            <p>2. <strong>[관리자 계정 관리]</strong> 메뉴에서 새 관리자의 구글 이메일을 등록해 주세요.</p>
            <p>3. 등록 후 새 관리자분이 위 버튼을 눌러 로그인하시면 즉시 관리자 권한이 활성화됩니다.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 sm:px-12 py-32 text-center">
        <div className="bg-[#F2F0EB] text-brand-primary p-8 rounded-xl border border-brand-border mb-6 font-light italic">
          죄송합니다. 관리자 권한이 등록되지 않은 계정입니다. <br/> ({user.email})
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-brand-border mb-8 text-left space-y-3 shadow-xs">
          <p className="text-[11px] font-bold text-brand-primary uppercase tracking-wider">
            새 관리자 등록 방법
          </p>
          <p className="text-[12px] text-brand-sub leading-relaxed">
            기존 관리자에게 본인의 이메일(<strong>{user.email}</strong>)을 전달하여, 
            관리자 대시보드의 <strong>[관리자 계정 관리]</strong>에서 등록을 요청해 주세요. 등록 즉시 관리자로 로그인하실 수 있습니다.
          </p>
          <div className="pt-2 border-t border-brand-border flex items-center justify-between text-xs text-brand-muted">
            <span>계정 식별자 (UID):</span>
            <button 
              onClick={copyMyUid}
              className="flex items-center gap-1 text-[11px] text-brand-accent hover:underline font-mono"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedUid ? '복사됨' : 'UID 복사'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            onClick={handleSwitchAccount} 
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-primary text-white rounded-full font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-all"
          >
            다른 구글 계정으로 로그인
          </button>
          <button 
            onClick={handleLogout} 
            className="w-full sm:w-auto px-6 py-2.5 border border-brand-border rounded-full text-brand-muted hover:text-brand-accent font-bold text-[11px] uppercase tracking-widest transition-all"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-16 sm:py-24">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8 mb-10 pb-8 border-b border-brand-border">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif italic text-brand-primary tracking-tight mb-2">관리자 대시보드</h2>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-brand-sub font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" /> 
            SIGNED IN AS: <span className="text-brand-primary lowercase font-mono">{user.email}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'admins'
                ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
                : 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>새 관리자 등록</span>
          </button>
          <button 
            onClick={handleSwitchAccount} 
            title="다른 구글 계정으로 다시 로그인하여 계정을 전환합니다"
            className="flex items-center gap-1.5 px-4 py-2 border border-brand-border rounded-full text-[11px] font-bold uppercase tracking-wider text-brand-sub hover:text-brand-primary hover:border-brand-primary transition-all bg-white"
          >
            <Users className="w-3.5 h-3.5" />
            <span>계정 전환</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1.5 px-4 py-2 border border-brand-border rounded-full text-[11px] font-bold uppercase tracking-wider text-brand-sub hover:text-brand-primary hover:border-brand-primary transition-all bg-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border mb-12 gap-6 sm:gap-12 overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveTab('sermons')}
          className={`pb-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'sermons' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-sub hover:text-brand-primary'}`}
        >
          설교 영상 관리
        </button>
        <button 
          onClick={() => setActiveTab('bulletins')}
          className={`pb-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'bulletins' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-sub hover:text-brand-primary'}`}
        >
          주보 파일 관리
        </button>
        <button 
          onClick={() => setActiveTab('photos')}
          className={`pb-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'photos' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-sub hover:text-brand-primary'}`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>교회 사진 관리</span>
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          className={`pb-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'admins' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-sub hover:text-brand-primary'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>관리자 계정 관리</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
        >
          {activeTab === 'bulletins' ? (
            <BulletinManager />
          ) : activeTab === 'sermons' ? (
            <SermonManager />
          ) : activeTab === 'photos' ? (
            <PhotoManager isAdmin={isAdmin} />
          ) : (
            <AdminManager currentUser={user} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BulletinManager() {
  const [items, setItems] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete & Selection states
  const [deleteTarget, setDeleteTarget] = useState<Bulletin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Edit states
  const [editingItem, setEditingItem] = useState<Bulletin | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', date: '', fileUrl: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (item: Bulletin) => {
    setEditingItem(item);
    setEditFormData({
      title: item.title,
      date: item.date,
      fileUrl: item.fileUrl
    });
    setErrorMsg(null);
  };

  const handleUpdateBulletin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    setErrorMsg(null);
    const path = `bulletins/${editingItem.id}`;
    try {
      await updateDoc(doc(db, 'bulletins', editingItem.id), {
        title: editFormData.title.trim(),
        date: editFormData.date,
        fileUrl: editFormData.fileUrl.trim(),
        updatedAt: Date.now()
      });
      const updatedTitle = editFormData.title.trim();
      setEditingItem(null);
      setSuccessMsg(`"${updatedTitle}" 주보가 성공적으로 수정되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`주보 수정 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'bulletins'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bulletin)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bulletins');
    });
    return unsub;
  }, []);

  const addBulletin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);
    const path = 'bulletins';
    try {
      await addDoc(collection(db, path), {
        title: fd.get('title'),
        date: fd.get('date'),
        fileUrl: fd.get('fileUrl'),
        createdAt: Date.now()
      });
      setShowForm(false);
      formRef.current?.reset();
      setCurrentPage(1);
      setSuccessMsg('주보가 성공적으로 등록되었습니다.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`주보 등록 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg(null);
    const path = `bulletins/${deleteTarget.id}`;
    try {
      await deleteDoc(doc(db, 'bulletins', deleteTarget.id));
      const deletedTitle = deleteTarget.title;
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMsg(`"${deletedTitle}" 주보가 성공적으로 삭제되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`삭제 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setDeleting(false);
    }
  };

  // Batch Delete
  const confirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      const deletePromises = selectedIds.map(id => deleteDoc(doc(db, 'bulletins', id)));
      await Promise.all(deletePromises);
      const count = selectedIds.length;
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
      setSuccessMsg(`선택하신 ${count}개의 주보가 모두 성공적으로 삭제되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(`일괄 삭제 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.DELETE, 'bulletins');
    } finally {
      setDeleting(false);
    }
  };

  // Multi-select toggle
  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-serif italic text-brand-primary tracking-tight">주보 목록</h3>
          <p className="text-[11px] text-brand-sub mt-1">등록된 주보 PDF/문서 링크를 관리하고 수정하거나 선택하여 삭제할 수 있습니다.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setErrorMsg(null); }}
          className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-brand-primary/10"
        >
          {showForm ? 'CANCEL' : <><Plus className="w-4 h-4" /> ADD BULLETIN</>}
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form 
            ref={formRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={addBulletin}
            className="bg-white p-8 sm:p-10 rounded-xl border border-brand-border grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden shadow-inner"
          >
            <div className="col-span-full font-serif text-brand-accent italic mb-2">새 주보 등록</div>
            <div className="col-span-full">
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">주보 제목</label>
              <input name="title" required placeholder="예: 2026년 5월 10일 주보" className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">날짜</label>
              <input name="date" type="date" required className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">파일 링크 (PDF 또는 구글 드라이브)</label>
              <input name="fileUrl" required placeholder="https://drive.google.com/..." className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" />
            </div>
            <div className="col-span-full flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => formRef.current?.reset()}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-sm border border-brand-border text-[11px] font-bold uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>입력 내용 지우기</span>
              </button>
              <button 
                disabled={submitting}
                className="bg-brand-accent text-white px-10 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:bg-[#8e7557] transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Batch Selection & Action Toolbar */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-brand-border rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-brand-primary hover:text-brand-accent font-medium transition-colors"
            >
              {selectedIds.length === items.length ? (
                <CheckSquare className="w-4 h-4 text-brand-accent" />
              ) : (
                <Square className="w-4 h-4 text-brand-sub" />
              )}
              <span>{selectedIds.length === items.length ? '전체 해제' : '전체 선택'}</span>
            </button>
            <span className="text-xs text-brand-sub">
              총 {items.length}개 중 <strong className="text-brand-primary font-semibold">{selectedIds.length}</strong>개 선택됨
            </span>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs text-brand-sub hover:text-brand-primary transition-colors"
              >
                선택 취소
              </button>
              <button
                onClick={() => setShowBatchDeleteModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>선택 항목 지우기 ({selectedIds.length}개)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulletins List */}
      <div className="bg-white border border-brand-border rounded-xl overflow-hidden divide-y divide-brand-border shadow-sm">
        {loading ? (
          <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand-accent" /></div>
        ) : (
          currentItems.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div 
                key={item.id} 
                className={`p-6 sm:p-8 flex items-center justify-between transition-all group ${
                  isSelected ? 'bg-brand-bg/90' : 'hover:bg-brand-bg/40'
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                  {/* Item Checkbox */}
                  <button
                    onClick={() => toggleSelectItem(item.id)}
                    className="text-brand-sub hover:text-brand-accent shrink-0 transition-colors p-1"
                    title={isSelected ? '선택 해제' : '선택'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-accent" />
                    ) : (
                      <Square className="w-4 h-4 text-brand-sub" />
                    )}
                  </button>

                  <div className="w-10 h-10 bg-brand-bg border border-brand-border flex items-center justify-center rounded text-brand-sub group-hover:text-brand-accent shrink-0 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-brand-primary group-hover:text-brand-accent transition-colors italic truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-brand-sub font-medium">
                      <span>{item.date}</span>
                      {item.fileUrl && (
                        <>
                          <span className="text-brand-border">•</span>
                          <a 
                            href={item.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-accent hover:underline flex items-center gap-1"
                          >
                            <span>파일 열기</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => startEdit(item)} 
                    title="이 주보 수정"
                    className="flex items-center gap-1.5 px-3 py-2 text-brand-sub hover:text-brand-accent hover:bg-brand-bg rounded-lg border border-brand-border/80 hover:border-brand-accent/50 transition-all text-xs font-semibold"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>
                  <button 
                    onClick={() => setDeleteTarget(item)} 
                    title="이 주보 지우기"
                    className="flex items-center gap-1.5 px-3 py-2 text-brand-sub hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>지우기</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
        {!loading && items.length === 0 && (
          <div className="p-20 text-center text-brand-sub font-light italic">
            등록된 주보가 없습니다.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={`w-9 h-9 rounded-full border border-brand-border text-[11px] font-bold transition-all ${
                currentPage === num 
                  ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20' 
                  : 'bg-white text-brand-sub hover:border-brand-accent hover:text-brand-accent'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      )}

      {/* Single Item Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-brand-border text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-serif italic text-brand-primary font-bold">주보 지우기 (삭제)</h4>
                <p className="text-xs text-brand-sub mt-2">
                  정말로 <strong className="text-brand-primary">"{deleteTarget.title}"</strong> 주보를 지우시겠습니까?
                </p>
                <p className="text-[11px] text-red-600 mt-1">삭제된 주보는 복구할 수 없습니다.</p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-6 py-2.5 rounded-lg border border-brand-border text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>지우기 확인</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {showBatchDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-brand-border text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-serif italic text-brand-primary font-bold">
                  선택한 주보 일괄 지우기
                </h4>
                <p className="text-xs text-brand-sub">
                  선택하신 <strong className="text-red-600 font-bold">{selectedIds.length}개</strong>의 주보를 모두 지우시겠습니까?
                </p>
                <p className="text-[11.5px] text-red-600 font-medium pt-1">
                  지워진 주보 파일들은 데이터베이스에서 영구 삭제되며 복구할 수 없습니다.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="px-6 py-2.5 rounded-lg border border-brand-border text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmBatchDelete}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>선택 항목 모두 지우기</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Bulletin Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-brand-border space-y-6"
            >
              <div className="flex justify-between items-start pb-4 border-b border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-serif italic text-brand-primary font-bold">주보 정보 수정</h4>
                    <p className="text-xs text-brand-sub mt-0.5">등록된 주보 정보를 변경하고 저장합니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-brand-sub hover:text-brand-primary rounded-md transition-colors"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateBulletin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                    주보 제목 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    required 
                    placeholder="예: 2026년 5월 10일 주보" 
                    className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                    발행 날짜 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                    required 
                    className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                    파일 링크 (PDF 또는 구글 드라이브) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={editFormData.fileUrl}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    required 
                    placeholder="https://drive.google.com/..." 
                    className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-brand-border">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setEditingItem(null)}
                    className="px-5 py-2.5 rounded-lg border border-brand-border text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-accent text-white text-xs font-bold hover:bg-[#8e7557] transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>수정 저장하기</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SermonManager() {
  const [items, setItems] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<Sermon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Edit states
  const [editingItem, setEditingItem] = useState<Sermon | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', date: '', speaker: '', videoUrl: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (item: Sermon) => {
    setEditingItem(item);
    setEditFormData({
      title: item.title,
      date: item.date,
      speaker: item.speaker,
      videoUrl: item.videoUrl
    });
    setErrorMsg(null);
  };

  const handleUpdateSermon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    setErrorMsg(null);
    const path = `sermons/${editingItem.id}`;
    try {
      await updateDoc(doc(db, 'sermons', editingItem.id), {
        title: editFormData.title.trim(),
        date: editFormData.date,
        speaker: editFormData.speaker.trim(),
        videoUrl: editFormData.videoUrl.trim(),
        updatedAt: Date.now()
      });
      const updatedTitle = editFormData.title.trim();
      setEditingItem(null);
      setSuccessMsg(`설교 영상 "${updatedTitle}"이(가) 성공적으로 수정되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(`설교 수정 중 오류가 발생했습니다: ${err.message || ''}`);
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sermons'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sermon)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sermons');
    });
    return unsub;
  }, []);

  const addSermon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);
    const path = 'sermons';
    try {
      await addDoc(collection(db, path), {
        title: fd.get('title'),
        date: fd.get('date'),
        videoUrl: fd.get('videoUrl'),
        speaker: fd.get('speaker'),
        createdAt: Date.now()
      });
      setShowForm(false);
      formRef.current?.reset();
      setCurrentPage(1);
      setSuccessMsg('새 설교 영상이 등록되었습니다.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`설교 등록 중 오류가 발생했습니다: ${err.message || ''}`);
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSubmitting(false);
    }
  };

  // Single Item Delete
  const confirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg(null);
    const path = `sermons/${deleteTarget.id}`;
    try {
      await deleteDoc(doc(db, 'sermons', deleteTarget.id));
      const deletedTitle = deleteTarget.title;
      // Also remove from selectedIds if present
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMsg(`설교 영상 "${deletedTitle}"이(가) 삭제되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(`삭제 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setDeleting(false);
    }
  };

  // Batch Delete
  const confirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      const deletePromises = selectedIds.map(id => deleteDoc(doc(db, 'sermons', id)));
      await Promise.all(deletePromises);
      const count = selectedIds.length;
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
      setSuccessMsg(`선택하신 ${count}개의 설교 영상이 모두 지워졌습니다.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(`일괄 삭제 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.DELETE, 'sermons');
    } finally {
      setDeleting(false);
    }
  };

  // Multi-select toggle
  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  // Clear form inputs
  const handleClearForm = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-serif italic text-brand-primary tracking-tight">설교 영상 목록</h3>
          <p className="text-[11px] text-brand-sub mt-1">
            등록된 설교 영상의 정보 및 재생 링크를 수정하고 필요 없는 영상을 지웁니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setShowForm(!showForm); setErrorMsg(null); }}
            className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-brand-primary/10"
          >
            {showForm ? 'CANCEL' : <><Plus className="w-4 h-4" /> ADD SERMON</>}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Sermon Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form 
            ref={formRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={addSermon}
            className="bg-white p-8 sm:p-10 rounded-xl border border-brand-border grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 overflow-hidden shadow-inner"
          >
            <div className="col-span-full flex justify-between items-center pb-2 border-b border-brand-border">
              <span className="font-serif text-brand-accent italic text-base">새 설교 등록</span>
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-1.5 text-[11px] text-brand-sub hover:text-brand-primary font-bold uppercase tracking-wider transition-colors"
                title="입력된 내용 모두 지우기"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>내용 지우기 (초기화)</span>
              </button>
            </div>

            <div className="col-span-full">
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">
                설교 제목 <span className="text-red-500">*</span>
              </label>
              <input 
                name="title" 
                required 
                placeholder="예: 성경적 제자의 삶" 
                className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">
                날짜 <span className="text-red-500">*</span>
              </label>
              <input 
                name="date" 
                type="date" 
                required 
                className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">
                설교자 <span className="text-red-500">*</span>
              </label>
              <input 
                name="speaker" 
                required 
                placeholder="예: 이치형 목사" 
                className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" 
              />
            </div>

            <div className="col-span-full">
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">
                유튜브 영상 링크 <span className="text-red-500">*</span>
              </label>
              <input 
                name="videoUrl" 
                required 
                placeholder="예: https://www.youtube.com/watch?v=..." 
                className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light" 
              />
            </div>

            <div className="col-span-full flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-sm border border-brand-border text-[11px] font-bold uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>입력내용 지우기</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-sm border border-brand-border text-[11px] font-bold uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
              >
                닫기
              </button>
              <button 
                disabled={submitting}
                className="bg-brand-accent text-white px-10 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:bg-[#8e7557] transition-colors shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Batch Selection & Action Toolbar */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-brand-border rounded-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-brand-primary hover:text-brand-accent font-medium transition-colors"
            >
              {selectedIds.length === items.length ? (
                <CheckSquare className="w-4 h-4 text-brand-accent" />
              ) : (
                <Square className="w-4 h-4 text-brand-sub" />
              )}
              <span>{selectedIds.length === items.length ? '전체 해제' : '전체 선택'}</span>
            </button>
            <span className="text-xs text-brand-sub">
              총 {items.length}개 중 <strong className="text-brand-primary">{selectedIds.length}</strong>개 선택됨
            </span>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs text-brand-sub hover:text-brand-primary transition-colors"
              >
                선택 취소
              </button>
              <button
                onClick={() => setShowBatchDeleteModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>선택 항목 지우기 ({selectedIds.length}개)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sermons List */}
      <div className="bg-white border border-brand-border rounded-xl overflow-hidden divide-y divide-brand-border shadow-sm">
        {loading ? (
          <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand-accent" /></div>
        ) : (
          currentItems.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div 
                key={item.id} 
                className={`p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group ${
                  isSelected ? 'bg-brand-bg/90' : 'hover:bg-brand-bg/40'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                  {/* Item Checkbox */}
                  <button
                    onClick={() => toggleSelectItem(item.id)}
                    className="mt-1 sm:mt-0 text-brand-sub hover:text-brand-accent shrink-0 transition-colors p-1"
                    title={isSelected ? '선택 해제' : '선택'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-accent" />
                    ) : (
                      <Square className="w-4 h-4 text-brand-sub" />
                    )}
                  </button>

                  <div className="w-12 h-10 bg-brand-bg border border-brand-border flex items-center justify-center rounded text-brand-sub group-hover:text-brand-accent shrink-0 shadow-xs">
                    <Video className="w-4 h-4" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <p className="font-serif text-lg text-brand-primary group-hover:text-brand-accent transition-colors italic leading-snug break-words">
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-brand-sub font-medium">
                      <span>{item.date}</span>
                      <span className="text-brand-border">•</span>
                      <span className="text-brand-accent font-semibold">{item.speaker}</span>
                      {item.videoUrl && (
                        <>
                          <span className="text-brand-border">•</span>
                          <a 
                            href={item.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-sub hover:text-brand-accent underline truncate max-w-[200px]"
                          >
                            영상 보기
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Edit (수정) and Single Delete (지우기) Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button 
                    onClick={() => startEdit(item)} 
                    title="이 설교 영상 수정"
                    className="flex items-center gap-1.5 px-3 py-2 text-brand-sub hover:text-brand-accent hover:bg-brand-bg rounded-lg border border-brand-border/80 hover:border-brand-accent/50 transition-all text-xs font-semibold"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>
                  <button 
                    onClick={() => setDeleteTarget(item)} 
                    title="이 설교 영상 지우기"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-brand-sub hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4 text-brand-sub group-hover:text-red-500" />
                    <span>지우기</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
        {!loading && items.length === 0 && (
          <div className="p-20 text-center text-brand-sub font-light italic">
            등록된 설교 영상이 없습니다.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
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

      {/* Single Item Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-brand-border text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-serif italic text-brand-primary font-bold">
                  설교 영상을 지우시겠습니까?
                </h4>
                <div className="p-3 bg-brand-bg rounded-lg border border-brand-border text-left text-xs space-y-1">
                  <p className="font-semibold text-brand-primary italic">"{deleteTarget.title}"</p>
                  <p className="text-brand-sub text-[11px]">설교자: {deleteTarget.speaker} | 날짜: {deleteTarget.date}</p>
                </div>
                <p className="text-[11.5px] text-red-600 font-medium pt-1">
                  지워진 설교 영상은 데이터베이스에서 영구 삭제되며 복구할 수 없습니다.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-6 py-2.5 rounded-lg border border-brand-border text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmSingleDelete}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>지우기 확인</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {showBatchDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-brand-border text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-serif italic text-brand-primary font-bold">
                  선택한 설교 영상 일괄 지우기
                </h4>
                <p className="text-xs text-brand-sub">
                  선택하신 <strong className="text-red-600 font-bold">{selectedIds.length}개</strong>의 설교 영상을 모두 지우시겠습니까?
                </p>
                <p className="text-[11.5px] text-red-600 font-medium pt-1">
                  지워진 영상들은 데이터베이스에서 영구 삭제되며 복구할 수 없습니다.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="px-6 py-2.5 rounded-lg border border-brand-border text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmBatchDelete}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>선택 항목 모두 지우기</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Sermon Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-brand-border space-y-6"
            >
              <div className="flex justify-between items-start pb-4 border-b border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-serif italic text-brand-primary font-bold">설교 영상 수정</h4>
                    <p className="text-xs text-brand-sub mt-0.5">등록된 설교 영상 정보를 수정하고 저장합니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-brand-sub hover:text-brand-primary rounded-md transition-colors"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateSermon} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                    설교 제목 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    required 
                    placeholder="예: 성경적 제자의 삶" 
                    className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                      설교 날짜 <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                      required 
                      className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                      설교자 <span className="text-red-500">*</span>
                    </label>
                    <input 
                      value={editFormData.speaker}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, speaker: e.target.value }))}
                      required 
                      placeholder="예: 이치형 목사" 
                      className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-1.5">
                    유튜브 영상 링크 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={editFormData.videoUrl}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                    required 
                    placeholder="예: https://www.youtube.com/watch?v=..." 
                    className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-brand-border">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setEditingItem(null)}
                    className="px-5 py-2.5 rounded-lg border border-brand-border text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-accent text-white text-xs font-bold hover:bg-[#8e7557] transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>수정 저장하기</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminManager({ currentUser }: { currentUser: User }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete admin states
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<AdminUser, 'id'>)
      }));
      setAdmins(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admins');
    });
    return unsub;
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string)?.trim().toLowerCase();
    const name = (fd.get('name') as string)?.trim();
    const customUid = (fd.get('uid') as string)?.trim();

    if (!email || !email.includes('@')) {
      setErrorMsg('올바른 구글 이메일 주소를 입력해 주세요.');
      setSubmitting(false);
      return;
    }

    // Target doc ID: customUid if provided, otherwise the email address!
    const targetDocId = customUid || email;
    const path = `admins/${targetDocId}`;
    try {
      await setDoc(doc(db, 'admins', targetDocId), {
        email,
        name: name || '교회 관리자',
        createdAt: Date.now(),
        addedBy: currentUser.email || 'Admin',
        ...(customUid ? { uid: customUid } : {})
      });
      setSuccessMsg(`"${email}" 계정이 새 관리자로 등록되었습니다. 해당 계정으로 구글 로그인하시면 즉시 관리자 권한이 적용됩니다.`);
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(`관리자 등록 실패: ${err.message || '오류가 발생했습니다.'}`);
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (admin: AdminUser) => {
    setErrorMsg(null);
    const isCurrentUser = admin.id === currentUser.uid || 
      (!!currentUser.email && !!admin.email && admin.email.toLowerCase() === currentUser.email.toLowerCase());

    if (isCurrentUser) {
      setErrorMsg('현재 로그인된 본인 계정은 권한을 삭제할 수 없습니다.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    if (admins.length <= 1) {
      setErrorMsg('최소 1명 이상의 관리자가 유지되어야 하므로 삭제할 수 없습니다.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    setDeleteTarget(admin);
  };

  const confirmDeleteAdmin = async () => {
    if (!deleteTarget) return;

    const isCurrentUser = deleteTarget.id === currentUser.uid || 
      (!!currentUser.email && !!deleteTarget.email && deleteTarget.email.toLowerCase() === currentUser.email.toLowerCase());

    if (isCurrentUser) {
      setErrorMsg('현재 로그인된 본인 계정은 삭제할 수 없습니다.');
      setDeleteTarget(null);
      return;
    }
    if (admins.length <= 1) {
      setErrorMsg('최소 1명 이상의 관리자가 유지되어야 합니다.');
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    setErrorMsg(null);
    const targetEmail = deleteTarget.email;
    const path = `admins/${deleteTarget.id}`;

    try {
      // 1. Primary deletion: document with deleteTarget.id
      await deleteDoc(doc(db, 'admins', deleteTarget.id));

      // 2. Secondary cleanup: if doc exists by email (lowercase) and is different from id
      if (targetEmail && targetEmail.toLowerCase() !== deleteTarget.id.toLowerCase()) {
        try {
          await deleteDoc(doc(db, 'admins', targetEmail.toLowerCase()));
        } catch (_) {
          // May not exist as a separate doc, ignore
        }
      }

      // 3. Secondary cleanup: if doc has custom uid different from id
      const customUid = (deleteTarget as any).uid;
      if (customUid && customUid !== deleteTarget.id) {
        try {
          await deleteDoc(doc(db, 'admins', customUid));
        } catch (_) {
          // May not exist, ignore
        }
      }

      setSuccessMsg(`"${targetEmail}" 계정의 관리자 권한이 성공적으로 삭제되었습니다.`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('관리자 권한 삭제 실패:', err);
      setErrorMsg(`관리자 권한 삭제 실패: ${err.message || '권한이 없거나 오류가 발생했습니다.'}`);
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch (_) {
        // Logged
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-serif italic text-brand-primary tracking-tight">관리자 계정 목록</h3>
          <p className="text-[11px] text-brand-sub mt-1">교회 웹사이트 관리자 권한을 가진 계정들을 관리합니다.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setErrorMsg(null); }}
          className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-brand-primary/10"
        >
          {showForm ? 'CANCEL' : <><Plus className="w-4 h-4" /> ADD ADMIN</>}
        </button>
      </div>

      {/* Helper guide card */}
      <div className="bg-[#F8F7F3] border border-brand-border rounded-xl p-6 flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-brand-accent/15 text-brand-accent flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-brand-muted space-y-1">
          <p className="font-semibold text-brand-primary">새 관리자 등록 방법 안내:</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-sub text-[11.5px]">
            <li>위 <strong className="text-brand-primary">ADD ADMIN</strong> 버튼을 누르고 새 관리자의 <strong>구글 이메일 주소</strong>를 입력하여 등록합니다.</li>
            <li>등록된 관리자분이 상단 <strong className="text-brand-primary">ADMIN LOGIN</strong>에서 본인 구글 계정으로 로그인하면 즉시 관리자 권한이 부여됩니다.</li>
            <li>(복잡한 UID 복사 없이 이메일만으로 간편하게 등록됩니다.)</li>
          </ol>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Add Admin Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAddAdmin}
            className="bg-white p-8 sm:p-10 rounded-xl border border-brand-border grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden shadow-inner"
          >
            <div className="col-span-full font-serif text-brand-accent italic text-base">새 관리자 등록</div>
            
            <div>
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">
                구글 이메일 주소 <span className="text-red-500">*</span>
              </label>
              <input 
                name="email" 
                type="email" 
                required 
                placeholder="예: newadmin@mkdc.org.au 또는 @gmail.com" 
                className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
              />
              <p className="text-[10.5px] text-brand-sub mt-1.5 font-light">
                * 새 관리자로 등록할 분의 구글 계정 이메일을 입력하세요.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-primary uppercase tracking-widest mb-2">
                이름 / 담당 직분 <span className="text-brand-sub font-normal">(선택)</span>
              </label>
              <input 
                name="name" 
                placeholder="예: 김목사님, 미디어팀 간사 등" 
                className="w-full px-4 py-3 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-light text-sm" 
              />
              <p className="text-[10.5px] text-brand-sub mt-1.5 font-light">
                * 관리자 목록에 표시될 이름 또는 직분을 입력하세요.
              </p>
            </div>

            <div className="col-span-full">
              <details className="text-xs text-brand-muted cursor-pointer">
                <summary className="hover:text-brand-primary py-1 font-medium">
                  고급 설정: 구글 고유 식별자(UID) 직접 입력 (선택사항)
                </summary>
                <div className="pt-2">
                  <input 
                    name="uid" 
                    placeholder="UID를 알고 계신 경우에만 입력하세요 (비워두어도 무방합니다)" 
                    className="w-full px-4 py-2.5 rounded bg-brand-bg border border-brand-border focus:border-brand-accent outline-none transition-all font-mono text-xs" 
                  />
                </div>
              </details>
            </div>

            <div className="col-span-full flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-sm border border-brand-border text-[11px] font-bold uppercase tracking-widest text-brand-muted hover:bg-brand-bg transition-colors"
              >
                취소
              </button>
              <button 
                disabled={submitting}
                className="bg-brand-accent text-white px-10 py-3 rounded-sm font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:bg-[#8e7557] transition-colors shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Admin List Cards */}
      <div className="bg-white border border-brand-border rounded-xl overflow-hidden divide-y divide-brand-border shadow-sm">
        {loading ? (
          <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand-accent" /></div>
        ) : (
          admins.map(admin => {
            const isMe = admin.id === currentUser.uid || 
              (!!currentUser.email && !!admin.email && admin.email.toLowerCase() === currentUser.email.toLowerCase());
            return (
              <div key={admin.id} className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-brand-bg/50 transition-all group">
                <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                  <div className="w-11 h-11 bg-brand-bg border border-brand-border flex items-center justify-center rounded-xl text-brand-accent shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-serif text-lg font-semibold text-brand-primary leading-tight">
                        {admin.email}
                      </p>
                      {admin.name && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-bg border border-brand-border text-brand-muted font-medium">
                          {admin.name}
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-brand-accent/15 text-brand-accent font-bold uppercase tracking-wider">
                          내 계정 (현재 접속 중)
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-sub">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] bg-brand-bg px-2 py-0.5 rounded border border-brand-border/70">
                        <span className="text-brand-sub/70">UID:</span>
                        <span className="text-brand-muted font-semibold">{admin.id}</span>
                        <button 
                          onClick={() => copyToClipboard(admin.id, admin.id)}
                          title="UID 복사"
                          className="ml-1 text-brand-sub hover:text-brand-accent p-0.5 transition-colors cursor-pointer"
                        >
                          {copiedId === admin.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {admin.createdAt && (
                        <span className="text-[11px]">
                          등록일: {new Date(admin.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                      {admin.addedBy && (
                        <span className="text-[11px] text-brand-sub/80">
                          (등록자: {admin.addedBy})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  {isMe ? (
                    <span className="text-[11px] text-brand-sub italic px-3 py-1 bg-brand-bg rounded border border-brand-border/60">
                      삭제 불가 (본인)
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleDeleteClick(admin)} 
                      title="관리자 권한 삭제"
                      className="flex items-center gap-1.5 px-3.5 py-2 text-brand-sub hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>권한 삭제</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {!loading && admins.length === 0 && (
          <div className="p-20 text-center text-brand-sub font-light italic">
            등록된 관리자 목록이 없습니다.
          </div>
        )}
      </div>

      {/* Delete Admin Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-brand-border space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-lg font-serif italic text-brand-primary font-bold">관리자 권한 삭제</h4>
                <p className="text-sm text-brand-sub">
                  정말로 <strong className="text-brand-primary font-semibold">"{deleteTarget.email}"</strong> 계정의 관리자 권한을 삭제하시겠습니까?
                </p>
                {deleteTarget.name && (
                  <p className="text-xs text-brand-muted">
                    담당자: {deleteTarget.name}
                  </p>
                )}
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-left mt-3 leading-relaxed">
                  ⚠️ <strong>주의:</strong> 삭제 즉시 해당 계정은 관리자 페이지에 접근하거나 설교/주보를 수정할 수 없게 됩니다.
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded border border-brand-border text-xs font-bold uppercase tracking-wider text-brand-sub hover:bg-brand-bg transition-all cursor-pointer"
                >
                  취소
                </button>
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={confirmDeleteAdmin}
                  className="flex-1 px-4 py-2.5 rounded bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : '권한 삭제 확인'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhotoManager({ isAdmin }: { isAdmin: boolean }) {
  const [photos, setPhotos] = useState<ChurchPhotos>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const staffInputRef = useRef<HTMLInputElement>(null);
  const pastorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToChurchPhotos((latest) => {
      setPhotos(latest);
    });
    return () => unsub();
  }, []);

  const handleUpload = async (key: 'heroPhoto' | 'staffPhoto' | 'pastorPhoto', file: File) => {
    if (!isAdmin) {
      setErrorMessage("사진 변경은 교회 관리자만 가능합니다.");
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMessage("이미지 파일(JPEG, PNG, WebP)만 등록 가능합니다.");
      return;
    }

    try {
      setLoadingKey(key);
      setErrorMessage(null);
      const dataUrl = await compressAndProcessImage(file);
      await saveChurchPhoto(key, dataUrl, isAdmin);
      setSuccessMessage("사진이 성공적으로 업데이트되었습니다. 사이트에 즉시 반영됩니다.");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("사진 저장 중 오류가 발생했습니다.");
    } finally {
      setLoadingKey(null);
    }
  };

  const handleReset = async (key: 'heroPhoto' | 'staffPhoto' | 'pastorPhoto') => {
    if (!isAdmin) return;
    try {
      setLoadingKey(key);
      setErrorMessage(null);
      await resetChurchPhoto(key, isAdmin);
      setSuccessMessage("기본 사진으로 초기화되었습니다.");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("사진 초기화 중 오류가 발생했습니다.");
    } finally {
      setLoadingKey(null);
    }
  };

  const photoCards = [
    {
      id: 'heroPhoto' as const,
      title: '메인 홈페이지 심볼 / 로고',
      description: '홈페이지 최상단 대표 비주얼 영역에 표시되는 교회 공식 심볼 이미지입니다.',
      pageName: '홈페이지 메인 (Hero)',
      pageLink: '/',
      currentSrc: photos.heroPhoto || '/church_logo_green.svg',
      fallbackSrc: '/church_logo_green.png',
      hasCustom: !!photos.heroPhoto,
      inputRef: heroInputRef,
      aspect: 'aspect-square max-w-[200px]',
      bg: 'bg-[#A5BC73]',
    },
    {
      id: 'staffPhoto' as const,
      title: '사역자 및 섬김이 단체 사진',
      description: '교회소개 페이지의 공동체 비전 상단에 표시되는 사역자/섬김이 단체 사진입니다.',
      pageName: '교회소개 페이지',
      pageLink: '/about',
      currentSrc: photos.staffPhoto || staffPhotoDefault,
      fallbackSrc: '/church_staff.jpg',
      hasCustom: !!photos.staffPhoto,
      inputRef: staffInputRef,
      aspect: 'aspect-[16/9] max-w-[280px]',
      bg: 'bg-brand-bg',
    },
    {
      id: 'pastorPhoto' as const,
      title: '담임목사 프로필 사진',
      description: '교회소개 페이지 목회비전 섹션의 담임목사 소개에 표시되는 프로필 사진입니다.',
      pageName: '교회소개 페이지',
      pageLink: '/about',
      currentSrc: photos.pastorPhoto || pastorPhotoDefault,
      fallbackSrc: '/pastor.jpg',
      hasCustom: !!photos.pastorPhoto,
      inputRef: pastorInputRef,
      aspect: 'aspect-[3/4] max-w-[180px]',
      bg: 'bg-brand-bg',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Admin Notice */}
      <div className="bg-[#FAF8F5] border border-brand-accent/30 rounded-2xl p-5 sm:p-6 shadow-sm flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-primary text-brand-accent flex items-center justify-center shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs sm:text-sm text-brand-sub leading-relaxed">
          <p className="font-bold text-brand-primary text-sm sm:text-base mb-1">
            사진 변경 보안 및 관리 안내
          </p>
          <p>
            사진 변경 기능은 <strong className="text-brand-primary">오직 교회 관리자</strong>만 권한이 부여되어 있습니다. 
            일반 방문자에게는 사진 변경 버튼이 전혀 노출되지 않으며, 관리자 로그인 상태에서는 여기 관리자 페이지뿐만 아니라 
            <strong> 홈페이지 메인</strong> 및 <strong>교회소개</strong> 페이지에서도 사진 우측 상단의 <strong>[사진 변경]</strong> 버튼이나 드래그 앤 드롭으로 언제든 편리하게 교체하실 수 있습니다.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Photo Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {photoCards.map((card) => (
          <div 
            key={card.id} 
            className="bg-white border border-brand-border rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border">
                <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block">
                  {card.pageName}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${card.hasCustom ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-brand-bg text-brand-muted border-brand-border'}`}>
                  {card.hasCustom ? '맞춤 등록 사진' : '기본 사진 사용 중'}
                </span>
              </div>

              <h3 className="font-serif font-bold text-lg text-brand-primary mb-2">
                {card.title}
              </h3>
              <p className="text-xs text-brand-muted font-light mb-6 leading-relaxed">
                {card.description}
              </p>

              {/* Photo Preview Container */}
              <div className="flex justify-center mb-6">
                <div className={`w-full ${card.aspect} ${card.bg} rounded-2xl overflow-hidden shadow-md border border-brand-border relative flex items-center justify-center group`}>
                  <img 
                    src={card.currentSrc} 
                    alt={card.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = card.fallbackSrc;
                    }}
                  />
                  {loadingKey === card.id && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-brand-border">
              <input 
                ref={card.inputRef}
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(card.id, file);
                }}
                className="hidden" 
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loadingKey === card.id}
                  onClick={() => card.inputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-brand-primary hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5 text-brand-accent" />
                  <span>사진 변경</span>
                </button>

                {card.hasCustom && (
                  <button
                    type="button"
                    disabled={loadingKey === card.id}
                    onClick={() => handleReset(card.id)}
                    title="기본 사진으로 되돌리기"
                    className="py-2.5 px-3 rounded-lg border border-brand-border hover:bg-brand-bg text-brand-sub text-xs font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>초기화</span>
                  </button>
                )}
              </div>

              <a
                href={card.pageLink}
                className="inline-flex items-center justify-center w-full py-1.5 text-[11px] text-brand-sub hover:text-brand-accent transition-colors gap-1"
              >
                <span>{card.pageName}에서 실시간 확인</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

