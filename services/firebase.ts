import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG, COLLECTION_NAME } from '../constants';
import { Report } from '../types';

const app = initializeApp(FIREBASE_CONFIG);
const db: Firestore = getFirestore(app);

export const fetchReports = async (): Promise<Report[]> => {
  try {
    console.log(`Attempting to fetch from Firestore collection: '${COLLECTION_NAME}'`);
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const reports: Report[] = [];
    
    if (querySnapshot.empty) {
      console.warn(`WARNING: Connection successful, but collection '${COLLECTION_NAME}' is empty.`);
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Log keys to help debug field mismatches
      console.log(`Document [${doc.id}] keys:`, Object.keys(data)); 
      
      // Robust coordinate parsing
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);

      // Handle Timestamp: It could be a Firestore Timestamp object or a string
      let timestampStr = "Unknown Time";
      
      // Check for Firestore Timestamp object
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        timestampStr = data.timestamp.toDate().toLocaleString();
      } 
      // Check for string timestamp
      else if (data.timestamp) {
        timestampStr = String(data.timestamp);
      } 
      // Check for specific 'timestampJanuary' field mentioned in requirements
      else if (data.timestampJanuary) {
         timestampStr = `January ${data.timestampJanuary}`; 
      }
      // Fallback: Check for any key starting with 'timestamp'
      else {
        const tsKey = Object.keys(data).find(k => k.startsWith('timestamp'));
        if (tsKey) {
          timestampStr = String(data[tsKey]);
        }
      }

      // Handle image format
      let imgBase64 = data.imageBase64 || "";
      // If the user put "..." as a placeholder, it's not a valid image.
      if (imgBase64 === "...") {
        imgBase64 = "";
      }

      reports.push({
        id: doc.id,
        address: data.address || "Unknown Location",
        dateTime: data.dateTime || new Date().toISOString(),
        description: data.description || "No description provided",
        imageBase64: imgBase64,
        latitude: isNaN(lat) ? 0 : lat,
        longitude: isNaN(lng) ? 0 : lng,
        timestampString: timestampStr
      });
    });

    console.log(`Successfully parsed ${reports.length} reports.`);
    return reports;
  } catch (error: any) {
    console.error("CRITICAL Error fetching reports:", error);
    throw new Error(error.message || "Unknown Firestore Error");
  }
};

export const deleteReport = async (id: string): Promise<void> => {
  if (!id) {
    console.error("Invalid ID provided for deletion");
    throw new Error("Invalid ID provided");
  }

  try {
    console.log(`Attempting to delete document with ID: ${id} from collection: ${COLLECTION_NAME}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log(`Report ${id} successfully deleted from Firestore.`);
  } catch (error: any) {
    console.error("Error deleting report from Firestore:", error);
    // Provide a more descriptive error if it's a permission issue
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied: You do not have rights to delete this report.");
    }
    throw new Error(error.message || "Failed to delete report");
  }
};
