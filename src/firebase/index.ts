'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // In Vercel/Standard environments, we always want to use our explicit config.
      // We only skip it if we're specifically told we're in a Firebase App Hosting environment.
      if (process.env.FIREBASE_APP_HOSTING === "1") {
        firebaseApp = initializeApp();
      } else {
        firebaseApp = initializeApp(firebaseConfig);
      }
    } catch (e) {
      console.warn('Firebase initialization warning:', e);
      // Last resort fallback
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// Helper to obtain a Firestore instance in both client and server contexts.
export function getDb() {
  if (!getApps().length) {
    initializeFirebase();
  }
  return getFirestore(getApp());
}

// Backwards-compatible named export used across the codebase
export const db = getDb();

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
