import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// A persistent per-browser ID (survives refreshes/tabs) used to count
// "unique visitors" vs total page views. Stored in localStorage since
// this is real app code running in the user's browser, not a sandboxed
// preview widget.
const VISITOR_KEY = 'levelupbrew_visitor_id';

function getOrCreateVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

// Call this once per page navigation (see App.js). Fire-and-forget —
// never blocks the UI or throws to the caller.
export const trackVisit = async (path) => {
  try {
    const visitorId = getOrCreateVisitorId();
    await addDoc(collection(db, 'site_visits'), {
      visitorId,
      path,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Visit tracking failed:', err);
  }
};