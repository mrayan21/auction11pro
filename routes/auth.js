import crypto from "crypto";
import authMiddleware from "../middleware/authMiddleware.js";
import { createToken } from "../utils/jwt.js";
import { db, auth } from "../firebase/firebaseAdmin.js";
import express from "express";
import otpStore from "../utils/otpStore.js";
// import crypto from "crypto";
// import { db } from "../firebase/firebaseAdmin.js";
// import { createToken } from "../utils/jwt.js";

const router = express.Router();

router.post("/send-otp", async (req, res) => {
  try {

    const { phoneNumber } = req.body;

    const otp =
      Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    otpStore.set(phoneNumber, {
      otp,
      verified: false,
      expiresAt: Date.now() + 300000
    });

    // console.log(`OTP for ${phoneNumber}: ${otp}`);
    import twilio from "twilio";

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phoneNumber}`,
      body: `Your Auction11 OTP is ${otp}`
    });

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      success: false
    });
  }
});

router.post("/verify-otp", async (req, res) => {

  const { phoneNumber, otp } = req.body;

  const record = otpStore.get(phoneNumber);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: "OTP not found"
    });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({
      success: false,
      message: "OTP expired"
    });
  }

  if (record.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP"
    });
  }

  record.verified = true;

  res.json({
    success: true
  });
});

router.post("/signup", async (req, res) => {
  try {

    const {
      name,
      username,
      phoneNumber,
      location,
      ipLocation,
      gpsLocation,
      cricketRole,
      basePrice,
      anonId,
      deviceId
    } = req.body;

    // OTP verified?
    const otpData = otpStore.get(phoneNumber);

    if (!otpData || !otpData.verified) {
      return res.status(400).json({
        success: false,
        message: "Phone number not verified"
      });
    }

    // Phone already registered?
    const usersSnap =
      await db.ref("users").once("value");

    const users =
      usersSnap.val() || {};

    const existingUser =
      Object.values(users).find(
        (user) =>
          user.phoneNumber === phoneNumber
      );

    if (existingUser) {

      // Existing Firebase Auth user
      const firebaseToken =
        await auth.createCustomToken(
          existingUser.uid
        );

      const token = createToken({
        uid: existingUser.uid,
        phoneNumber
      });

      otpStore.delete(phoneNumber);

      return res.json({
        success: true,
        uid: existingUser.uid,
        token,
        firebaseToken
      });
    }

    // New Firebase Auth user
    const uid =
      crypto.randomUUID();

    await auth.createUser({
      uid,
      phoneNumber
    });

    const shortId =
      "A11-" +
      Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase();

    const userData = {
      uid,
      shortId,

      name,
      username,
      phoneNumber,
      deviceId,

      location,
      gpsLocation: gpsLocation || null,

      cricketRole,
      basePrice,
      deviceId,

      country:
        ipLocation?.country || "",

      countryCode:
        ipLocation?.countryCode || "",

      state:
        ipLocation?.state || "",

      district:
        ipLocation?.district || "",

      region:
        ipLocation?.region || "",

      isPhoneVerified: true,
      isVerified: false,

      trustScore: 100,
      rankedUnlocked: false,
      allowTeamInvites: true,

      photo: "/default-profile-image.png",

      bio: "I Love Cricket",

      wickets: 0,

      customCards: 5,

      termsAccepted: true,
      termsAcceptedDate:
        new Date().toISOString(),
      termsVersion: "2026",

      createdAt:
        new Date().toISOString()
    };

    const updates = {};

    updates[`users/${uid}`] =
      userData;

    updates[`shortIds/${shortId}`] =
      uid;

    updates[
      `usernames/${username.toLowerCase()}`
    ] = {
      uid,
      createdAt:
        new Date().toISOString()
    };

    updates[`playersIndex/${uid}`] = {
      name,
      username:
        username.toLowerCase(),
      playerRole:
        cricketRole || "",
      location:
        location || "",
      basePrice:
        Number(basePrice) || 0,
      photo:
        "/default-profile-image.png"
    };

    updates[`usersRank/${uid}`] = {
      username,
      name,
      photo:
        "/default-profile-image.png",

      rankData: {
        elo: 0,
        wins: 0,
        losses: 0,
        lastMatchAt: 0,
        matchesPlayed: 0
      }
    };

    updates[`userPublic/${uid}`] = {
      name,
      username,

      photo:
        "/default-profile-image.png",

      playerRole:
        cricketRole || "",

      location:
        location || "",

      followers: 0,

      trustScore: 100,

      country:
        ipLocation?.country || "",

      countryCode:
        ipLocation?.countryCode || "",

      state:
        ipLocation?.state || "",

      district:
        ipLocation?.district || "",

      region:
        ipLocation?.region || ""
    };

    const locationKey =
      location
        .toLowerCase()
        .trim();

    updates[
      `locationIndex/${locationKey}/${uid}`
    ] = true;

    await db.ref().update(updates);

    otpStore.delete(phoneNumber);

    const token = createToken({
      uid,
      phoneNumber
    });

    const firebaseToken =
      await auth.createCustomToken(uid);

    res.json({
      success: true,
      uid,
      token,
      firebaseToken
    });

  } catch (err) {

    console.error(
      "SIGNUP ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {

    res.json({
      success: true,
      user: req.user
    });

  }
);


export default router;
