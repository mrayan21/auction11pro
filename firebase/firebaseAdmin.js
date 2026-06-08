import dotenv from "dotenv";

dotenv.config();
import crypto from "crypto";
// import { db } from "../firebase/firebaseAdmin.js";
import admin from "firebase-admin";
console.log("FIREBASE KEY:", process.env.FIREBASE_PRIVATE_KEY);
console.log("PROJECT:", process.env.FIREBASE_PROJECT_ID);
console.log("EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log(
  "PRIVATE KEY EXISTS:",
  !!process.env.FIREBASE_PRIVATE_KEY
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    }),
    databaseURL:
      "https://auction11-database-5d719-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

export const db = admin.database();
export const auth = admin.auth();