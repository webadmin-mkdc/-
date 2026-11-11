import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

// Global cached state so multiple components don't re-query Firestore repeatedly
let cachedState: AdminAuthState = {
  user: auth.currentUser,
  isAdmin: false,
  loading: true,
};

const listeners = new Set<(state: AdminAuthState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener(cachedState));
}

let isInitialized = false;

function initAuthListener() {
  if (isInitialized) return;
  isInitialized = true;

  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      cachedState = {
        user: null,
        isAdmin: false,
        loading: false,
      };
      notifyListeners();
      return;
    }

    try {
      const userEmail = u.email ? u.email.toLowerCase() : '';
      const isRootAdmin = userEmail === 'webadmin@mkdc.org.au';

      // Check UID
      const adminDocByUid = await getDoc(doc(db, 'admins', u.uid));
      let hasAdminDoc = adminDocByUid.exists();

      // Check Email doc
      let adminDocByEmail = null;
      if (!hasAdminDoc && userEmail) {
        adminDocByEmail = await getDoc(doc(db, 'admins', userEmail));
        if (adminDocByEmail.exists()) {
          hasAdminDoc = true;
        }
      }

      const userIsAdmin = hasAdminDoc || isRootAdmin;

      // Auto-provision doc by UID if validated
      if (userIsAdmin && !adminDocByUid.exists()) {
        try {
          const prevData = adminDocByEmail?.data();
          await setDoc(doc(db, 'admins', u.uid), {
            email: userEmail,
            name: prevData?.name || (isRootAdmin ? '대표 관리자 (웹마스터)' : '교회 관리자'),
            createdAt: prevData?.createdAt || Date.now(),
            addedBy: prevData?.addedBy || '시스템 초기화',
            uid: u.uid,
          });
        } catch (seedErr) {
          console.error("Auto-provisioning admin doc failed in auth listener", seedErr);
        }
      }

      cachedState = {
        user: u,
        isAdmin: userIsAdmin,
        loading: false,
      };
      notifyListeners();
    } catch (err) {
      console.error("Admin verification failed in auth listener", err);
      cachedState = {
        user: u,
        isAdmin: u.email?.toLowerCase() === 'webadmin@mkdc.org.au',
        loading: false,
      };
      notifyListeners();
    }
  });
}

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>(cachedState);

  useEffect(() => {
    initAuthListener();
    setState(cachedState);

    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
